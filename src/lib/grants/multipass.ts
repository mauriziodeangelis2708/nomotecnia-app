import {
  parseDefinition,
  parseFragment,
  type GrantDefinition,
  type GrantSource,
} from "./schema.ts";

export const CHUNK_CHARACTERS = 10000;
export interface SourceChunk {
  documentId: string;
  name: string;
  page: number;
  text: string;
}
/** Every UTF-16 character is retained; page numbers always refer to the original PDF. */
export function planSourceChunks(sources: GrantSource[]): SourceChunk[][] {
  const chunks: SourceChunk[][] = [];
  let current: SourceChunk[] = [],
    count = 0;
  for (const source of sources)
    for (const page of source.pages) {
      // Keep ordinary pages intact: cutting a page can detach an exclusion
      // from its exception or split a table before its values reach the model.
      if (page.text.length <= CHUNK_CHARACTERS && count + page.text.length > CHUNK_CHARACTERS) {
        chunks.push(current);
        current = [];
        count = 0;
      }
      let start = 0;
      while (start < page.text.length) {
        if (count === CHUNK_CHARACTERS) {
          chunks.push(current);
          current = [];
          count = 0;
        }
        let end = Math.min(page.text.length, start + CHUNK_CHARACTERS - count);
        const last = page.text.charCodeAt(end - 1);
        if (end < page.text.length && last >= 0xd800 && last <= 0xdbff) end--;
        if (end === start) {
          chunks.push(current);
          current = [];
          count = 0;
          continue;
        }
        const text = page.text.slice(start, end);
        current.push({ documentId: source.id, name: source.name, page: page.page, text });
        count += text.length;
        start = end;
      }
    }
  if (current.length) chunks.push(current);
  return chunks;
}
function remap(value: unknown, fields: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((v) => remap(v, fields));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === "field" && typeof child === "string"
        ? (fields.get(child) ?? child)
        : remap(child, fields),
    ]),
  );
}
function signature(item: { id: string; citations: unknown[] }): string {
  const { id: _id, citations: _citations, ...rest } = item;
  return JSON.stringify(rest);
}
function combineCitations<T>(a: T[], b: T[]): T[] {
  return [...new Map([...a, ...b].map((c) => [JSON.stringify(c), c])).values()];
}
/** Merge deterministically. No second model is allowed to silently summarize away rules. */
export function mergeFragments(parts: GrantDefinition[], expectedCount: number): GrantDefinition {
  if (!parts.length || parts.length !== expectedCount)
    throw new Error("Analisi incompleta: manca almeno un passaggio. Nessuna bozza utilizzabile.");
  const first = parts[0]!;
  const result: GrantDefinition = { ...first, questions: [], rules: [], unresolved: [] };
  const questionIndex = new Map<string, number>(),
    ruleIndex = new Map<string, number>();
  for (const [partIndex, raw] of parts.entries()) {
    const part = parseFragment(raw);
    if (
      part.id !== first.id ||
      part.version !== first.version ||
      part.title !== first.title ||
      JSON.stringify(part.sources) !== JSON.stringify(first.sources)
    )
      throw new Error("I passaggi non appartengono alle stesse fonti e alla stessa versione.");
    const fields = new Map<string, string>();
    for (const [i, question] of part.questions.entries()) {
      const mapped = remap(question, fields) as typeof question;
      const key = signature(mapped),
        duplicate = questionIndex.get(key);
      if (duplicate !== undefined) {
        const existing = result.questions[duplicate]!;
        const citations = combineCitations(existing.citations, question.citations);
        if (citations.length <= 20) {
          existing.citations = citations;
          fields.set(question.id, existing.id);
          continue;
        }
      }
      const newId = `q_${partIndex + 1}_${i + 1}`;
      fields.set(question.id, newId);
      questionIndex.set(key, result.questions.length);
      if (result.questions.some((q) => q.label === mapped.label && signature(q) !== key))
        result.unresolved.push(
          `Possibile conflitto tra domande con etichetta «${mapped.label}»: verificare ambito, condizioni e fonti.`,
        );
      result.questions.push({ ...mapped, id: newId });
    }
    for (const [i, rule] of part.rules.entries()) {
      const mapped = remap(rule, fields) as typeof rule;
      const key = signature(mapped),
        duplicate = ruleIndex.get(key);
      if (duplicate !== undefined) {
        const existing = result.rules[duplicate]!;
        const citations = combineCitations(existing.citations, rule.citations);
        if (citations.length <= 20) {
          existing.citations = citations;
          continue;
        }
      }
      if (
        result.rules.some(
          (r) => r.label === mapped.label && r.kind === mapped.kind && signature(r) !== key,
        )
      )
        result.unresolved.push(
          `Possibile conflitto nella regola «${mapped.label}»: confrontare i passaggi e impedire doppi conteggi.`,
        );
      ruleIndex.set(key, result.rules.length);
      result.rules.push({ ...mapped, id: `r_${partIndex + 1}_${i + 1}` });
    }
    result.unresolved.push(...part.unresolved);
  }
  if (parts.length > 1)
    result.unresolved.push(
      "Completare la revisione incrociata di avviso e allegati: rimandi, deroghe, cumulabilità e possibile doppio conteggio non sono certificati dall'analisi per estratti.",
    );
  result.unresolved = [...new Set(result.unresolved)];
  return parseDefinition(result);
}
