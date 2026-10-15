import { describe, it, expect } from "vitest";
import {
  evaluate,
  classOf,
  classifySize,
  nonnegative,
  scoreValueAdded,
  scoreEmployees,
  submissionInWindow,
  type Answers,
  type Checklist,
  type RuleMap,
} from "./engine";
import { OFFICIAL_RULES, GENERAL_CHECKS, TECH_CHECKS, COMMON_TECH_CHECKS } from "./bando";
const docs: Checklist = Object.fromEntries(
  [
    "visura",
    "impresa_giovanile",
    "modello_expost",
    "modello1_exante",
    "polizza_o_modello3",
    "modello2_exante",
    "precedenti_voucher",
    "inps_attestazione_luglio_2026",
    "iva_modello_2026",
    "redditi_2025",
    "cert_genere",
    "cert_ambiente",
    "iva_oss_2025",
    "attestazione_editoria",
  ].map((k) => [k, { status: "verificato" }]),
);
const micro: Answers = {
  ...Object.fromEntries(GENERAL_CHECKS.map(([k]) => [k, "si"])),
  conflitti_interesse: "no",
  ha_associate_collegate: "no",
  operazioni_straordinarie: "no",
  partecipazione_pubblica_rilevante: "no",
  giovani_assetto: "Assetto societario e date verificati",
  ula_2024: 5,
  ula_2025: 5,
  fatturato_2024: 500000,
  fatturato_2025: 500000,
  attivo_2024: 300000,
  attivo_2025: 300000,
  sede_operativa_lazio: "si",
  ateco_codice: "62.01",
  ateco_escluso: "no",
  attivita_esclusioni_verificate: "si",
  iscritta_attiva: "si",
  durc_regolare: "si",
  procedure_concorsuali: "no",
  de_minimis_impresa_unica: 0,
  de_minimis_verificato: "si",
  doppio_finanziamento_assente: "si",
  precedenti_voucher_lazio: "no",
  relazione_micro_exante: "si",
  fornitore_micro_unico: "si",
  saldo_entro_sei_mesi: "si",
  interesse_workplace: "no",
  interesse_commerce: "no",
  interesse_cyber: "no",
  interesse_cloud: "no",
  regime_fiscale: "iva",
  iva_ve50_2025: 1000000,
  iva_vf25_2025: 0,
  addetti_inps_luglio_2026: 20,
  vendite_oss: "no",
  integrazione_editoria: "no",
  cert_genere_valida: "si",
  impresa_giovanile: "si",
  cert_ambiente_valida: "si",
};
const small: Answers = {
  ...micro,
  ula_2024: 20,
  ula_2025: 20,
  diagnosi_prevista: "si",
  diagnosi_manager: "si",
  diagnosi_tempi: "si",
};
const medium: Answers = { ...small, ula_2024: 100, ula_2025: 100 };
const cloud = (types = ["database"]): Answers => ({
  interesse_cloud: "si",
  cloud_sistemi: types,
  ...Object.fromEntries(
    types.flatMap((t) => [
      [`cloud_${t}_esistente`, "si"],
      [
        `cloud_${t}_descrizione`,
        "Server locale aziendale PostgreSQL con VM conforme alla definizione",
      ],
      [`cloud_${t}_durata_mesi`, 36],
      ...TECH_CHECKS["cloud"]!.map(([k]) => [`cloud_${t}_${k}`, "si"]),
      ...COMMON_TECH_CHECKS.map(([k]) => [`cloud_${t}_${k}`, "si"]),
    ]),
  ),
});
const workplace: Answers = {
  interesse_workplace: "si",
  workplace_categorie: ["c1", "c2", "c3", "c4", "c5"],
  workplace_postazioni: 7,
  addetti_inps_luglio_2026: 20,
  inps_accentrato: "no",
  workplace_durata_mesi: 36,
  ...Object.fromEntries(
    [
      ...TECH_CHECKS["workplace"]!,
      ...COMMON_TECH_CHECKS.map(([k, l]) => [`workplace_${k}`, l] as const),
    ].map(([k]) => [k, "si"]),
  ),
};
const commerce: Answers = {
  interesse_commerce: "si",
  commerce_tipo: "iaas",
  commerce_durata_mesi: 36,
  ...Object.fromEntries(
    [
      ...TECH_CHECKS["commerce"]!,
      ...COMMON_TECH_CHECKS.map(([k, l]) => [`commerce_${k}`, l] as const),
    ].map(([k]) => [k, "si"]),
  ),
};
const cyber: Answers = {
  interesse_cyber: "si",
  cyber_soluzioni: ["s1"],
  cyber_durata_mesi: 36,
  ...Object.fromEntries(
    [
      ...TECH_CHECKS["cyber"]!,
      ...COMMON_TECH_CHECKS.filter(([k]) => k !== "fornitore_ict_unitario").map(
        ([k, l]) => [`cyber_${k}`, l] as const,
      ),
    ].map(([k]) => [k, "si"]),
  ),
};
const ev = (a: Answers = {}, r: RuleMap = OFFICIAL_RULES, cl: Checklist = docs) =>
  evaluate({ ...micro, ...cloud(), ...a }, r, [], cl);
const iv = (a: Answers, key: string) => ev(a).interventions.find((i) => i.key === key)!;
describe("Dati dimensionali e input", () => {
  it.each([
    [9, 2000000, 3000000, "micro"],
    [10, 2000000, 2000000, "piccola"],
    [49, 10000000, 11000000, "piccola"],
    [50, 10000000, 10000000, "media"],
    [249, 50000000, 50000000, "media"],
    [249, 60000000, 43000000, "media"],
    [250, 1, 1, "grande"],
  ] as const)("soglie UE %s %s %s", (u, f, t, s) => expect(classOf(u, f, t)).toBe(s));
  it.each([-1, Infinity, NaN, " ", true, "1e4", "-2", "invalid", {}, "1.234,50"])(
    "dato invalido %s",
    (v) => expect(nonnegative(v)).toBeNull(),
  );
  it("ULA frazionarie valide, addetti e postazioni interi", () => {
    expect(nonnegative("2,5")).toBe(2.5);
    expect(nonnegative(2.5, true)).toBeNull();
    expect(nonnegative(0)).toBe(0);
  });
  it("non usa dati individuali al posto di gruppo", () =>
    expect(
      classifySize({ ...micro, ha_associate_collegate: "si", dati_aggregati_disponibili: "no" })
        .size,
    ).toBeNull());
  it("assetto mancante non confermato", () =>
    expect(classifySize({ ...micro, ha_associate_collegate: "" }).status).toBe("ignoto"));
  it("cambio micro/piccola senza terzo esercizio non attribuisce un massimale", () =>
    expect(classifySize({ ...micro, ula_2025: 20 }).size).toBeNull());
  it("operazione straordinaria richiede verifica", () =>
    expect(classifySize({ ...micro, operazioni_straordinarie: "si" }).size).toBeNull());
  it("grande solo dopo due esercizi coerenti", () =>
    expect(classifySize({ ...micro, ula_2024: 250, ula_2025: 250 }).status).toBe(
      "non_ammissibile",
    ));
  it("valori negativi non producono micro", () =>
    expect(classifySize({ ...micro, ula_2025: -1, ula_2024: -1 }).size).toBeNull());
});
describe("Regole, documenti e requisiti soggettivi", () => {
  it("caso completo cloud micro", () => {
    const r = ev();
    expect(r.projectStatus).toBe("confermato");
    expect(r.totals.confirmedCapped).toBe(27656.4);
  });
  it("regole vuote: nessun falso contributo o falso sotto soglia", () => {
    const r = ev({}, {});
    expect(r.totals.potentialCapped).toBeNull();
    expect(r.totals.meetsMinimumPotential).toBeNull();
    expect(r.projectStatus).toBe("ignoto");
  });
  it.each(["da_validare", "da_confrontare"])("regola %s blocca importi", (status) => {
    const r = {
      ...OFFICIAL_RULES,
      cloud_database: { ...OFFICIAL_RULES["cloud_database"]!, status },
    };
    expect(ev({}, r).totals.potentialCapped).toBeNull();
  });
  it("override numerico anche validato divergente è bloccato", () =>
    expect(
      ev(
        {},
        {
          ...OFFICIAL_RULES,
          cloud_database: { ...OFFICIAL_RULES["cloud_database"]!, value: 999999 },
        },
      ).totals.potentialCapped,
    ).toBeNull());
  it("vecchia risposta sede legale non significa operativa", () =>
    expect(ev({ sede_operativa_lazio: "", sede_lazio: "si" }).gateStatus).toBe("ignoto"));
  it("apertura Lazio documentata resta condizionata", () =>
    expect(
      ev({
        sede_operativa_lazio: "no",
        sede_lazio_entro_termine: "si",
        apertura_sede_documentata: "si",
      }).projectStatus,
    ).toBe("potenziale"));
  it("nessuna sede o apertura incompatibile", () =>
    expect(ev({ sede_operativa_lazio: "no", sede_lazio_entro_termine: "no" }).projectStatus).toBe(
      "non_ammissibile",
    ));
  it("ATECO senza attività verificate non basta", () =>
    expect(ev({ attivita_esclusioni_verificate: "" }).gateStatus).toBe("ignoto"));
  it.each(GENERAL_CHECKS.map(([k]) => k))("requisito mancante %s impedisce conferma", (key) =>
    expect(ev({ [key]: "" }).gateStatus).toBe("ignoto"),
  );
  it("difficoltà UE non esclude automaticamente", () =>
    expect(ev({ impresa_difficolta: "si" }).projectStatus).toBe("confermato"));
  it("procedure concorsuali richiedono verifica eccezioni", () =>
    expect(ev({ procedure_concorsuali: "si" }).gateStatus).toBe("ignoto"));
  it("documenti mancanti non sono verificati", () =>
    expect(ev({}, OFFICIAL_RULES, {}).gateStatus).toBe("ignoto"));
  it("N/A non sostituisce documento obbligatorio", () =>
    expect(
      ev({}, OFFICIAL_RULES, { ...docs, polizza_o_modello3: { status: "non_applicabile" } })
        .gateStatus,
    ).toBe("ignoto"));
  it("precedente voucher senza richiesta saldo esclude", () =>
    expect(
      ev({ precedenti_voucher_lazio: "si", precedenti_erogazione_presentata: "no" }).projectStatus,
    ).toBe("non_ammissibile"));
  it("stessa tipologia precedente esclusa anche con spese diverse", () =>
    expect(
      iv(
        {
          precedenti_voucher_lazio: "si",
          precedenti_erogazione_presentata: "si",
          precedenti_tipologie_complete: "si",
          precedenti_tipologie: ["cloud_database"],
        },
        "cloud_database",
      ).status,
    ).toBe("non_ammissibile"));
  it("cloud VM distinte per voucher precedente", () =>
    expect(
      ev({
        precedenti_voucher_lazio: "si",
        precedenti_erogazione_presentata: "si",
        precedenti_tipologie_complete: "si",
        precedenti_tipologie: ["cloud_web"],
      }).projectStatus,
    ).toBe("confermato"));
  it("residuo de minimis sotto minimo esclude progetto", () => {
    const r = ev({ de_minimis_impresa_unica: 287000 });
    expect(r.totals.potentialCapped).toBe(13000);
    expect(r.projectStatus).toBe("non_ammissibile");
  });
  it("14.000 residui inclusi e 300.000 esauriti", () => {
    expect(ev({ de_minimis_impresa_unica: 286000 }).totals.meetsMinimumConfirmed).toBe(true);
    expect(ev({ de_minimis_impresa_unica: 300000 }).projectStatus).toBe("non_ammissibile");
  });
  it("zero aiuti va indicato, vecchio de minimis no non basta", () =>
    expect(
      ev({ de_minimis_impresa_unica: "", de_minimis_ricevuti: "no" }).totals.potentialCapped,
    ).toBeNull());
  it("nessuna evidenza trasforma preventivi in contributi", () => {
    const r = evaluate(
      { ...micro, ...cloud() },
      OFFICIAL_RULES,
      [
        { intervention: "cloud_database", amount: 999999 },
        { intervention: "cloud_database", amount: -50 },
      ],
      docs,
    );
    expect(r.totals.confirmedCapped).toBe(27656.4);
    expect(r.totals.documented).toBe(999999);
  });
});
describe("Interventi, composizione e massimali", () => {
  it("diagnosi sola esclusa anche media sopra 14000", () =>
    expect(ev({ ...medium, interesse_cloud: "no" }).projectStatus).toBe("non_ammissibile"));
  it("piccola senza diagnosi blocca altri interventi", () =>
    expect(ev({ ...small, diagnosi_prevista: "no" }).projectStatus).toBe("non_ammissibile"));
  it("diagnosi incompleta resta ignota", () =>
    expect(ev({ ...small, ...cloud(), diagnosi_manager: "" }).projectStatus).toBe("ignoto"));
  it("micro può usare diagnosi privata invece modello2 senza contributo A", () =>
    expect(ev({ diagnosi_prevista: "si" }).projectStatus).toBe("confermato"));
  it("contributi A ed E vietati micro", () => {
    expect(ev({ diagnosi_contributo_micro: "si" }).projectStatus).toBe("non_ammissibile");
    expect(ev({ ...cyber }).projectStatus).toBe("non_ammissibile");
  });
  it("non confonde PC Access individuale con server on-premise", () =>
    expect(iv({ cloud_database_server_locale: "no" }, "cloud_database").status).toBe(
      "non_ammissibile",
    ));
  it("cloud pubblico obbligatorio", () =>
    expect(iv({ cloud_database_pubblico: "no" }, "cloud_database").status).toBe("non_ammissibile"));
  it.each(TECH_CHECKS["cloud"]!.map(([k]) => k))(
    "cloud requisito %s mancante non conferma",
    (key) => expect(iv({ [`cloud_database_${key}`]: "" }, "cloud_database").status).toBe("ignoto"),
  );
  it("VM duplicate non raddoppiano forfait", () =>
    expect(ev({ ...cloud(["database", "database"]) }).totals.confirmedCapped).toBe(27656.4));
  it("workplace compra 7, non tutte le 20 postazioni INPS", () =>
    expect(iv({ ...workplace }, "workplace").theoretical).toBe(15892.8));
  it("categorie duplicate/fasulle non soddisfano cinque", () =>
    expect(
      iv({ ...workplace, workplace_categorie: ["c1", "c1", "c1", "x", "c5"] }, "workplace").status,
    ).toBe("non_ammissibile"));
  it.each([35, 0, -1, 1.5])("durata workplace %s non valida", (v) =>
    expect(iv({ ...workplace, workplace_durata_mesi: v }, "workplace").status).not.toBe(
      "confermato",
    ),
  );
  it("rinnovi e upgrade workplace esclusi", () =>
    expect(iv({ ...workplace, workplace_nuova_adozione: "no" }, "workplace").status).toBe(
      "non_ammissibile",
    ));
  it("postazioni eccedenti limite INPS escluse", () =>
    expect(iv({ ...workplace, workplace_postazioni: 21 }, "workplace").status).toBe(
      "non_ammissibile",
    ));
  it("INPS accentrato non usa automaticamente addetti fuori Lazio", () =>
    expect(
      iv(
        {
          ...workplace,
          inps_accentrato: "si",
          addetti_lazio_verificati: "si",
          addetti_lazio_documentati: 3,
        },
        "workplace",
      ).status,
    ).toBe("non_ammissibile"));
  it("postazioni frazionarie non valide", () =>
    expect(iv({ ...workplace, workplace_postazioni: 1.5 }, "workplace").theoretical).toBeNull());
  it("commerce SaaS escluso", () =>
    expect(iv({ ...commerce, commerce_tipo: "saas" }, "commerce").status).toBe("non_ammissibile"));
  it.each(TECH_CHECKS["commerce"]!.map(([k]) => k))("commerce senza %s non conferma", (key) =>
    expect(iv({ ...commerce, [key]: "" }, "commerce").status).toBe("ignoto"),
  );
  it("cyber piccola completa e forfait", () =>
    expect(iv({ ...small, ...cyber }, "cyber").theoretical).toBe(14656.8));
  it("cyber senza outsourcing esclusa", () =>
    expect(iv({ ...small, ...cyber, cyber_outsourcing: "no" }, "cyber").status).toBe(
      "non_ammissibile",
    ));
  it("cyber esperto non idoneo esclusa", () =>
    expect(iv({ ...small, ...cyber, cyber_esperto: "no" }, "cyber").status).toBe(
      "non_ammissibile",
    ));
  it("massimali ufficiali per micro piccola media", () => {
    const c = cloud(["application", "database", "web", "backup"]);
    expect(ev(c).totals.confirmedCapped).toBe(50000);
    expect(ev({ ...small, ...c, ...workplace, ...commerce, ...cyber }).totals.confirmedCapped).toBe(
      100000,
    );
    expect(
      ev({ ...medium, ...c, ...workplace, workplace_postazioni: 20, ...commerce, ...cyber }).totals
        .confirmedCapped,
    ).toBe(150000);
  });
  it("risposte stale a interesse no non generano importi", () =>
    expect(
      ev({ ...cloud(), interesse_cloud: "no", ...workplace }).interventions.some((i) =>
        i.key.startsWith("cloud"),
      ),
    ).toBe(false));
  it("interessi mancanti non implicano sotto soglia", () =>
    expect(
      ev({ interesse_cloud: "", interesse_workplace: "" }).totals.meetsMinimumPotential,
    ).toBeNull());
});
describe("Punteggio e termini", () => {
  it.each([
    [35000, 0],
    [42500, 17.5],
    [50000, 35],
    [150000, 17.5],
    [250000, 0],
    [-20, 0],
  ])("valore aggiunto %s punti %s", (n, p) => expect(scoreValueAdded(n)).toBe(p));
  it.each([
    [0, 0],
    [10, 10],
    [20, 20],
    [60, 10],
    [100, 0],
    [101, 0],
  ])("addetti %s punti %s", (n, p) => expect(scoreEmployees(n)).toBe(p));
  it("punteggio caso micro cloud 90, con 3+ tipi 100", () => {
    expect(ev().score.total).toBe(90);
    expect(ev({ ...cloud(["application", "database", "web", "backup"]) }).score.total).toBe(100);
  });
  it("diagnosi piccola +1 tipo ha 0 punti C3", () =>
    expect(ev({ ...small, ...cloud() }).score.criteria[2]).toBe(0));
  it("per forfettari usa reddito imponibile", () =>
    expect(
      ev({ regime_fiscale: "forfettario", reddito_forfettario_2025: 1000000, iva_ve50_2025: 0 })
        .score.criteria[0],
    ).toBe(35));
  it("addetti zero divide per uno", () =>
    expect(ev({ addetti_inps_luglio_2026: 0, iva_ve50_2025: 50000 }).score.criteria[0]).toBe(35));
  it("vecchio UniEmens e IVA 2025 non sostengono punti", () => {
    const cl = {
      ...docs,
      inps_attestazione_luglio_2026: { status: "mancante" },
      iva_modello_2026: { status: "mancante" },
      inps_luglio: { status: "verificato" },
      iva_2025: { status: "verificato" },
    };
    expect(ev({}, OFFICIAL_RULES, cl).score.supportedTotal).toBe(35);
  });
  it("ricevuto non significa verificato, no certificato no bonus documentato", () =>
    expect(
      ev({}, OFFICIAL_RULES, {
        ...docs,
        cert_genere: { status: "ricevuto" },
        cert_ambiente: { status: "mancante" },
      }).score.supportedTotal,
    ).toBe(70));
  it("IVA e addetti mancanti non inventano zero nel punteggio stimato", () =>
    expect(ev({ iva_vf25_2025: "", addetti_inps_luglio_2026: "" }).score.total).toBeNull());
  it("OSS e editoria richiedono valori e documenti", () => {
    const r = ev({
      vendite_oss: "si",
      iva_oss_2025: 200000,
      integrazione_editoria: "si",
      editoria_vendite_2025: 400000,
      editoria_acquisti_2025: 100000,
    });
    expect(r.score.inputs["numerator"]).toBe(1500000);
    expect(ev({ vendite_oss: "si" }).score.total).toBeNull();
  });
  it.each([
    ["2026-09-30T11:59:59+02:00", false],
    ["2026-09-30T12:00:00+02:00", true],
    ["2026-10-29T17:00:00+01:00", true],
    ["2026-10-29T17:00:01+01:00", false],
    ["2026-10-29T16:00:00Z", true],
    ["2026-10-29T17:00:00", null],
  ])("finestra PEC %s", (v, ok) => expect(submissionInWindow(v)).toBe(ok));
  it("invio fuori termine esclude anche progetto altrimenti valido", () =>
    expect(
      ev({
        domanda_inviata: "si",
        marca_bollo_regolare: "si",
        domanda_gecoweb_regolare: "si",
        domanda_timestamp: "2026-10-30T10:00:00+01:00",
      }).projectStatus,
    ).toBe("non_ammissibile"));
});

describe("Date effettive e confronto con fuso italiano", () => {
  const realized = {
    progetto_realizzato: "si",
    firme_expost_verificate: "si",
    domanda_timestamp: "2026-10-09T13:00:00+02:00",
    data_concessione: "2026-11-15",
    data_conclusione: "2027-05-15",
    data_richiesta_saldo: "2027-05-15",
    cloud_database_data_avvio: "2026-10-10",
  };
  it("esattamente sei mesi inclusi", () => expect(ev(realized).projectStatus).toBe("confermato"));
  it("conclusione tardiva incompatibile", () =>
    expect(
      ev({ ...realized, data_conclusione: "2027-05-16", data_richiesta_saldo: "2027-05-16" })
        .projectStatus,
    ).toBe("non_ammissibile"));
  it("saldo tardivo con progetto concluso nei tempi richiede verifica invito", () =>
    expect(ev({ ...realized, data_richiesta_saldo: "2027-05-16" }).projectStatus).toBe("ignoto"));
  it("avvio alla stessa data domanda escluso", () =>
    expect(ev({ ...realized, cloud_database_data_avvio: "2026-10-09" }).projectStatus).toBe(
      "non_ammissibile",
    ));
  it("non normalizza 31 settembre in 1 ottobre", () =>
    expect(submissionInWindow("2026-09-31T13:00:00+02:00")).toBeNull());
  it("date mancanti nel realizzato non confermano", () =>
    expect(ev({ ...realized, data_conclusione: "" }).projectStatus).toBe("ignoto"));
  it("diagnosi obsoleta esclusa", () =>
    expect(
      ev({ ...small, ...cloud(), ...realized, data_diagnosi_exante: "2026-07-08" }).projectStatus,
    ).toBe("non_ammissibile"));
  it("diagnosi al limite tre mesi ammessa", () =>
    expect(
      ev({ ...small, ...cloud(), ...realized, data_diagnosi_exante: "2026-07-09" }).projectStatus,
    ).toBe("confermato"));
  it("diagnosi successiva domanda rende invalido avvio anteriore", () =>
    expect(
      ev({ ...small, ...cloud(), ...realized, data_diagnosi_exante: "2026-10-11" }).projectStatus,
    ).toBe("non_ammissibile"));
  it("domanda UTC tarda ha data successiva in Italia", () =>
    expect(
      ev({
        ...realized,
        domanda_timestamp: "2026-10-09T23:30:00Z",
        cloud_database_data_avvio: "2026-10-10",
      }).projectStatus,
    ).toBe("non_ammissibile"));
});

describe("Formalità GeCoWEB e conflitti", () => {
  it("modello4 mancante non conferma rapporti rilevanti", () =>
    expect(ev({ conflitti_interesse: "si" }).gateStatus).toBe("ignoto"));
  it("rapporti dichiarati con modello4 non escludono automaticamente", () =>
    expect(
      ev({ conflitti_interesse: "si" }, OFFICIAL_RULES, {
        ...docs,
        modello4_conflitti: { status: "verificato" },
      }).projectStatus,
    ).toBe("confermato"));
  it("invio senza bollo/esenzione da verificare", () =>
    expect(
      ev({
        domanda_inviata: "si",
        domanda_timestamp: "2026-10-09T13:00:00+02:00",
        domanda_gecoweb_regolare: "si",
      }).gateStatus,
    ).toBe("ignoto"));
});
