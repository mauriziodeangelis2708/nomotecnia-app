import original from "./workplace-observed.test-support.json";
import { normalizeQuote, parseDefinition, type GrantDefinition } from "./schema";
import type { GrantScenario } from "./lifecycle";

// Manually authored numerical Article 5.B reference. Never use as an operational grant assessment.
export function workplaceReference(): GrantDefinition {
  const text = normalizeQuote(original.excerpt.text);
  const citations = [{ documentId: original.excerpt.documentId, page: 6, quote: text }];
  return parseDefinition({
    schemaVersion: 1,
    id: "workplace_numeric_reference",
    version: 1,
    title: "Riferimento parziale Digital Workplace",
    description:
      "Solo quantità e importo unitario Articolo 5.B; restano da verificare tutte le altre condizioni del bando.",
    sources: [original.source],
    questions: [
      {
        id: "requested",
        section: "Quantità",
        label: "Digital Workplace richieste",
        type: "number",
        integer: true,
        min: 0,
        required: true,
        citations,
      },
      {
        id: "employees",
        section: "Quantità",
        label: "Addetti ammessi verificati su attestazione INPS luglio 2026",
        type: "number",
        integer: true,
        min: 0,
        required: true,
        citations,
      },
    ],
    rules: [
      {
        id: "quantity_positive",
        label: "Almeno una postazione richiesta",
        kind: "eligibility",
        condition: { op: "gte", field: "requested", value: 1 },
        citations,
      },
      {
        id: "quantity_limit",
        label: "Non più di una postazione per addetto ammesso",
        kind: "eligibility",
        condition: {
          op: "compare_fields",
          field: "requested",
          otherField: "employees",
          comparison: "lte",
        },
        citations,
      },
      {
        id: "workplace_amount",
        label: "Contributo lordo componente Digital Workplace",
        kind: "grant",
        formula: {
          op: "multiply",
          args: [
            { op: "field", field: "requested" },
            { op: "constant", value: 2270.4 },
          ],
        },
        citations,
      },
    ],
    unresolved: [
      "Riferimento numerico parziale: non verifica nuova adozione, componenti tecniche, massimali complessivi, de minimis o gli altri requisiti. Nessuna pubblicazione operativa.",
    ],
  });
}
export const WORKPLACE_CASES: GrantScenario[] = [
  {
    name: "Una postazione e un addetto",
    answers: { requested: 1, employees: 1 },
    expected: "incomplete",
    grants: { workplace_amount: 2270.4 },
    ruleStates: { quantity_positive: "passed", quantity_limit: "passed" },
  },
  {
    name: "Sette postazioni su venti addetti",
    answers: { requested: 7, employees: 20 },
    expected: "incomplete",
    grants: { workplace_amount: 15892.8 },
    ruleStates: { quantity_limit: "passed" },
  },
  {
    name: "Venti postazioni su venti addetti",
    answers: { requested: 20, employees: 20 },
    expected: "incomplete",
    grants: { workplace_amount: 45408 },
    ruleStates: { quantity_limit: "passed" },
  },
  {
    name: "Una postazione oltre gli addetti",
    answers: { requested: 21, employees: 20 },
    expected: "not_eligible",
    ruleStates: { quantity_limit: "failed" },
  },
  {
    name: "Nessuna postazione",
    answers: { requested: 0, employees: 20 },
    expected: "not_eligible",
    ruleStates: { quantity_positive: "failed" },
  },
  {
    name: "Attestazione non verificata",
    answers: { requested: 7 },
    expected: "incomplete",
    ruleStates: { quantity_limit: "unknown" },
  },
  {
    name: "Quantità frazionaria",
    answers: { requested: 1.5, employees: 20 },
    expected: "incomplete",
    grants: { workplace_amount: null },
    ruleStates: { quantity_limit: "unknown" },
  },
  {
    name: "Addetti frazionari",
    answers: { requested: 1, employees: 1.5 },
    expected: "incomplete",
    ruleStates: { quantity_limit: "unknown" },
  },
  {
    name: "Quantità negativa",
    answers: { requested: -1, employees: 20 },
    expected: "incomplete",
    grants: { workplace_amount: null },
    ruleStates: { quantity_limit: "unknown" },
  },
];
