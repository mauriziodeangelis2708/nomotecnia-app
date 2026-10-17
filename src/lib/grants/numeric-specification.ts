import { z } from "zod";
import { calculationPlanSchema, compileCalculationPlan } from "./calculation-plan";
import { citationResolver } from "./source-citations";
import { parseFragment, type Expression, type GrantDefinition } from "./schema";
import type { SourceSpan } from "./source-spans";
import type { SourceChunk } from "./multipass";

const id = z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
const list = z
  .array(id)
  .min(1)
  .max(30)
  .refine((v) => new Set(v).size === v.length);
const amount = z.number().finite().min(0).max(1e12);
const percent = z.number().finite().min(0).max(100);
const citationList = z
  .array(id)
  .min(1)
  .max(20)
  .refine((v) => new Set(v).size === v.length);
const cited = { spanId: id };
export const numericSpecificationSchema = z
  .object({
    inputs: z
      .array(
        z
          .object({
            id,
            label: z.string().trim().min(1).max(500),
            unit: z.enum(["EUR", "count"]),
            ...cited,
          })
          .strict(),
      )
      .max(100),
    declarations: z
      .array(
        z
          .object({
            id: id.max(55),
            label: z.string().trim().min(1).max(2000),
            kind: z.enum(["eligibility", "exclusion", "document"]),
            expected: z.boolean(),
            spanIds: citationList,
          })
          .strict(),
      )
      .max(50)
      .default([]),
    minimums: z.array(z.object({ sumOf: list, value: amount, ...cited }).strict()).max(100),
    shares: z
      .array(z.object({ part: id, total: list, atLeastPercent: percent, ...cited }).strict())
      .max(100),
    fieldLimits: z.array(z.object({ field: id, atMostField: id, ...cited }).strict()).max(100),
    awardCaps: z.array(z.object({ awardId: id, amountField: id, ...cited }).strict()).max(100),
    awards: z
      .array(z.object({ id, calculation: calculationPlanSchema, spanIds: citationList }).strict())
      .max(50),
    unresolved: z.array(z.string().trim().min(1).max(2000)).max(80),
  })
  .strict();
const field = (field: string): Expression => ({ op: "field", field });
const constant = (value: number): Expression => ({ op: "constant", value });
const sum = (fields: string[]): Expression =>
  fields.length === 1 ? field(fields[0]!) : { op: "add", args: fields.map(field) };
export const NUMERIC_SPECIFICATION_SCOPE =
  "Specifica di requisiti parziale: ammissibilità delle spese, riduzioni, beneficiari, documenti, date, de minimis e altri requisiti del bando richiedono verifica separata. Non attivabile come assessment completo.";

/** Compile declared relations, not inferred meanings. Never invent a variable or repair an unknown reference. */
export function compileNumericSpecification(
  raw: unknown,
  context: {
    id: string;
    title: string;
    version: number;
    sources: GrantDefinition["sources"];
    spans: SourceSpan[];
    chunk: SourceChunk[];
  },
): GrantDefinition {
  if (JSON.stringify(raw)?.length > 100000) throw new Error("Specifica numerica troppo estesa.");
  const spec = numericSpecificationSchema.parse(raw),
    resolve = citationResolver(context.spans, context.chunk);
  const inputs = new Map(spec.inputs.map((x) => [x.id, x])),
    awards = new Map(spec.awards.map((x) => [x.id, x]));
  if (
    inputs.size !== spec.inputs.length ||
    awards.size !== spec.awards.length ||
    spec.awards.some((a) => inputs.has(a.id)) ||
    new Set(spec.declarations.map((d) => d.id)).size !== spec.declarations.length ||
    spec.declarations.some((d) => inputs.has(d.id) || awards.has(d.id))
  )
    throw new Error("Identificatori duplicati nella specifica numerica.");
  const requireInput = (name: string) => {
    const i = inputs.get(name);
    if (!i) throw new Error(`Variabile della specifica sconosciuta: ${name}`);
    return i;
  };
  const requireSameUnit = (names: string[]) => {
    if (new Set(names.map((n) => requireInput(n).unit)).size !== 1)
      throw new Error("Unità incompatibili nella relazione numerica.");
  };
  const rules: GrantDefinition["rules"] = [];
  const citations = (spanId: string) => resolve([{ spanId }]);
  spec.declarations.forEach((d) =>
    rules.push({
      id: `${d.id}_decision`,
      label: d.label,
      kind: d.kind,
      condition: { op: "eq", field: d.id, value: d.expected },
      citations: resolve(d.spanIds.map((spanId) => ({ spanId }))),
    }),
  );
  spec.minimums.forEach((m, i) => {
    requireSameUnit(m.sumOf);
    rules.push({
      id: `numeric_minimum_${i + 1}`,
      label: "Minimo richiesto sulla somma delle componenti",
      kind: "eligibility",
      condition: { op: "compare", comparison: "gte", left: sum(m.sumOf), right: constant(m.value) },
      citations: citations(m.spanId),
    });
  });
  spec.shares.forEach((s, i) => {
    requireSameUnit([s.part, ...s.total]);
    if (!s.total.includes(s.part))
      throw new Error("La quota deve riferirsi a un totale che comprende la componente.");
    rules.push({
      id: `numeric_share_${i + 1}`,
      label: "Quota minima della componente sul totale",
      kind: "eligibility",
      condition: {
        op: "compare",
        comparison: "gte",
        left: field(s.part),
        right: { op: "multiply", args: [constant(s.atLeastPercent / 100), sum(s.total)] },
      },
      citations: citations(s.spanId),
    });
  });
  const awardCaps = new Map<string, { field: string; spanId: string }[]>();
  spec.fieldLimits.forEach((l, i) => {
    requireSameUnit([l.field, l.atMostField]);
    rules.push({
      id: `numeric_limit_${i + 1}`,
      label: "Limite rispetto a un'altra quantità",
      kind: "eligibility",
      condition: {
        op: "compare_fields",
        comparison: "lte",
        field: l.field,
        otherField: l.atMostField,
      },
      citations: citations(l.spanId),
    });
  });
  spec.awardCaps.forEach((c) => {
    if (!awards.has(c.awardId)) throw new Error("Contributo del limite sconosciuto.");
    if (requireInput(c.amountField).unit !== "EUR")
      throw new Error("Il tetto di un contributo richiede un importo EUR.");
    awardCaps.set(c.awardId, [
      ...(awardCaps.get(c.awardId) ?? []),
      { field: c.amountField, spanId: c.spanId },
    ]);
  });
  spec.awards.forEach((a) => {
    const p = a.calculation;
    if (p.method === "percentage") {
      if ([...p.baseFields, ...(p.capFields ?? [])].some((n) => requireInput(n).unit !== "EUR"))
        throw new Error("Il contributo percentuale richiede importi EUR.");
    } else if (p.method === "per_unit") {
      if (
        [p.quantityField, ...(p.capQuantityFields ?? [])].some(
          (n) => requireInput(n).unit !== "count",
        )
      )
        throw new Error("Il contributo unitario richiede quantità.");
    }
    const caps = awardCaps.get(a.id) ?? [];
    const boundedMin = (args: Expression[]): Expression =>
      args.length === 1
        ? args[0]!
        : {
            op: "min",
            args: args.length <= 30 ? args : [...args.slice(0, 29), boundedMin(args.slice(29))],
          };
    const formula = boundedMin([
      compileCalculationPlan(p),
      ...[...new Set(caps.map((c) => c.field))].map(field),
    ]);
    rules.push({
      id: a.id,
      label: "Contributo derivato dalla specifica numerica",
      kind: "grant",
      formula,
      citations: resolve(
        [...new Set([...a.spanIds, ...caps.map((c) => c.spanId)])].map((spanId) => ({ spanId })),
      ),
    });
  });
  return parseFragment({
    schemaVersion: 1,
    id: context.id,
    title: context.title,
    version: context.version,
    description:
      "Specifica di requisiti compilata: importi già verificati ammissibili dopo eventuali riduzioni.",
    sources: context.sources,
    questions: [
      ...spec.inputs.map((i) => ({
        id: i.id,
        section: "Dati quantitativi verificati",
        label: i.label,
        type: "number",
        required: true,
        min: 0,
        ...(i.unit === "count" ? { integer: true } : {}),
        unit: i.unit,
        help: "Valore verificato: per gli importi, usare spese già ammissibili al netto IVA e dopo eventuali riduzioni. Le verifiche delle spese restano separate.",
        citations: citations(i.spanId),
      })),
      ...spec.declarations.map((d) => ({
        id: d.id,
        section: "Requisiti da confermare",
        label: d.label,
        type: "boolean",
        required: true,
        citations: resolve(d.spanIds.map((spanId) => ({ spanId }))),
      })),
    ],
    rules,
    unresolved: [...new Set([NUMERIC_SPECIFICATION_SCOPE, ...spec.unresolved])],
  });
}
