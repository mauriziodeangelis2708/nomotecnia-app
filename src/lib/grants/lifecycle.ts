import { evaluateGrant } from "./engine";
import { parseDefinition, type GrantAnswers, type GrantDefinition } from "./schema";
import { z } from "zod";

export const scenarioSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    answers: z.record(z.union([z.string().max(4000), z.number().finite(), z.boolean(), z.null()])),
    expected: z.enum(["pre_eligible", "not_eligible", "incomplete"]),
    score: z.number().finite().nonnegative().nullable().optional(),
    grants: z.record(z.number().finite().nonnegative().nullable()).optional(),
    ruleStates: z
      .record(z.enum(["passed", "failed", "unknown", "not_applicable", "calculated"]))
      .optional(),
  })
  .strict();
export type GrantScenario = z.infer<typeof scenarioSchema>;
export interface GrantReview {
  sources: string[];
  items: string[];
  scenarios: GrantScenario[];
}
export const sourceReviewKey = (id: string, page: number) => `${id}:${page}`;
export function runScenarios(d: GrantDefinition, scenarios: GrantScenario[]) {
  return scenarios.map((raw) => {
    const test = scenarioSchema.parse(raw),
      actual = evaluateGrant(d, test.answers as GrantAnswers);
    const differences: string[] = [];
    if (actual.status !== test.expected)
      differences.push(`Esito: atteso ${test.expected}, ottenuto ${actual.status}.`);
    if (test.score !== undefined && actual.score !== test.score)
      differences.push(`Punteggio: atteso ${test.score}, ottenuto ${actual.score}.`);
    for (const [id, amount] of Object.entries(test.grants ?? {})) {
      const result = actual.grants.find((r) => r.id === id);
      if (!result || result.value !== amount)
        differences.push(
          `Contributo ${id}: atteso ${amount}, ottenuto ${result ? result.value : "regola assente"}.`,
        );
    }
    for (const [id, state] of Object.entries(test.ruleStates ?? {})) {
      const result = actual.rules.find((r) => r.id === id);
      if (!result || result.state !== state)
        differences.push(
          `Regola ${id}: atteso ${state}, ottenuto ${result?.state ?? "regola assente"}.`,
        );
    }
    return {
      name: test.name,
      passed: differences.length === 0,
      differences,
      actual,
    };
  });
}
export function publicationProblems(input: unknown, review: GrantReview): string[] {
  const d = parseDefinition(input),
    problems = [...d.unresolved];
  if (d.requirements?.some((r) => r.gap || !r.questionIds.length || !r.ruleIds.length))
    problems.push("Completare la copertura di tutti i requisiti dell'inventario.");
  if (d.requirements?.some((r) => !review.items.includes(`requirement:${r.id}`)))
    problems.push("Revisionare ogni requisito dell'inventario e i relativi collegamenti.");
  if (
    d.sources.some((s) =>
      s.pages.some((p) => !review.sources.includes(sourceReviewKey(s.id, p.page))),
    )
  )
    problems.push("Revisionare tutte le pagine delle fonti, incluse quelle senza regole estratte.");
  if (
    d.questions.some((q) => !review.items.includes(`question:${q.id}`)) ||
    d.rules.some((r) => !review.items.includes(`rule:${r.id}`))
  )
    problems.push("Revisionare ogni domanda e ogni regola.");
  const expectations = review.scenarios.map((s) => s.expected);
  if (
    !["pre_eligible", "not_eligible", "incomplete"].every((s) =>
      expectations.includes(s as GrantScenario["expected"]),
    )
  )
    problems.push(
      "Servono almeno un caso ammissibile, uno escluso e uno incompleto, con esiti attesi indipendenti.",
    );
  if (review.scenarios.length > 50) problems.push("Massimo 50 scenari di collaudo.");
  if (runScenarios(d, review.scenarios).some((s) => !s.passed))
    problems.push("Almeno uno scenario non corrisponde al risultato atteso.");
  for (const r of d.rules.filter((r) => ["score", "grant"].includes(r.kind))) {
    if (
      !review.scenarios.some((s) =>
        r.kind === "score"
          ? s.score !== undefined && s.score !== null
          : s.grants?.[r.id] !== undefined && s.grants[r.id] !== null,
      )
    )
      problems.push(`Manca un risultato numerico atteso per ${r.label}.`);
  }
  return [...new Set(problems)];
}
export async function definitionHash(d: GrantDefinition): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(parseDefinition(d)));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
