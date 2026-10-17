import { describe, it, expect } from "vitest";
import { micro, small, cloud, commerce, docs, ev } from "../test/lazio-fixtures";
import { evaluate, classifySize, type Answers, type Checklist } from "./engine";
import { OFFICIAL_RULES, GENERAL_CHECKS, TECH_CHECKS, COMMON_TECH_CHECKS } from "./bando";
import { DOSSIER_STEPS, geCoConsistency } from "./lazio-dossier";
import { STEPS, getGeCoWebFormMissing } from "./questions";
import { CHECKLIST } from "./checklist";

const actual: Answers = {
  ...micro,
  ...cloud(),
  progetto_realizzato: "si",
  firme_expost_verificate: "si",
  domanda_inviata: "si",
  domanda_timestamp: "2026-10-01T12:00:00+02:00",
  marca_bollo_regolare: "si",
  domanda_gecoweb_regolare: "si",
  data_concessione: "2026-11-01",
  data_conclusione: "2026-12-01",
  data_richiesta_saldo: "2026-12-10",
  cloud_database_data_avvio: "2026-11-10",
};
const calc = (a: Answers, cl: Checklist = docs) => evaluate(a, OFFICIAL_RULES, [], cl);

describe("Regressioni audit dei sette documenti", () => {
  it.each([
    ["2026-10-16T23:30:00Z", "confermato", false],
    ["2026-10-17T01:30:00+02:00", "confermato", false],
    ["2026-10-17T00:30:00+03:00", "non_ammissibile", true],
  ] as const)(
    "Commerce: motore e fascicolo usano il giorno italiano della PEC %s",
    (submitted, status, warning) => {
      const r = ev({
        ...commerce,
        commerce_sostituzione: "si",
        commerce_precedente_data: "2023-10-16",
        domanda_timestamp: submitted,
      });
      expect(r.interventions.find((i) => i.key === "commerce")!.status).toBe(status);
      expect(
        r.dossier.stages[0]!.issues.some((s) =>
          s.includes("Commerce: soluzione precedente non risulta"),
        ),
      ).toBe(warning);
    },
  );
  it.each(["", undefined, "nonso"])("operazioni straordinarie %s non confermano", (v) =>
    expect(ev({ operazioni_straordinarie: v }).sizeStatus).toBe("ignoto"),
  );
  it("controllo pubblico rilevante senza eccezione esclude", () =>
    expect(
      ev({ partecipazione_pubblica_rilevante: "si", eccezione_pubblica: "no" }).sizeStatus,
    ).toBe("non_ammissibile"));
  it("eccezione pubblica non documentata non conferma", () =>
    expect(
      ev({ partecipazione_pubblica_rilevante: "si", eccezione_pubblica: "si" }).sizeStatus,
    ).toBe("ignoto"));
  it("eccezione pubblica documentata è verificabile", () =>
    expect(
      classifySize({
        ...micro,
        partecipazione_pubblica_rilevante: "si",
        eccezione_pubblica: "si",
        eccezione_pubblica_motivo: "Eccezione verificata ai sensi allegato I",
        eccezione_pubblica_verificata: "si",
      }).status,
    ).toBe("confermato"));
  it("saldo senza relazione ex post non conferma", () =>
    expect(calc(actual, { ...docs, modello_expost: { status: "mancante" } }).projectStatus).toBe(
      "ignoto",
    ));
  it("ricevuto non sostituisce documento verificato", () =>
    expect(calc(actual, { ...docs, modello_expost: { status: "ricevuto" } }).projectStatus).toBe(
      "ignoto",
    ));
  it("avvio dopo conclusione incompatibile", () =>
    expect(calc({ ...actual, cloud_database_data_avvio: "2026-12-20" }).projectStatus).toBe(
      "non_ammissibile",
    ));
  it("conclusione prima concessione, dopo domanda, non è esclusione inventata", () =>
    expect(
      calc({ ...actual, cloud_database_data_avvio: "2026-10-02", data_conclusione: "2026-10-20" })
        .projectStatus,
    ).toBe("confermato"));
  it("DURC saldo separato: richiede gestione senza azzerare ammissibilità", () => {
    const r = calc({ ...actual, durc_saldo_regolare: "no" });
    expect(r.projectStatus, JSON.stringify(r)).toBe("confermato");
    expect(r.dossier.stages[2]!.ready).toBe(false);
    expect(r.dossier.stages[2]!.issues.join(" ")).toContain("compensazione");
  });
  it("DURC domanda irregolare resta incompatibile", () =>
    expect(calc({ ...actual, durc_regolare: "no" }).projectStatus).toBe("non_ammissibile"));
  it("importo concesso limita la stima del realizzato", () =>
    expect(calc({ ...actual, contributo_concesso: 15000 }).totals.confirmedCapped).toBe(15000));
  it("bonus giovani dichiarato non è documentato", () => {
    const r = ev({}, OFFICIAL_RULES, { ...docs, impresa_giovanile: { status: "mancante" } });
    expect(r.score.total).toBe(90);
    expect(r.score.supportedTotal).toBe(80);
  });
  it("SRG da sola mantiene il bonus da chiarire", () =>
    expect(ev({ cert_ambiente_srg: "si" }).score.total).toBeNull());
  it("zero dipendenti con documento alternativo non è esclusione automatica", () => {
    const r = ev({ addetti_inps_luglio_2026: 0, iva_ve50_2025: 50000 }, OFFICIAL_RULES, {
      ...docs,
      inps_attestazione_luglio_2026: { status: "non_applicabile" },
      dichiarazione_zero_dipendenti: { status: "verificato" },
    });
    expect(r.projectStatus, JSON.stringify(r)).toBe("confermato");
    expect(r.score.status).toBe("da_verificare");
    expect(r.dossier.stages[0]!.issues.join(" ")).toContain("criterio 1");
  });
  it("OSS senza allegato segnala incertezza invece di formula definitiva", () =>
    expect(
      ev({ vendite_oss: "si", iva_oss_2025: 100000 }, OFFICIAL_RULES, {
        ...docs,
        iva_oss_2025: { status: "mancante" },
      }).score.status,
    ).toBe("da_verificare"));
  it("GeCoWEB rifiuta dimensione, costi, punteggi e durata incongruenti", () => {
    const a = {
      ...micro,
      ...cloud(),
      gecoweb_dimensione: "media",
      gecoweb_punteggio_totale: 999,
      gecoweb_punteggio_c1: 999,
      gecoweb_costo_cloud_database: 1,
      gecoweb_durata_mesi: 99,
    };
    const issues = geCoConsistency(a, { size: "micro", score: calc(a).score });
    expect(issues.length).toBeGreaterThanOrEqual(5);
    expect(getGeCoWebFormMissing(a).join(" ")).toContain("Costo GeCoWEB");
  });
  it.each([-1, "abc", "1e999"])("GeCoWEB rifiuta numeri non validi %s", (value) => {
    expect(geCoConsistency({ gecoweb_punteggio_c1: value }).join(" ")).toContain("non valido");
  });
  it("Commerce esclude sostituzione di soluzione troppo recente", () => {
    const r = ev({
      ...commerce,
      commerce_sostituzione: "si",
      commerce_precedente_data: "2025-01-01",
      domanda_timestamp: "2026-10-01T12:00:00+02:00",
    });
    expect(r.interventions.find((i) => i.key === "commerce")?.status).toBe("non_ammissibile");
  });
  it("documenti mancanti non consentono domanda o saldo pronti", () =>
    expect(ev().dossier.stages.every((s) => !s.ready)).toBe(true));
  it("modelli e checklist includono le nuove evidenze", () => {
    const ids = STEPS.flatMap((s) => s.questions(OFFICIAL_RULES).map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      "modello_metodo",
      "modello_piano",
      "expost_giudizio",
      "cloud_database_realizzato",
      "pmi_perimetro",
      "saldo_iban",
    ])
      expect(ids).toContain(id);
    expect(CHECKLIST.map((d) => d.key)).toContain("dichiarazione_zero_dipendenti");
  });
  it("un fascicolo completo può superare tutti i controlli documentali", () => {
    const a: Answers = {
      ...actual,
      concessione_ricevuta: "si",
      diagnosi_prevista: "no",
      diagnosi_contributo_micro: "no",
      contributo_concesso: 27656.4,
      atto_pec_data: "2026-11-02",
      atto_invio_data: "2026-11-05",
      durc_saldo_regolare: "si",
      cartelle_saldo: "no",
      variazioni_progetto: "no",
      saldo_iban: "IT60X0542811101000000123456",
      gecoweb_dimensione: "micro",
      gecoweb_bollo_esente: "si",
    };
    for (const s of STEPS)
      for (const q of s.questions(OFFICIAL_RULES))
        if ((!q.showIf || q.showIf(a)) && a[q.id] === undefined)
          a[q.id] =
            q.type === "tri" ? "si" : q.type === "number" ? 1 : "Descrizione con dati e riscontri";
    Object.assign(a, {
      modello_fine_prevista: "2026-12-01",
      gecoweb_durata_mesi: 2,
      gecoweb_punteggio_totale: 90,
      gecoweb_punteggio_c1: 35,
      gecoweb_punteggio_c2: 20,
      gecoweb_punteggio_c3: 5,
      gecoweb_punteggio_genere: 10,
      gecoweb_punteggio_giovanile: 10,
      gecoweb_punteggio_ambientale: 10,
      gecoweb_costo_cloud_database: 23047,
      cert_ambiente_srg: "no",
    });
    const verified = Object.fromEntries(CHECKLIST.map((d) => [d.key, { status: "verificato" }]));
    const r = calc(a, verified);
    expect(r.projectStatus, JSON.stringify(r)).toBe("confermato");
    expect(r.dossier.stages.map((s) => s.issues)).toEqual([[], [], []]);
  });
  it("dati nuovi persistono nel formato JSON usato dall’assessment", () => {
    const a = { ...actual, modello_metodo: "KPI prima/dopo", expost_giudizio: "Misure ottenute" };
    expect(calc(JSON.parse(JSON.stringify(a))).dossier).toEqual(calc(a).dossier);
  });
});

for (const [key] of GENERAL_CHECKS)
  it(`Cascata generale ${key}: no/ignoto`, () => {
    expect(ev({ [key]: "no" }).projectStatus).toBe("non_ammissibile");
    expect(ev({ [key]: "nonso" }).projectStatus).toBe("ignoto");
  });
for (const [key] of [...TECH_CHECKS["cloud"]!, ...COMMON_TECH_CHECKS])
  it(`Cascata cloud ${key}: no/ignoto`, () => {
    expect(ev({ ["cloud_database_" + key]: "no" }).projectStatus).toBe("non_ammissibile");
    expect(ev({ ["cloud_database_" + key]: "nonso" }).projectStatus).toBe("ignoto");
  });
it("modelli ex post restano nascosti finché il progetto non è realizzato", () => {
  const fields = DOSSIER_STEPS.find((s) => s.id === "modelli_expost")!.questions(OFFICIAL_RULES);
  expect(fields.filter((q) => !q.showIf || q.showIf(micro))).toHaveLength(0);
  expect(fields.filter((q) => !q.showIf || q.showIf(actual)).length).toBeGreaterThan(0);
});
it("piccola con sola diagnosi e commerce mantiene contributo previsto", () =>
  expect(calc({ ...small, ...commerce }).totals.confirmedCapped).toBe(16287.6));
