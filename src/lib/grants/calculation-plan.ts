import { z } from "zod";
import type { Expression } from "./schema";

const id = z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
const amount = z.number().finite().min(0).max(1e12);
const fields = z
  .array(id)
  .min(1)
  .max(30)
  .refine((v) => new Set(v).size === v.length);
export const calculationPlanSchema = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal("percentage"),
      ratePercent: z.number().finite().min(0).max(100),
      baseFields: fields,
      capAmount: amount.optional(),
      capFields: fields.optional(),
    })
    .strict(),
  z
    .object({
      method: z.literal("per_unit"),
      amountPerUnit: amount,
      quantityField: id,
      maxUnits: amount.optional(),
      capQuantityFields: fields.optional(),
      capAmount: amount.optional(),
    })
    .strict(),
  z.object({ method: z.literal("fixed"), amount }).strict(),
]);
export type CalculationPlan = z.infer<typeof calculationPlanSchema>;
const constant = (value: number): Expression => ({ op: "constant", value });
const field = (field: string): Expression => ({ op: "field", field });
const combine = (op: "min" | "add", args: Expression[]): Expression =>
  args.length === 1 ? args[0]! : { op, args };

/** Lower a bounded calculation plan; no source interpretation or numerical repair occurs here. */
export function compileCalculationPlan(raw: unknown): Expression {
  const p = calculationPlanSchema.parse(raw);
  if (p.method === "fixed") return constant(p.amount);
  if (p.method === "percentage") {
    const result: Expression = {
      op: "multiply",
      args: [constant(p.ratePercent / 100), combine("add", p.baseFields.map(field))],
    };
    return combine("min", [
      result,
      ...(p.capAmount === undefined ? [] : [constant(p.capAmount)]),
      ...(p.capFields ?? []).map(field),
    ]);
  }
  const quantity = combine("min", [
    field(p.quantityField),
    ...(p.maxUnits === undefined ? [] : [constant(p.maxUnits)]),
    ...(p.capQuantityFields ?? []).map(field),
  ]);
  const result: Expression = { op: "multiply", args: [constant(p.amountPerUnit), quantity] };
  return p.capAmount === undefined ? result : combine("min", [result, constant(p.capAmount)]);
}

export function compileGeneratedCalculations(rules: unknown[]): unknown[] {
  return rules.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || !("calculation" in raw))
      return raw;
    const rule = raw as Record<string, unknown>;
    if (rule["kind"] !== "grant" || Object.hasOwn(rule, "formula"))
      throw new Error("Piano di calcolo incompatibile con la regola.");
    const { calculation, ...rest } = rule;
    return { ...rest, formula: compileCalculationPlan(calculation) };
  });
}

const number = { type: "number", minimum: 0, maximum: 1e12 };
const fieldList = {
  type: "array",
  minItems: 1,
  maxItems: 30,
  items: { type: "string", pattern: "^[a-z][a-z0-9_]{0,63}$" },
};
export const CALCULATION_PLAN_FORMAT = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["method", "ratePercent", "baseFields"],
      properties: {
        method: { type: "string", enum: ["percentage"] },
        ratePercent: { type: "number", minimum: 0, maximum: 100 },
        baseFields: fieldList,
        capAmount: number,
        capFields: fieldList,
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["method", "amountPerUnit", "quantityField"],
      properties: {
        method: { type: "string", enum: ["per_unit"] },
        amountPerUnit: number,
        quantityField: { type: "string", pattern: "^[a-z][a-z0-9_]{0,63}$" },
        maxUnits: number,
        capQuantityFields: fieldList,
        capAmount: number,
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["method", "amount"],
      properties: { method: { type: "string", enum: ["fixed"] }, amount: number },
    },
  ],
};

export const CALCULATION_PLAN_SYSTEM = `Per le regole grant NON scrivere formula: usa calculation, che il server traduce in operazioni aritmetiche.
Percentage: {method:'percentage',ratePercent:number,baseFields:questionId[],capAmount?:number,capFields?:questionId[]}. ratePercent è il numero percentuale (35 per 35%). baseFields contiene TUTTE le componenti della spesa cui si applica l'aliquota. capAmount è il massimale monetario; capFields sono ulteriori tetti sull'IMPORTO DEL CONTRIBUTO, mai la base dell'aliquota. Il server calcola min(ratePercent/100 * sum(baseFields), capAmount se presente, ciascun capField).
Per unità: {method:'per_unit',amountPerUnit:number,quantityField:questionId,maxUnits?:number,capQuantityFields?:questionId[],capAmount?:number}. Prima limita il numero di unità con maxUnits e capQuantityFields (es. addetti), poi moltiplica per amountPerUnit, poi applica capAmount.
Importo fisso: {method:'fixed',amount:number}. Non creare domande per aliquote, massimali o importi unitari fissati dalla norma. Per calcoli non rappresentabili da questi tre metodi lascia una lacuna specifica in unresolved, senza approssimare né scegliere un metodo errato. Le regole score continuano a usare formula. Gli importi devono derivare dalla fonte, NON dall'inventario delle sole etichette.`;
