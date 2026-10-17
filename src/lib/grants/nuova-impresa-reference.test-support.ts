import observed from "./nuova-impresa-source.test-support.json";
import { normalizeQuote, parseDefinition, type Expression, type GrantDefinition } from "./schema";
import type { GrantScenario } from "./lifecycle";

// Independent partial numerical reference: inputs are ALREADY verified admissible amounts.
// Does not adjudicate expenditure reductions, business eligibility, timing or de minimis.
export function nuovaImpresaReference(): GrantDefinition {
  const page = normalizeQuote(observed.source.pages[6]!.text);
  const from = page.indexOf("L’agevolazione è concessa a fronte"),
    to = page.indexOf("Ogni impresa", from);
  if (from < 0 || to < 0) throw new Error("Source passage missing");
  const citations = [
    { documentId: observed.source.id, page: 7, quote: page.slice(from, to).trim() },
  ];
  const field = (field: string): Expression => ({ op: "field", field });
  const total: Expression = { op: "add", args: [field("capital"), field("current")] };
  return parseDefinition({
    schemaVersion: 1,
    id: "nuova_impresa_partial",
    version: 1,
    title: "Nuova Impresa — riferimento numerico parziale",
    description:
      "Spese già ritenute ammissibili e verificate, dopo eventuali riduzioni. Non assessment operativo.",
    sources: [observed.source],
    questions: [
      {
        id: "capital",
        section: "Spese verificate",
        label: "Spese in conto capitale già ammissibili",
        type: "number",
        min: 0,
        required: true,
        citations,
      },
      {
        id: "current",
        section: "Spese verificate",
        label: "Spese di parte corrente già ammissibili dopo eventuali riduzioni",
        type: "number",
        min: 0,
        required: true,
        citations,
      },
    ],
    rules: [
      {
        id: "minimum",
        label: "Investimento ammissibile minimo",
        kind: "eligibility",
        condition: {
          op: "compare",
          comparison: "gte",
          left: total,
          right: { op: "constant", value: 3000 },
        },
        citations,
      },
      {
        id: "capital_share",
        label: "Conto capitale almeno pari alla parte corrente ammessa",
        kind: "eligibility",
        condition: {
          op: "compare_fields",
          field: "capital",
          otherField: "current",
          comparison: "gte",
        },
        citations,
      },
      {
        id: "grant_amount",
        label: "Contributo parziale prima di ulteriori vincoli e de minimis",
        kind: "grant",
        formula: {
          op: "min",
          args: [
            { op: "constant", value: 10000 },
            field("capital"),
            { op: "multiply", args: [total, { op: "constant", value: 0.5 }] },
          ],
        },
        citations,
      },
    ],
    unresolved: [
      "Riferimento parziale: beneficiari, spese, riduzioni, termini, de minimis, domande collegate, allegati e altri requisiti non verificati. Non pubblicabile come assessment completo.",
    ],
  });
}
export const NUOVA_IMPRESA_CASES: GrantScenario[] = [
  {
    name: "Soglia esatta, solo capitale",
    answers: { capital: 3000, current: 0 },
    expected: "incomplete",
    grants: { grant_amount: 1500 },
    ruleStates: { minimum: "passed", capital_share: "passed" },
  },
  {
    name: "Un centesimo sotto il minimo",
    answers: { capital: 2999.99, current: 0 },
    expected: "not_eligible",
    ruleStates: { minimum: "failed" },
  },
  {
    name: "Composizione ammessa esattamente metà capitale",
    answers: { capital: 1500, current: 1500 },
    expected: "incomplete",
    grants: { grant_amount: 1500 },
    ruleStates: { minimum: "passed", capital_share: "passed" },
  },
  {
    name: "Percentuale su spese verificate",
    answers: { capital: 5000, current: 2000 },
    expected: "incomplete",
    grants: { grant_amount: 3500 },
  },
  {
    name: "Massimale esatto",
    answers: { capital: 20000, current: 0 },
    expected: "incomplete",
    grants: { grant_amount: 10000 },
  },
  {
    name: "Oltre il massimale",
    answers: { capital: 50000, current: 50000 },
    expected: "incomplete",
    grants: { grant_amount: 10000 },
  },
  {
    name: "Importo corrente non verificato",
    answers: { capital: 5000 },
    expected: "incomplete",
    grants: { grant_amount: null },
    ruleStates: { minimum: "unknown", capital_share: "unknown" },
  },
];
