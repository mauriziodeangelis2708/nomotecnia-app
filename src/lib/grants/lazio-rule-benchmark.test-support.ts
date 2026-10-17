import sourceStart from "./lazio-observed.test-support.json";
import sourceEnd from "./inventory-observed.test-support.json";
import { normalizeQuote, type GrantDefinition, type Predicate } from "./schema";
import type { GrantScenario } from "./lifecycle";

// Independently authored Art. 4 checks only. No inference or model output is an oracle.
// These rule-level results do NOT establish eligibility for the complete grant.
const pages = [...sourceStart.excerpts.filter((p) => p.page <= 3), ...sourceEnd.excerpts];
const page4 = normalizeQuote(pages.find((p) => p.page === 4)!.text);
const page5 = normalizeQuote(pages.find((p) => p.page === 5)!.text);
function citation(page: number, from: string, to: string) {
  const text = page === 4 ? page4 : page5,
    start = text.indexOf(from),
    end = text.indexOf(to, start + from.length);
  if (start < 0 || end < 0) throw new Error("Citazione benchmark non trovata.");
  return [{ documentId: "documento_2", page, quote: text.slice(start, end).trim() }];
}
const sizeCitation = citation(4, "a. alla Data della Domanda", "b. sono iscritte");
const registryCitation = citation(4, "b. sono iscritte", "c. possiedono");
const seatCitation = citation(4, "Tale requisito può essere acquisito", "24/09/2026");
const previousCitation = citation(5, "Non sono ammissibili le PMI", "I Beneficiari devono inoltre");
const eq = (field: string, value = true): Predicate => ({ op: "eq", field, value });
export function lazioRuleReference(): GrantDefinition {
  const fields = [
    ["italian_registry", "Iscrizione italiana alla domanda", registryCitation],
    ["eea_registry", "Iscrizione in altro Stato SEE alla domanda", registryCitation],
    [
      "italian_by_payment",
      "Iscrizione italiana posseduta entro la richiesta di erogazione",
      registryCitation,
    ],
    ["existing_lazio", "Sede Lazio e attività già possedute alla domanda", seatCitation],
    [
      "lazio_by_payment",
      "Sede Lazio e attività acquisite entro la richiesta di erogazione",
      seatCitation,
    ],
    ["described", "Apertura e attività descritte già in domanda", seatCitation],
    ["justified", "Apertura e attività giustificate già in domanda", seatCitation],
    [
      "documented",
      "Apertura e attività documentate già in domanda in modo verificabile",
      seatCitation,
    ],
    ["previous_voucher", "Contributo ottenuto su precedenti Avvisi Voucher", previousCitation],
    [
      "payment_requested",
      "Richiesta di erogazione precedente già presentata alla domanda",
      previousCitation,
    ],
    ["same_type", "Interventi nella medesima tipologia già agevolata", previousCitation],
  ] as const;
  return {
    schemaVersion: 1,
    id: "lazio_art4_benchmark",
    version: 1,
    title: "Banco prova parziale Articolo 4 Lazio",
    description:
      "Solo confronto indipendente di quattro regole; non assessment operativo o istruttoria completa.",
    sources: [
      {
        id: "documento_2",
        name: "Avviso originale: estratto pagine 1–5 per benchmark",
        sha256: "5441b7a46164e51b91b824027836b47ec2a935a8b6a0d855f04acaa54885bd57",
        pages: pages.map(({ page, text }) => ({ page, text })),
      },
    ],
    questions: [
      {
        id: "size",
        label: "Dimensione PMI mantenuta nel periodo richiesto",
        section: "Benchmark",
        type: "select",
        required: true,
        options: ["Micro", "Piccola", "Media", "Grande"].map((value) => ({ value, label: value })),
        citations: sizeCitation,
      },
      ...fields.map(([id, label, citations]) => ({
        id,
        label,
        citations: [...citations],
        section: "Benchmark",
        type: "boolean" as const,
        required: true,
      })),
    ],
    rules: [
      {
        id: "size",
        label: "Tutte le dimensioni PMI",
        kind: "eligibility",
        condition: { op: "in", field: "size", values: ["Micro", "Piccola", "Media"] },
        citations: sizeCitation,
      },
      {
        id: "registry",
        label: "Registro italiano con eccezione SEE",
        kind: "eligibility",
        condition: {
          op: "any",
          args: [
            eq("italian_registry"),
            { op: "all", args: [eq("eea_registry"), eq("italian_by_payment")] },
          ],
        },
        citations: registryCitation,
      },
      {
        id: "seat",
        label: "Sede già presente o acquisita con condizioni documentate",
        kind: "eligibility",
        condition: {
          op: "any",
          args: [
            eq("existing_lazio"),
            {
              op: "all",
              args: [eq("lazio_by_payment"), eq("described"), eq("justified"), eq("documented")],
            },
          ],
        },
        citations: seatCitation,
      },
      {
        id: "previous",
        label: "Voucher precedente con eccezione ed esclusione stessa tipologia",
        kind: "eligibility",
        condition: {
          op: "any",
          args: [
            eq("previous_voucher", false),
            { op: "all", args: [eq("payment_requested"), eq("same_type", false)] },
          ],
        },
        citations: previousCitation,
      },
    ],
    unresolved: [
      "Banco prova parziale: mancano gli altri requisiti e le formule del bando; vietato usarlo come assessment operativo.",
    ],
  };
}
type State = "passed" | "failed" | "unknown";
function scenario(
  name: string,
  rule: string,
  state: State,
  answers: GrantScenario["answers"],
): GrantScenario {
  return {
    name,
    answers,
    expected: state === "failed" ? "not_eligible" : "incomplete",
    ruleStates: { [rule]: state },
  };
}
export const LAZIO_RULE_CASES: GrantScenario[] = [
  ...["Micro", "Piccola", "Media"].map((size) =>
    scenario(`PMI ${size}`, "size", "passed", { size }),
  ),
  scenario("Impresa grande", "size", "failed", { size: "Grande" }),
  scenario("Dimensione non verificata", "size", "unknown", {}),
  scenario("Registro italiano già alla domanda", "registry", "passed", { italian_registry: true }),
  scenario("Eccezione SEE e iscrizione italiana entro erogazione", "registry", "passed", {
    italian_registry: false,
    eea_registry: true,
    italian_by_payment: true,
  }),
  scenario("Nessuna iscrizione italiana né SEE", "registry", "failed", {
    italian_registry: false,
    eea_registry: false,
  }),
  scenario("SEE ma termine italiano non rispettato", "registry", "failed", {
    italian_registry: false,
    eea_registry: true,
    italian_by_payment: false,
  }),
  scenario("SEE e adempimento italiano ancora ignoto", "registry", "unknown", {
    italian_registry: false,
    eea_registry: true,
  }),
  scenario("Sede Lazio già presente", "seat", "passed", { existing_lazio: true }),
  scenario("Sede acquisita entro erogazione e piano completo in domanda", "seat", "passed", {
    existing_lazio: false,
    lazio_by_payment: true,
    described: true,
    justified: true,
    documented: true,
  }),
  ...["lazio_by_payment", "described", "justified", "documented"].map((field) =>
    scenario(`Sede futura: manca ${field}`, "seat", "failed", {
      existing_lazio: false,
      lazio_by_payment: true,
      described: true,
      justified: true,
      documented: true,
      [field]: false,
    }),
  ),
  scenario("Sede futura: acquisizione ancora ignota", "seat", "unknown", {
    existing_lazio: false,
    described: true,
    justified: true,
    documented: true,
  }),
  scenario("Nessun precedente voucher", "previous", "passed", { previous_voucher: false }),
  scenario(
    "Precedente voucher: richiesta già presentata e tipologia diversa",
    "previous",
    "passed",
    { previous_voucher: true, payment_requested: true, same_type: false },
  ),
  scenario("Precedente voucher senza richiesta presentata", "previous", "failed", {
    previous_voucher: true,
    payment_requested: false,
    same_type: false,
  }),
  scenario("Precedente voucher sulla stessa tipologia", "previous", "failed", {
    previous_voucher: true,
    payment_requested: true,
    same_type: true,
  }),
  scenario("Precedente voucher: richiesta non verificata", "previous", "unknown", {
    previous_voucher: true,
    same_type: false,
  }),
];
