import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
const text = z.string().trim().min(1).max(4000);
const scalar = z.union([
  z.string().max(500),
  z.number().finite().min(-1e12).max(1e12),
  z.boolean(),
]);
export type Scalar = z.infer<typeof scalar>;
export type Predicate =
  | { op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte"; field: string; value: Scalar }
  | { op: "in"; field: string; values: Scalar[] }
  | { op: "all" | "any"; args: Predicate[] }
  | { op: "not"; arg: Predicate };
export type Expression =
  | { op: "constant"; value: number }
  | { op: "field"; field: string }
  | { op: "add" | "multiply" | "min" | "max"; args: Expression[] }
  | { op: "subtract" | "divide"; left: Expression; right: Expression }
  | { op: "if"; when: Predicate; then: Expression; otherwise: Expression };

const predicate: z.ZodType<Predicate> = z.lazy(() =>
  z.union([
    z
      .object({ op: z.enum(["eq", "ne", "gt", "gte", "lt", "lte"]), field: id, value: scalar })
      .strict(),
    z.object({ op: z.literal("in"), field: id, values: z.array(scalar).min(1).max(100) }).strict(),
    z.object({ op: z.enum(["all", "any"]), args: z.array(predicate).min(1).max(30) }).strict(),
    z.object({ op: z.literal("not"), arg: predicate }).strict(),
  ]),
);
const expression: z.ZodType<Expression> = z.lazy(() =>
  z.union([
    z
      .object({ op: z.literal("constant"), value: z.number().finite().min(-1e12).max(1e12) })
      .strict(),
    z.object({ op: z.literal("field"), field: id }).strict(),
    z
      .object({
        op: z.enum(["add", "multiply", "min", "max"]),
        args: z.array(expression).min(1).max(30),
      })
      .strict(),
    z.object({ op: z.enum(["subtract", "divide"]), left: expression, right: expression }).strict(),
    z
      .object({ op: z.literal("if"), when: predicate, then: expression, otherwise: expression })
      .strict(),
  ]),
);
const citation = z
  .object({ documentId: id, page: z.number().int().min(1).max(500), quote: text })
  .strict();
export const requirementSchema = z
  .object({
    id,
    label: text,
    citations: z.array(citation).min(1).max(20),
    questionIds: z.array(id).max(150),
    ruleIds: z.array(id).max(250),
    gap: text.optional(),
  })
  .strict();
export const sourceSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(250),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    pages: z
      .array(
        z.object({ page: z.number().int().min(1).max(500), text: z.string().max(240000) }).strict(),
      )
      .min(1)
      .max(500),
  })
  .strict();
export const definitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    version: z.number().int().min(1).max(100000),
    title: z.string().trim().min(2).max(200),
    description: text,
    sources: z.array(sourceSchema).min(1).max(12),
    questions: z
      .array(
        z
          .object({
            id,
            section: z.string().trim().min(1).max(120),
            label: text,
            type: z.enum(["boolean", "number", "text", "select"]),
            required: z.boolean(),
            options: z
              .array(z.object({ value: z.string().min(1).max(100), label: text }).strict())
              .max(100)
              .optional(),
            unit: z.string().max(40).optional(),
            help: z.string().max(4000).optional(),
            min: z.number().finite().optional(),
            max: z.number().finite().optional(),
            showIf: predicate.optional(),
            citations: z.array(citation).min(1).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(150),
    rules: z
      .array(
        z
          .object({
            id,
            label: text,
            kind: z.enum(["eligibility", "exclusion", "score", "grant", "document"]),
            when: predicate.optional(),
            condition: predicate.optional(),
            formula: expression.optional(),
            maximum: z.number().finite().min(0).max(1e12).optional(),
            citations: z.array(citation).min(1).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(250),
    unresolved: z.array(text).max(100),
    requirements: z.array(requirementSchema).max(500).optional(),
  })
  .strict();
export type GrantDefinition = z.infer<typeof definitionSchema>;
export type GrantQuestion = GrantDefinition["questions"][number];
export type GrantSource = z.infer<typeof sourceSchema>;
export type GrantAnswers = Record<string, Scalar | null>;

export function referencedFields(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([key, value]) =>
    key === "field" && typeof value === "string"
      ? [value]
      : Array.isArray(value)
        ? value.flatMap(referencedFields)
        : referencedFields(value),
  );
}
function checkDepth(value: unknown, depth = 0): void {
  if (depth > 24) throw new Error("Configurazione troppo annidata (massimo 24 livelli).");
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(key))
        throw new Error("Chiave non consentita.");
      checkDepth(child, depth + 1);
    }
  }
}
export function normalizeQuote(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** Model output is data only. No scripts, expressions or arbitrary HTML can execute. */
export function parseDefinition(input: unknown): GrantDefinition {
  return parseGrant(input, false);
}
export function parseFragment(input: unknown): GrantDefinition {
  return parseGrant(input, true);
}
function parseGrant(input: unknown, fragment: boolean): GrantDefinition {
  if (JSON.stringify(input).length > 1500000) throw new Error("Configurazione superiore a 1,5 MB.");
  checkDepth(input);
  const schema = fragment
    ? definitionSchema.extend({
        questions: definitionSchema.shape.questions.min(0),
        rules: definitionSchema.shape.rules.min(0),
      })
    : definitionSchema;
  const result = schema.parse(input);
  const sources = new Map<string, GrantSource>();
  for (const source of result.sources) {
    if (sources.has(source.id)) throw new Error("Documento duplicato.");
    if (source.pages.some((p, i) => p.page !== i + 1))
      throw new Error("Pagine mancanti o duplicate nella fonte.");
    sources.set(source.id, source);
  }
  const ids = new Set<string>();
  const types = new Map(result.questions.map((q) => [q.id, q.type]));
  function validateNode(node: unknown, known: Set<string>) {
    for (const field of referencedFields(node))
      if (!known.has(field)) throw new Error(`Campo sconosciuto o dipendenza futura: ${field}`);
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (typeof n["field"] === "string") {
      const type = types.get(n["field"]);
      if (n["op"] === "field" && type !== "number")
        throw new Error("Le formule possono usare soltanto campi numerici.");
      if (
        ["gt", "gte", "lt", "lte"].includes(String(n["op"])) &&
        (type !== "number" || typeof n["value"] !== "number")
      )
        throw new Error("Confronto numerico non valido.");
      const values =
        n["op"] === "in" ? (n["values"] as Scalar[]) : "value" in n ? [n["value"]] : [];
      for (const value of values)
        if (
          (type === "boolean" && typeof value !== "boolean") ||
          (type === "number" && typeof value !== "number") ||
          (["select", "text"].includes(type ?? "") && typeof value !== "string")
        )
          throw new Error("Tipo di confronto incompatibile con la domanda.");
    }
    for (const child of Object.values(n))
      if (Array.isArray(child)) child.forEach((c) => validateNode(c, known));
      else validateNode(child, known);
  }
  for (const q of result.questions) {
    if (ids.has(q.id)) throw new Error("Domanda duplicata.");
    if (
      q.type === "select" &&
      (!q.options?.length || new Set(q.options.map((o) => o.value)).size !== q.options.length)
    )
      throw new Error("Opzioni mancanti o duplicate.");
    if (q.type !== "select" && q.options?.length)
      throw new Error("Opzioni su domanda non selezionabile.");
    if (q.min !== undefined && q.max !== undefined && q.min > q.max)
      throw new Error("Intervallo numerico invertito.");
    validateNode(q.showIf, ids);
    ids.add(q.id);
  }
  const ruleIds = new Set<string>();
  for (const rule of result.rules) {
    if (ruleIds.has(rule.id)) throw new Error("Regola duplicata.");
    ruleIds.add(rule.id);
    validateNode(rule, ids);
    const calculated = rule.kind === "score" || rule.kind === "grant";
    if (calculated ? !rule.formula || !!rule.condition : !rule.condition || !!rule.formula)
      throw new Error(`Regola incompleta o ambigua: ${rule.id}`);
    if (
      rule.kind === "eligibility" &&
      rule.when &&
      JSON.stringify(rule.when) === JSON.stringify(rule.condition)
    )
      throw new Error(
        `Requisito auto-condizionato: il mancato rispetto verrebbe ignorato (${rule.id}).`,
      );
  }
  if (!fragment && !result.rules.some((r) => r.kind === "eligibility" || r.kind === "exclusion"))
    throw new Error("Mancano regole di ammissibilità o esclusione.");
  const requirementIds = new Set<string>();
  for (const requirement of result.requirements ?? []) {
    if (requirementIds.has(requirement.id)) throw new Error("Requisito duplicato.");
    requirementIds.add(requirement.id);
    if (
      requirement.questionIds.some((id) => !ids.has(id)) ||
      requirement.ruleIds.some((id) => !ruleIds.has(id))
    )
      throw new Error("Collegamento del requisito inesistente.");
    if ((!requirement.questionIds.length || !requirement.ruleIds.length) && !requirement.gap)
      throw new Error("Requisito privo di copertura o motivo della lacuna.");
  }
  for (const item of [...result.questions, ...result.rules, ...(result.requirements ?? [])])
    for (const c of item.citations) {
      const page = sources.get(c.documentId)?.pages.find((p) => p.page === c.page);
      if (
        !page ||
        normalizeQuote(c.quote).length < 12 ||
        !normalizeQuote(page.text).includes(normalizeQuote(c.quote))
      )
        throw new Error(`Citazione non riscontrata nella fonte: ${item.id}`);
    }
  return result;
}
