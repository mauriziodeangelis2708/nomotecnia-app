import { timestamp, isoDay, calendarMonths, romeDay } from "./lazio-dates";
export { timestamp, isoDay, calendarMonths, romeDay } from "./lazio-dates";
import { evaluateDossier, type DossierResult } from "./lazio-dossier";
// Valutazione preliminare pura: nessun esito equivale a concessione Lazio Innova.
import {
  BANDO_VERSION,
  COMMON_TECH_CHECKS,
  GENERAL_CHECKS,
  NUMERIC_RULES,
  TECH_CHECKS,
} from "./bando";
export type Status = "confermato" | "potenziale" | "non_ammissibile" | "ignoto";
export type Size = "micro" | "piccola" | "media" | "grande";
export type Answers = Record<string, unknown>;
export interface Rule {
  key: string;
  category: string;
  label: string;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  source: string;
  reference: string;
  status: string;
  requires_official_check: boolean;
  review_notes: string | null;
}
export type RuleMap = Record<string, Rule | undefined>;
export interface Check {
  key: string;
  label: string;
  status: Status;
  reasons: string[];
  ruleKeys: string[];
}
export interface Intervention extends Check {
  theoretical: number | null;
  documented: number;
}
export type Checklist = Record<string, { status: string; note?: string }>;
export interface Result {
  version: string;
  dossier: DossierResult;
  projectStatus: Status;
  projectReasons: string[];
  size: Size | null;
  sizeStatus: Status;
  sizeReasons: string[];
  gates: Check[];
  gateStatus: Status;
  interventions: Intervention[];
  totals: {
    confirmed: number;
    potential: number;
    documented: number;
    cap: number | null;
    residual: number | null;
    confirmedCapped: number | null;
    potentialCapped: number | null;
    minimum: number | null;
    meetsMinimumConfirmed: boolean | null;
    meetsMinimumPotential: boolean | null;
  };
  score: {
    status: "da_verificare" | "formula_validata";
    note: string;
    inputs: Record<string, unknown>;
    criteria: (number | null)[];
    total: number | null;
    supportedTotal: number | null;
  };
  warnings: string[];
}
const RANK: Record<Status, number> = {
  non_ammissibile: 0,
  ignoto: 1,
  potenziale: 2,
  confermato: 3,
};
export function worst(...s: Status[]): Status {
  return s.reduce((a, b) => (RANK[b] < RANK[a] ? b : a), "confermato" as Status);
}
export function nonnegative(v: unknown, integer = false): number | null {
  if (typeof v !== "number" && typeof v !== "string") return null;
  if (typeof v === "string" && (!v.trim() || !/^\d+(?:[.,]\d+)?$/.test(v.trim()))) return null;
  const n = typeof v === "number" ? v : Number(v.trim().replace(",", "."));
  return Number.isFinite(n) && n >= 0 && (!integer || Number.isSafeInteger(n)) ? n : null;
}
const yes = (v: unknown) => v === "si";
const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;
const selected = (v: unknown, allowed: string[]) =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === "string" && allowed.includes(x)))]
    : [];
const money = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
// Un override non validato, senza fonte, o divergente dall'Avviso non genera importi.
const rv = (r: RuleMap, key: string) => {
  const rule = r[key];
  const n = nonnegative(rule?.value);
  return rule?.status === "validata" &&
    !rule.requires_official_check &&
    text(rule.source) &&
    text(rule.reference) &&
    n === NUMERIC_RULES[key]
    ? n
    : null;
};
function triCheck(
  key: string,
  label: string,
  v: unknown,
  ok = "si",
  ruleKeys: string[] = [],
): Check {
  return {
    key,
    label,
    ruleKeys,
    status: v === ok ? "confermato" : v === "si" || v === "no" ? "non_ammissibile" : "ignoto",
    reasons:
      v === ok
        ? []
        : [
            v === "si" || v === "no"
              ? "Condizione dichiarata non soddisfatta: verificare eventuali eccezioni previste nel testo ufficiale."
              : "Dato mancante o non noto: acquisire e verificare.",
          ],
  };
}
export function classOf(ula: number, fatt: number, attivo: number): Size {
  if (![ula, fatt, attivo].every((n) => nonnegative(n) !== null))
    throw new Error("Dati dimensionali non validi");
  if (ula < 10 && (fatt <= 2000000 || attivo <= 2000000)) return "micro";
  if (ula < 50 && (fatt <= 10000000 || attivo <= 10000000)) return "piccola";
  if (ula < 250 && (fatt <= 50000000 || attivo <= 43000000)) return "media";
  return "grande";
}
export function classifySize(a: Answers): { size: Size | null; status: Status; reasons: string[] } {
  if (!["si", "no"].includes(String(a["operazioni_straordinarie"])))
    return {
      size: null,
      status: "ignoto",
      reasons: ["Operazioni straordinarie: risposta mancante o incerta."],
    };
  if (!["si", "no"].includes(String(a["partecipazione_pubblica_rilevante"])))
    return {
      size: null,
      status: "ignoto",
      reasons: [
        "Verificare partecipazione/controllo pubblico rilevante ed eccezioni PMI (MOD pp.29–30).",
      ],
    };
  if (a["partecipazione_pubblica_rilevante"] === "si") {
    if (a["eccezione_pubblica"] === "no")
      return {
        size: null,
        status: "non_ammissibile",
        reasons: ["Partecipazione pubblica rilevante senza eccezione PMI."],
      };
    if (
      a["eccezione_pubblica"] !== "si" ||
      !text(a["eccezione_pubblica_motivo"]) ||
      a["eccezione_pubblica_verificata"] !== "si"
    )
      return {
        size: null,
        status: "ignoto",
        reasons: ["Eccezione al controllo pubblico da documentare e verificare."],
      };
  }
  const assoc = a["ha_associate_collegate"];
  if (assoc !== "si" && assoc !== "no")
    return {
      size: null,
      status: "ignoto",
      reasons: ["Assetto autonomo/associato/collegato non verificato."],
    };
  if (assoc === "si" && !yes(a["dati_aggregati_disponibili"]))
    return {
      size: null,
      status: "ignoto",
      reasons: [
        "Servono i dati aggregati delle imprese associate/collegate; i dati individuali non li sostituiscono.",
      ],
    };
  const year = (y: string) => {
    const suffix = assoc === "si" ? `agg_${y}` : y;
    const u = nonnegative(a[`ula_${suffix}`]),
      f = nonnegative(a[`fatturato_${suffix}`]),
      t = nonnegative(a[`attivo_${suffix}`]);
    return u === null || f === null || t === null ? null : classOf(u, f, t);
  };
  const p = year("2025"),
    q = year("2024");
  if (!p || !q)
    return {
      size: p ?? q,
      status: "ignoto",
      reasons: [
        "Dati di due esercizi mancanti/non validi. Imprese nuove: stima in buona fede da verificare con modelli 5/6.",
      ],
    };
  if (p !== q || yes(a["operazioni_straordinarie"]))
    return {
      size: null,
      status: "ignoto",
      reasons: [
        "Variazione dimensionale o operazione straordinaria: acquisire esercizi ulteriori e verifica professionale della regola dei due esercizi; nessun massimale attribuito.",
      ],
    };
  return {
    size: p,
    status: p === "grande" ? "non_ammissibile" : "confermato",
    reasons:
      p === "grande"
        ? ["Superate le soglie PMI su entrambi gli esercizi."]
        : [
            "Classificazione sui dati dichiarati: riconfermare alla concessione; modifiche societarie possono cambiarla.",
          ],
  };
}
// Date ISO con fuso esplicito, per non confondere UTC e ora italiana.
export function submissionInWindow(v: unknown): boolean | null {
  const n = timestamp(v);
  return n === null
    ? null
    : n >= Date.parse("2026-09-30T12:00:00+02:00") && n <= Date.parse("2026-10-29T17:00:00+01:00");
}
const docOK = (cl: Checklist, key: string) => cl[key]?.status === "verificato";
export function evaluate(
  a: Answers,
  rules: RuleMap,
  evidences: { intervention: string | null; amount: number | null }[] = [],
  checklist: Checklist = {},
): Result {
  const warnings = [
    "Stima preliminare sui dati dichiarati. Solo Lazio Innova verifica ammissibilità, punteggio e concessione; disponibilità fondi e graduatoria non sono garantite.",
    "Importi art. 5 già comprensivi del 20% personale. In GeCoWEB indicare la base senza tale 20%: non aggiungerlo due volte.",
  ];
  const sz = classifySize(a),
    size = sz.size;
  const gates: Check[] = [];
  const add = (key: string, label: string, value: unknown, ok = "si", ruleKeys: string[] = []) =>
    gates.push(triCheck(key, label, value, ok, ruleKeys));
  let sede = triCheck(
    "sede",
    "Sede operativa e attività nel Lazio risultanti al Registro",
    a["sede_operativa_lazio"],
    "si",
    ["sede_lazio"],
  );
  if (a["sede_operativa_lazio"] === "no" && yes(a["sede_lazio_entro_termine"]))
    sede = {
      ...sede,
      status: yes(a["apertura_sede_documentata"]) ? "potenziale" : "ignoto",
      reasons: [
        "Acquisire entro la richiesta di erogazione; apertura e attività devono essere descritte, giustificate e documentate già in domanda.",
      ],
    };
  gates.push(sede);
  const ateco = triCheck(
    "ateco",
    "Attività effettiva non esclusa (Appendice 1)",
    a["ateco_escluso"],
    "no",
    ["ateco_exclusions"],
  );
  if (!text(a["ateco_codice"]) || !yes(a["attivita_esclusioni_verificate"])) {
    ateco.status = worst(ateco.status, "ignoto");
    ateco.reasons.push(
      "Codice e attività effettiva devono essere verificati sull'intero elenco: nessuna classificazione automatica per solo ATECO.",
    );
  }
  gates.push(ateco, {
    key: "pmi",
    label: "Dimensione PMI",
    status: sz.status,
    reasons: sz.reasons,
    ruleKeys: ["sme_thresholds"],
  });
  const registro = triCheck(
    "registro",
    "Registro Imprese italiano e attività",
    a["iscritta_attiva"],
  );
  if (
    a["iscritta_attiva"] === "no" &&
    yes(a["registro_ue"]) &&
    yes(a["registro_italiano_entro_saldo"])
  ) {
    registro.status = "potenziale";
    registro.reasons = [
      "Impresa di altro Stato SEE: documenti equipollenti e rappresentante italiano (art. 6), iscrizione italiana entro saldo.",
    ];
  }
  gates.push(registro);
  add("durc", "Regolarità contributiva alla data della domanda", a["durc_regolare"]);
  if (yes(a["progetto_realizzato"])) {
    add(
      "documento_expost",
      "Relazione/diagnosi ex post e firme digitali verificate",
      docOK(checklist, "modello_expost") && yes(a["firme_expost_verificate"]) ? "si" : undefined,
    );
    if (size === "piccola" || size === "media")
      add(
        "documento_exante",
        "Diagnosi ex ante verificata",
        docOK(checklist, "modello1_exante") ? "si" : undefined,
      );
  }
  // Il semplice stato di difficoltà UE NON è un'autonoma causa di esclusione nell'Appendice 2.
  const procedure = triCheck(
    "procedure",
    "Pieno esercizio dei diritti / procedure concorsuali",
    a["procedure_concorsuali"],
    "no",
  );
  if (yes(a["procedure_concorsuali"])) {
    procedure.status = "ignoto";
    procedure.reasons = [
      "Verificare eccezioni art. 95 CCII, art. 186-bis e art. 124 D.Lgs. 36/2023; non escludere automaticamente.",
    ];
  }
  gates.push(procedure);
  for (const [key, label] of GENERAL_CHECKS) add(key, label, a[key]);
  const dmCap = rv(rules, "de_minimis_cap"),
    dmAmt = nonnegative(a["de_minimis_impresa_unica"]);
  const residual = dmCap !== null && dmAmt !== null ? Math.max(0, money(dmCap - dmAmt)) : null;
  const dmCheck: Check = {
    key: "deminimis",
    label: "De minimis: Impresa Unica, tre anni mobili",
    status:
      residual === 0
        ? "non_ammissibile"
        : residual === null || !yes(a["de_minimis_verificato"])
          ? "ignoto"
          : "confermato",
    reasons:
      residual === null
        ? [
            "Acquisire tutti gli aiuti concessi all'Impresa Unica nei tre anni mobili alla concessione; zero va indicato espressamente.",
          ]
        : [
            `Residuo dichiarato ${residual} EUR; verificare RNA, fusioni/scissioni e tutti gli aiuti rilevanti alla concessione.`,
          ],
    ruleKeys: ["de_minimis_cap"],
  };
  gates.push(dmCheck);
  add(
    "cumulo",
    "Nessun altro aiuto sugli interventi/costi coperti dalle somme forfettarie",
    a["doppio_finanziamento_assente"],
  );
  const previous = triCheck(
    "precedenti",
    "Precedenti Voucher Digitalizzazione PMI Lazio",
    a["precedenti_voucher_lazio"],
    "no",
  );
  if (yes(a["precedenti_voucher_lazio"])) {
    const ok = a["precedenti_erogazione_presentata"];
    previous.status = ok === "si" ? "confermato" : ok === "no" ? "non_ammissibile" : "ignoto";
    previous.reasons = [
      "Richiesta di erogazione del precedente voucher deve risultare presentata alla data della nuova domanda; mai finanziabile una tipologia già concessa.",
    ];
  }
  gates.push(previous);
  if (yes(a["domanda_inviata"])) {
    const ok = submissionInWindow(a["domanda_timestamp"]);
    gates.push({
      key: "termine_domanda",
      label: "Invio tramite GeCoWEB entro termini (ora italiana)",
      status: ok === null ? "ignoto" : ok ? "confermato" : "non_ammissibile",
      reasons: ok
        ? []
        : [
            "PEC GeCoWEB: 30/09/2026 ore 12:00 — 29/10/2026 ore 17:00. Occorre data/ora ISO con fuso esplicito.",
          ],
      ruleKeys: [],
    });
    add(
      "bollo",
      "Marca da bollo annullata/conservata con identificativo e data, o esenzione motivata",
      a["marca_bollo_regolare"],
    );
    add(
      "invio_formale",
      "Formulario finalizzato, domanda generata e firmata digitalmente, ricevuta PEC GeCoWEB",
      a["domanda_gecoweb_regolare"],
    );
  } else
    warnings.push(
      "Domanda in preparazione: l'invio deve avvenire esclusivamente in GeCoWEB tra 30/09/2026 ore 12:00 e 29/10/2026 ore 17:00 (Europe/Rome). Vale l'ultima domanda valida, che annulla le precedenti.",
    );
  add(
    "tempi",
    "Conclusione e richiesta saldo completa entro sei mesi dalla concessione",
    a["saldo_entro_sei_mesi"],
  );
  if (size === "micro") {
    add(
      "relazione_micro",
      "Modello 2 ex ante allegato alla domanda (o diagnosi equivalente)",
      a["relazione_micro_exante"],
    );
    add(
      "fornitore_micro",
      "Unico soggetto ICT per tutti gli interventi, firma modello 2 ex post",
      a["fornitore_micro_unico"],
    );
  }
  for (const [key, label] of [
    ["polizza_o_modello3", "Polizza valida / esenzione modello 3"],
    ...(size === "micro"
      ? [["modello2_exante", "Modello 2 ex ante micro / diagnosi equivalente"]]
      : []),
    ...(yes(a["precedenti_voucher_lazio"])
      ? [["precedenti_voucher", "Documenti del precedente Voucher Lazio"]]
      : []),
  ]) {
    gates.push({
      key: `doc_${key}`,
      label: label!,
      status: docOK(checklist, key!) ? "confermato" : "ignoto",
      reasons: docOK(checklist, key!)
        ? []
        : [
            "Documento non verificato nella checklist. La sola dichiarazione non sostituisce il controllo dell'operatore.",
          ],
      ruleKeys: [],
    });
  }
  if (yes(a["progetto_realizzato"])) {
    const concession = isoDay(a["data_concessione"]),
      completed = isoDay(a["data_conclusione"]),
      balance = isoDay(a["data_richiesta_saldo"]);
    const deadline = concession === null ? null : calendarMonths(concession, 6);
    gates.push({
      key: "saldo_date",
      label: "Date effettive: conclusione e saldo entro sei mesi dalla concessione",
      status:
        concession === null || deadline === null || completed === null || balance === null
          ? "ignoto"
          : completed > deadline || balance < completed || completed > deadline
            ? "non_ammissibile"
            : balance > deadline
              ? "ignoto"
              : "confermato",
      reasons: [
        "Termine ordinario art. 7. Eventuali procedure di regolarizzazione (invito a ulteriori 30 giorni) vanno verificate con Lazio Innova; non attribuiscono proroghe automatiche.",
      ],
      ruleKeys: [],
    });
  }
  const conflicts = triCheck(
    "conflitti",
    "Conflitti di interesse: rapporti rilevanti e dichiarazione modello 4",
    a["conflitti_interesse"],
    "no",
  );
  if (yes(a["conflitti_interesse"])) {
    conflicts.status = docOK(checklist, "modello4_conflitti") ? "confermato" : "ignoto";
    conflicts.reasons = [
      "La presenza di rapporti non comporta esclusione automatica; verificare e allegare il modello 4 nei casi previsti.",
    ];
  }
  gates.push(conflicts);
  const gateStatus = worst(...gates.map((x) => x.status));
  const iv: Intervention[] = [];
  const push = (
    key: string,
    label: string,
    ruleKeys: string[],
    amount: number | null,
    checks: Check[],
  ) => {
    if (key !== "diagnosi" && yes(a["progetto_realizzato"])) {
      const started = isoDay(a[`${key}_data_avvio`]),
        submitted = timestamp(a["domanda_timestamp"]);
      const diagnosis = isoDay(a["data_diagnosi_exante"]);
      // Confronto per giorno: la domanda PEC include ora, ma l'adozione va successiva.
      const submitDay = submitted === null ? null : romeDay(submitted);
      const reference =
        submitDay === null || (size !== "micro" && diagnosis === null)
          ? null
          : Math.max(submitDay, diagnosis ?? submitDay);
      const completed = isoDay(a["data_conclusione"]);
      checks.push({
        key: `${key}_date`,
        label: "Avvio effettivo dopo domanda/diagnosi",
        status:
          started === null || reference === null
            ? "ignoto"
            : started <= reference || (completed !== null && started > completed)
              ? "non_ammissibile"
              : "confermato",
        reasons: [
          "Indicare la prima adozione/acquisto dei componenti. La diagnosi può precedere la domanda; tutti gli altri interventi devono essere successivi alla data più recente e non successivi alla conclusione.",
        ],
        ruleKeys: [],
      });
    }
    const reasons = checks.flatMap((c) => c.reasons.map((reason) => `${c.label}: ${reason}`));
    let status = worst(sz.status, ...checks.map((c) => c.status));
    if (amount === null) {
      status = worst(status, "ignoto");
      reasons.push(
        "Importo non calcolabile: regola assente, non validata o divergente dall'Avviso.",
      );
    }
    const old = selected(a["precedenti_tipologie"], [
      "diagnosi",
      "workplace",
      "commerce",
      "cyber",
      "cloud_application",
      "cloud_database",
      "cloud_web",
      "cloud_backup",
    ]);
    if (yes(a["precedenti_voucher_lazio"])) {
      if (!yes(a["precedenti_tipologie_complete"])) {
        status = worst(status, "ignoto");
        reasons.push("Elenco completo delle tipologie già concesse da verificare.");
      }
      if (old.includes(key)) {
        status = "non_ammissibile";
        reasons.push(
          "Tipologia già finanziata da un precedente Voucher Lazio: esclusa anche con spese diverse.",
        );
      }
    }
    const documented = money(
      evidences
        .filter((e) => e.intervention === key)
        .reduce((sum, e) => sum + (nonnegative(e.amount) ?? 0), 0),
    );
    iv.push({
      key,
      label,
      ruleKeys,
      status,
      reasons,
      theoretical: status === "non_ammissibile" ? 0 : amount,
      documented,
    });
  };
  const check = (key: string, label: string, ok = "si") => triCheck(key, label, a[key], ok);
  const duration = (key: string) => {
    const n = nonnegative(a[key], true);
    return {
      key,
      label: "Durata di ogni servizio ricorrente",
      status: n === null ? "ignoto" : n < 36 ? "non_ammissibile" : "confermato",
      reasons:
        n === null
          ? ["Durata minima comune non indicata o non valida."]
          : n < 36
            ? ["Ogni servizio ricorrente deve coprire almeno 36 mesi."]
            : [],
      ruleKeys: [],
    } as Check;
  };
  const common = (prefix: string) => COMMON_TECH_CHECKS.map(([k, l]) => check(`${prefix}_${k}`, l));
  const bySize = (prefix: string) =>
    size && size !== "grande"
      ? rv(
          rules,
          `${prefix}_${({ micro: "micro", piccola: "small", media: "medium" } as const)[size]}`,
        )
      : null;
  const diagnosisChecks = [
    check("diagnosi_prevista", "Diagnosi obbligatoria prevista"),
    check(
      "diagnosi_manager",
      "Manager UNI 11814 accreditato / albo MIMIT settore 8, indipendenza della persona e società, modello 1 e stesso firmatario ex post salvo forza maggiore",
    ),
    check(
      "diagnosi_tempi",
      "Ex ante prima degli interventi, non oltre tre mesi prima della domanda, consegna entro Atto di Impegno",
    ),
  ];
  if ((size === "piccola" || size === "media") && yes(a["progetto_realizzato"])) {
    const diagnosed = isoDay(a["data_diagnosi_exante"]),
      submitted = timestamp(a["domanda_timestamp"]),
      day = submitted === null ? null : romeDay(submitted);
    diagnosisChecks.push({
      key: "diagnosi_obsoleta",
      label: "Diagnosi ex ante non obsoleta",
      status:
        diagnosed === null || day === null
          ? "ignoto"
          : diagnosed < calendarMonths(day, -3)
            ? "non_ammissibile"
            : "confermato",
      reasons: [
        "Non oltre tre mesi prima della domanda; l'avvio degli altri interventi resta successivo alla diagnosi.",
      ],
      ruleKeys: [],
    });
  }
  if (size === "piccola" || size === "media")
    push(
      "diagnosi",
      "Diagnosi digitale",
      ["diag_small", "diag_medium", "diag_rule"],
      size === "piccola" ? rv(rules, "diag_small") : rv(rules, "diag_medium"),
      diagnosisChecks,
    );
  const microForbidden =
    size === "micro" && (yes(a["diagnosi_contributo_micro"]) || yes(a["interesse_cyber"]));
  if (size === "micro" && yes(a["diagnosi_contributo_micro"]))
    push("diagnosi", "Diagnosi digitale (contributo non ammesso alle micro)", ["diag_rule"], 0, [
      {
        key: "micro",
        label: "Micro",
        status: "non_ammissibile",
        reasons: [
          "Una diagnosi privata può sostituire il modello 2, ma il progetto non può richiedere il contributo A.",
        ],
        ruleKeys: [],
      },
    ]);
  if (yes(a["interesse_workplace"])) {
    const cats = selected(a["workplace_categorie"], ["c1", "c2", "c3", "c4", "c5"]);
    const count = nonnegative(a["workplace_postazioni"], true),
      inps = nonnegative(a["addetti_inps_luglio_2026"], true);
    const centralized = a["inps_accentrato"];
    const lazio = nonnegative(a["addetti_lazio_documentati"], true);
    const limit =
      centralized === "no"
        ? inps
        : centralized === "si" && yes(a["addetti_lazio_verificati"])
          ? lazio
          : null;
    const qty: Check = {
      key: "postazioni",
      label: "Postazioni acquistate / limite addetti luglio 2026",
      status:
        count === null || inps === null || limit === null
          ? "ignoto"
          : count < 1 || count > limit || limit > inps
            ? "non_ammissibile"
            : "confermato",
      reasons:
        count === null || limit === null
          ? [
              "Indicare postazioni realmente acquistate, forza aziendale INPS e, in caso di accentramento fuori regione, addetti Lazio documentati (Registro o quantificazione alternativa allegata).",
            ]
          : count < 1 || count > limit || (inps !== null && limit > inps)
            ? ["Quantità non positiva o superiore al limite documentato."]
            : [],
      ruleKeys: [],
    };
    const checks: Check[] = [
      {
        key: "categorie",
        label: "Cinque categorie obbligatorie distinte",
        status: cats.length === 5 ? "confermato" : "non_ammissibile",
        reasons:
          cats.length === 5
            ? []
            : ["Tutte e cinque devono essere incluse; duplicati/codici sconosciuti non contano."],
        ruleKeys: [],
      },
      qty,
      duration("workplace_durata_mesi"),
      ...TECH_CHECKS["workplace"]!.map(([k, l]) => check(k, l)),
      ...common("workplace"),
    ];
    const rate = rv(rules, "workplace_per_employee");
    push(
      "workplace",
      "Digital Workplace",
      ["workplace_per_employee", "workplace_categories", "workplace_min_months"],
      count !== null && rate !== null ? money(count * rate) : null,
      checks,
    );
  }
  if (yes(a["interesse_commerce"]))
    push(
      "commerce",
      "Digital Commerce",
      ["commerce_micro", "commerce_small", "commerce_medium", "commerce_tech"],
      bySize("commerce"),
      [
        {
          key: "architettura",
          label: "Architettura IaaS/PaaS",
          status:
            a["commerce_tipo"] === "saas"
              ? "non_ammissibile"
              : ["iaas", "paas"].includes(String(a["commerce_tipo"]))
                ? "confermato"
                : "ignoto",
          reasons: a["commerce_tipo"] === "saas" ? ["Semplice SaaS escluso."] : [],
          ruleKeys: [],
        },
        ...(yes(a["commerce_sostituzione"])
          ? [
              ((): Check => {
                const previous = isoDay(a["commerce_precedente_data"]);
                const submitted = timestamp(a["domanda_timestamp"]);
                const limit = submitted === null ? null : calendarMonths(romeDay(submitted), -36);
                return {
                  key: "commerce_eta_precedente",
                  label: "Soluzione sostituita realizzata oltre tre anni prima della domanda",
                  status:
                    previous === null || limit === null
                      ? "ignoto"
                      : previous < limit
                        ? "confermato"
                        : "non_ammissibile",
                  reasons: [
                    "La sostituzione integrale deve riguardare una soluzione realizzata oltre tre anni prima della domanda.",
                  ],
                  ruleKeys: [],
                };
              })(),
            ]
          : []),
        duration("commerce_durata_mesi"),
        ...TECH_CHECKS["commerce"]!.map(([k, l]) => check(k, l)),
        ...common("commerce"),
      ],
    );
  if (yes(a["interesse_cyber"])) {
    const sol = selected(
      a["cyber_soluzioni"],
      Array.from({ length: 8 }, (_, i) => `s${i + 1}`),
    );
    push(
      "cyber",
      "Cyber Security",
      ["cyber_small", "cyber_medium", "cyber_sizes"],
      bySize("cyber"),
      [
        {
          key: "dimensione",
          label: "Solo piccole/medie",
          status:
            size === "micro" || size === "grande"
              ? "non_ammissibile"
              : size
                ? "confermato"
                : "ignoto",
          reasons: size === "micro" ? ["Intervento E vietato alle micro."] : [],
          ruleKeys: [],
        },
        {
          key: "soluzione",
          label: "Almeno una delle otto soluzioni ammesse",
          status: sol.length ? "confermato" : "ignoto",
          reasons: sol.length
            ? []
            : ["Selezionare una soluzione ammessa e documentarne le caratteristiche."],
          ruleKeys: [],
        },
        duration("cyber_durata_mesi"),
        ...TECH_CHECKS["cyber"]!.map(([k, l]) => check(k, l)),
        ...common("cyber").filter((c) => !c.key.endsWith("fornitore_ict_unitario")),
      ],
    );
  }
  if (yes(a["interesse_cloud"])) {
    const types = selected(a["cloud_sistemi"], ["application", "database", "web", "backup"]);
    if (!types.length)
      warnings.push(
        "Cloud selezionato ma nessuna tipologia VM definita: contributo non determinabile.",
      );
    for (const t of types)
      push(`cloud_${t}`, `Cloud — ${t}`, [`cloud_${t}`, "cloud_rule"], rv(rules, `cloud_${t}`), [
        check(`cloud_${t}_esistente`, "Sistema esistente e in uso"),
        ...TECH_CHECKS["cloud"]!.map(([k, l]) => check(`cloud_${t}_${k}`, l)),
        duration(`cloud_${t}_durata_mesi`),
        ...common(`cloud_${t}`),
        {
          key: "inventario",
          label: "Inventario sistema",
          status: text(a[`cloud_${t}_descrizione`]) ? "confermato" : "ignoto",
          reasons: text(a[`cloud_${t}_descrizione`])
            ? []
            : ["Inventario hardware/software e uso attuale non descritti."],
          ruleKeys: [],
        },
      ]);
  }
  // Una diagnosi assente blocca il progetto. Una diagnosi non verificata non conferma altri interventi.
  const diagStatus =
    size === "piccola" || size === "media"
      ? worst(...diagnosisChecks.map((c) => c.status))
      : "confermato";
  for (const i of iv) {
    i.status = worst(i.status, gateStatus, diagStatus);
    if (gateStatus !== "confermato")
      i.reasons.push("Requisiti soggettivi incompleti o incompatibili.");
    if (diagStatus !== "confermato")
      i.reasons.push("Diagnosi digitale obbligatoria non soddisfatta/verificata.");
    if (i.status === "non_ammissibile") i.theoretical = 0;
  }
  const cap =
    size === "micro"
      ? rv(rules, "max_micro")
      : size === "piccola"
        ? rv(rules, "max_small")
        : size === "media"
          ? rv(rules, "max_medium")
          : null;
  const minimum = rv(rules, "min_project");
  const confirmed = money(
    iv.filter((i) => i.status === "confermato").reduce((n, i) => n + (i.theoretical ?? 0), 0),
  );
  const potential = money(
    iv.filter((i) => i.status !== "non_ammissibile").reduce((n, i) => n + (i.theoretical ?? 0), 0),
  );
  const unknownAmount =
    ["interesse_workplace", "interesse_commerce", "interesse_cloud", "interesse_cyber"].some(
      (k) => a[k] !== "si" && a[k] !== "no",
    ) ||
    iv.some((i) => i.status !== "non_ammissibile" && i.theoretical === null) ||
    (yes(a["interesse_cloud"]) &&
      !selected(a["cloud_sistemi"], ["application", "database", "web", "backup"]).length);
  const granted = nonnegative(a["contributo_concesso"]);
  const capIt = (n: number) =>
    cap === null || residual === null
      ? null
      : money(
          Math.min(
            n,
            cap,
            residual,
            yes(a["progetto_realizzato"]) && granted !== null ? granted : Infinity,
          ),
        );
  const confirmedCapped = capIt(confirmed),
    potentialCapped = unknownAmount ? null : capIt(potential);
  const meetsMinimumConfirmed =
    minimum === null || confirmedCapped === null ? null : confirmedCapped >= minimum;
  const meetsMinimumPotential =
    minimum === null || potentialCapped === null ? null : potentialCapped >= minimum;
  const projectReasons: string[] = [];
  let projectStatus = worst(gateStatus, diagStatus);
  if (microForbidden) {
    projectStatus = "non_ammissibile";
    projectReasons.push(
      "Il progetto micro include contributi A/E vietati: rimuovere le richieste non ammesse.",
    );
  }
  if (!iv.some((i) => i.key !== "diagnosi")) {
    projectStatus =
      ["interesse_workplace", "interesse_commerce", "interesse_cloud", "interesse_cyber"].every(
        (k) => a[k] === "no",
      ) || iv.length > 0
        ? "non_ammissibile"
        : worst(projectStatus, "ignoto");
    projectReasons.push(
      "Nessun intervento B/C/D/E: la sola diagnosi non è un progetto ammissibile.",
    );
  }
  if (iv.some((i) => i.status === "non_ammissibile")) {
    projectStatus = "non_ammissibile";
    projectReasons.push(
      "Il progetto contiene interventi incompatibili: rivedere la composizione prima dell'invio.",
    );
  }
  if (meetsMinimumPotential === false) {
    projectStatus = "non_ammissibile";
    projectReasons.push(
      "Contributo concedibile dopo massimali e de minimis inferiore a 14.000 EUR.",
    );
  }
  if (meetsMinimumPotential === null || iv.some((i) => i.status === "ignoto"))
    projectStatus = worst(projectStatus, "ignoto");
  if (meetsMinimumConfirmed !== true && projectStatus === "confermato")
    projectStatus = "potenziale";
  if (iv.some((i) => i.status === "potenziale")) projectStatus = worst(projectStatus, "potenziale");
  // Nessun preventivo prova l'esecuzione di un intervento né determina la somma forfettaria.
  const documented = money(evidences.reduce((sum, e) => sum + (nonnegative(e.amount) ?? 0), 0));
  warnings.push(
    "Importi delle evidenze = spese/preventivi registrati, non contributo documentato. Il saldo dipende da interventi conformi realizzati e attestati ex post.",
  );
  if (sz.status !== "confermato")
    warnings.push(
      "Dimensione da verificare: anche i valori per tipologia restano scenari condizionati.",
    );
  const score = calculateScore(a, size, sz.status, iv, checklist);
  return {
    version: BANDO_VERSION,
    dossier: evaluateDossier(a, checklist, {
      size,
      score,
      projectStatus,
      interventions: iv,
      potentialCapped,
    }),
    projectStatus,
    projectReasons,
    size,
    sizeStatus: sz.status,
    sizeReasons: sz.reasons,
    gates,
    gateStatus,
    interventions: iv,
    totals: {
      confirmed,
      potential,
      documented,
      cap,
      residual,
      confirmedCapped,
      potentialCapped,
      minimum,
      meetsMinimumConfirmed,
      meetsMinimumPotential,
    },
    score,
    warnings,
  };
}
export function scoreValueAdded(value: number): number {
  return value <= 35000 || value >= 250000
    ? 0
    : value <= 50000
      ? (35 * (value - 35000)) / 15000
      : (35 * (250000 - value)) / 200000;
}
export function scoreEmployees(n: number): number {
  return n >= 100 ? 0 : n <= 20 ? n : (20 * (100 - n)) / 80;
}
function calculateScore(
  a: Answers,
  size: Size | null,
  sizeStatus: Status,
  iv: Intervention[],
  cl: Checklist,
): Result["score"] {
  const employees = nonnegative(a["addetti_inps_luglio_2026"], true);
  const ve = nonnegative(a["iva_ve50_2025"]),
    vf = nonnegative(a["iva_vf25_2025"]),
    income = nonnegative(a["reddito_forfettario_2025"]);
  const oss = nonnegative(a["iva_oss_2025"]),
    editorialSales = nonnegative(a["editoria_vendite_2025"]),
    editorialPurchases = nonnegative(a["editoria_acquisti_2025"]);
  let numerator: number | null = null;
  if (a["regime_fiscale"] === "forfettario") numerator = income;
  else if (a["regime_fiscale"] === "iva" && ve !== null && vf !== null) {
    numerator = ve - vf;
    if (a["vendite_oss"] === "si") numerator = oss === null ? null : numerator + oss;
    else if (a["vendite_oss"] !== "no") numerator = null;
    if (a["integrazione_editoria"] === "si")
      numerator =
        numerator === null || editorialSales === null || editorialPurchases === null
          ? null
          : numerator + editorialSales - editorialPurchases;
    else if (a["integrazione_editoria"] !== "no") numerator = null;
  }
  const c1 =
    numerator === null || employees === null
      ? null
      : scoreValueAdded(numerator / Math.max(employees, 1));
  const c2 = employees === null ? null : scoreEmployees(employees);
  const count = iv.filter((i) => i.key !== "diagnosi" && i.status === "confermato").length;
  const uncertain = iv.some((i) => i.status !== "confermato");
  // Griglia ufficiale, G34: 3 o più (micro), diagnosi + 4 o più (piccole/medie).
  const c3 =
    sizeStatus !== "confermato" || uncertain || !count
      ? null
      : size === "micro"
        ? Math.min(15, count * 5)
        : Math.min(15, Math.max(0, (count - 1) * 5));
  const bonus = (key: string) => (a[key] === "si" ? 10 : a[key] === "no" ? 0 : null);
  const criteria = [
    c1,
    c2,
    c3,
    bonus("cert_genere_valida"),
    bonus("impresa_giovanile"),
    yes(a["cert_ambiente_srg"]) ? null : bonus("cert_ambiente_valida"),
  ];
  const support = [...criteria];
  if (!docOK(cl, "inps_attestazione_luglio_2026")) {
    support[0] = 0;
    support[1] = 0;
  }
  if (
    !docOK(cl, a["regime_fiscale"] === "forfettario" ? "redditi_2025" : "iva_modello_2026") ||
    (a["vendite_oss"] === "si" && !docOK(cl, "iva_oss_2025")) ||
    (a["integrazione_editoria"] === "si" && !docOK(cl, "attestazione_editoria"))
  )
    support[0] = 0;
  if (!docOK(cl, "impresa_giovanile") || !docOK(cl, "visura") || !text(a["giovani_assetto"]))
    support[4] = 0;
  if (!docOK(cl, "cert_genere")) support[3] = 0;
  if (!docOK(cl, "cert_ambiente")) support[5] = 0;
  const sum = (xs: (number | null)[]) =>
    xs.some((x) => x === null) ? null : money(xs.reduce<number>((n, x) => n + (x ?? 0), 0));
  return {
    status:
      (employees === 0 && !docOK(cl, "inps_attestazione_luglio_2026")) ||
      (a["vendite_oss"] === "si" && !docOK(cl, "iva_oss_2025")) ||
      (a["integrazione_editoria"] === "si" && !docOK(cl, "attestazione_editoria"))
        ? "da_verificare"
        : "formula_validata",
    note: "Art. 6: stima 0–100, distinta dai punti sostenuti dalla checklist verificata. Documenti di IVA/INPS/certificazioni assenti annullano i relativi criteri senza integrazione. C3 non determinato se le tipologie non sono verificate. I punti sostenuti sono una stima prudenziale, non un punteggio definitivo; per OSS/editoria non documentata e zero dipendenti verificare il trattamento con Lazio Innova. Bonus giovani sostenuto solo con assetto descritto, visura e checklist verificati. Impresa Giovanile: persone che non hanno compiuto 36 anni alla domanda, con maggioranze previste nell'Appendice 1.",
    inputs: { numerator, employees, types: count },
    criteria: criteria.map((x) => (x === null ? null : money(x))),
    total: sum(criteria),
    supportedTotal: sum(support),
  };
}
export const STATUS_LABEL: Record<Status, string> = {
  confermato: "Coerente con i dati dichiarati",
  potenziale: "Condizionato",
  non_ammissibile: "Incompatibilità rilevata",
  ignoto: "Da verificare",
};
export const SIZE_LABEL: Record<Size, string> = {
  micro: "Micro",
  piccola: "Piccola",
  media: "Media",
  grande: "Grande (non PMI)",
};
