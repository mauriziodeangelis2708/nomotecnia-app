import type { GrantDefinition } from "./schema";
import type { GrantReview, GrantScenario } from "./lifecycle";
/** All figures and conditions here are invented for tests. */
export function syntheticGrant(): GrantDefinition {
  const quote =
    "Sono ammesse imprese attive con almeno 14.000 euro di investimento. Contributo 50% fino a 10.000 euro. Certificazione: 5 punti. Escluse procedure concorsuali.";
  const citations = [{ documentId: "avviso", page: 1, quote }];
  return {
    schemaVersion: 1,
    id: "bando_sintetico",
    version: 1,
    title: "Bando sintetico di collaudo",
    description: "Dati inventati esclusivamente per i test.",
    sources: [
      {
        id: "avviso",
        name: "avviso-sintetico.pdf",
        sha256: "a".repeat(64),
        pages: [{ page: 1, text: quote }],
      },
    ],
    questions: [
      {
        id: "attiva",
        section: "Requisiti",
        label: "Impresa attiva?",
        type: "boolean",
        required: true,
        citations,
      },
      {
        id: "procedura",
        section: "Requisiti",
        label: "Procedura concorsuale?",
        type: "boolean",
        required: true,
        citations,
      },
      {
        id: "investimento",
        section: "Progetto",
        label: "Investimento",
        type: "number",
        min: 0,
        required: true,
        citations,
      },
      {
        id: "certificata",
        section: "Punteggio",
        label: "Certificata?",
        type: "boolean",
        required: true,
        citations,
      },
    ],
    rules: [
      {
        id: "impresa_attiva",
        label: "Impresa attiva",
        kind: "eligibility",
        condition: { op: "eq", field: "attiva", value: true },
        citations,
      },
      {
        id: "esclusione_procedura",
        label: "Procedura concorsuale",
        kind: "exclusion",
        condition: { op: "eq", field: "procedura", value: true },
        citations,
      },
      {
        id: "soglia",
        label: "Investimento minimo",
        kind: "eligibility",
        condition: { op: "gte", field: "investimento", value: 14000 },
        citations,
      },
      {
        id: "contributo",
        label: "Contributo",
        kind: "grant",
        formula: {
          op: "min",
          args: [
            { op: "constant", value: 10000 },
            {
              op: "multiply",
              args: [
                { op: "field", field: "investimento" },
                { op: "constant", value: 0.5 },
              ],
            },
          ],
        },
        maximum: 10000,
        citations,
      },
      {
        id: "punti",
        label: "Certificazione",
        kind: "score",
        formula: {
          op: "if",
          when: { op: "eq", field: "certificata", value: true },
          then: { op: "constant", value: 5 },
          otherwise: { op: "constant", value: 0 },
        },
        maximum: 5,
        citations,
      },
    ],
    unresolved: [],
  };
}
export const SYNTHETIC_ANSWERS = {
  attiva: true,
  procedura: false,
  investimento: 14000,
  certificata: false,
};
export const SYNTHETIC_SCENARIOS: GrantScenario[] = [
  {
    name: "Soglia esatta",
    answers: SYNTHETIC_ANSWERS,
    expected: "pre_eligible",
    score: 0,
    grants: { contributo: 7000 },
  },
  {
    name: "Sotto soglia",
    answers: { ...SYNTHETIC_ANSWERS, investimento: 13999.99 },
    expected: "not_eligible",
    score: 0,
    grants: { contributo: 7000 },
  },
  {
    name: "Informazioni mancanti",
    answers: {},
    expected: "incomplete",
    score: null,
    grants: { contributo: null },
  },
];
export function syntheticReview(): GrantReview {
  return {
    sources: ["avviso:1"],
    items: [
      ...syntheticGrant().questions.map((q) => `question:${q.id}`),
      ...syntheticGrant().rules.map((r) => `rule:${r.id}`),
    ],
    scenarios: structuredClone(SYNTHETIC_SCENARIOS),
  };
}
