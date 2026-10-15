import type { RuleMap } from "./engine";

export const BANDO_VERSION =
  "Lazio Voucher PMI 2026 · G12616/18-09-2026 · audit documentale 14-10-2026";
export const BANDO_URL =
  "https://www.lazioinnova.it/app/uploads/2026/09/Avviso-Pubblico-Voucher-digitalizzazione-PMI-2026.pdf";
export const NUMERIC_RULES: Record<string, number> = {
  diag_small: 8162.4,
  diag_medium: 21427.2,
  workplace_per_employee: 2270.4,
  commerce_micro: 4954.8,
  commerce_small: 8125.2,
  commerce_medium: 15873.6,
  cloud_application: 17683.2,
  cloud_database: 27656.4,
  cloud_web: 14076,
  cloud_backup: 5593.2,
  cyber_small: 14656.8,
  cyber_medium: 44917.2,
  max_micro: 50000,
  max_small: 100000,
  max_medium: 150000,
  min_project: 14000,
  workplace_categories: 5,
  workplace_min_months: 36,
  de_minimis_cap: 300000,
};
export const WORKPLACE_CATEGORIES = [
  "Produttività personale e utilities",
  "Comunicazione digitale e videoconferenza",
  "Condivisione documenti in cloud / workflow",
  "Firma digitale E conservazione a norma",
  "Servizi ICT unitari: progettazione, configurazione e verifica",
];
const TEXT_RULES: Record<string, string> = {
  workplace_categories: WORKPLACE_CATEGORIES.join("|"),
  sede_lazio:
    "Sede OPERATIVA e attività economica nel Lazio risultanti al Registro; apertura entro richiesta di erogazione solo se descritta, giustificata e documentata in domanda.",
  sme_thresholds:
    "PMI secondo Raccomandazione 2003/361/CE, inclusi aggregazioni e regola dei due esercizi; dimensione alla concessione.",
  ateco_exclusions:
    "Verificare l'attività effettiva, non solo il codice: produzione primaria agricola, pesca/acquacoltura; attività lesive di diritti, difesa vietata, tabacco, ricerche vietate, gioco d'azzardo, commercio sessuale, sperimentazione animale non conforme, attività illegali, centrali nucleari. Appendice 1.",
  diag_rule:
    "Piccole/medie: modello 1, Innovation Manager qualificato e indipendente, ex ante prima degli interventi e non oltre 3 mesi prima della domanda; ex post stesso professionista salvo forza maggiore. Micro: modello 2 ex ante obbligatorio, nessun contributo diagnosi.",
  commerce_tech:
    "Tutte 3 categorie: IaaS/PaaS, dominio e SSL, ICT + supporto 36 mesi; nuova adozione o rifacimento di soluzione realizzata oltre 3 anni prima della domanda. Semplice SaaS escluso.",
  cloud_rule:
    "Applicazioni già in uso su server locali dell'impresa verso cloud pubblico. Esclusi client su PC individuali e sistemi già cloud. Tre categorie e componenti Appendice 4.D; almeno 36 mesi.",
  cyber_sizes:
    "Solo piccole/medie: almeno una delle 8 soluzioni Appendice 4.E, tutte le categorie obbligatorie, nuova adozione, 36 mesi, esperto qualificato indipendente.",
  score_formula:
    "Articolo 6: 35 + 20 + 15 + 10 + 10 + 10 = 100 punti. IVA 2026 periodo 2025 e forza aziendale INPS luglio 2026; documenti mancanti azzerano i criteri corrispondenti.",
};
const RULE_LABELS: Record<string, string> = {
  diag_small: "Diagnosi digitale – piccola",
  diag_medium: "Diagnosi digitale – media",
  workplace_per_employee: "Digital Workplace per postazione",
  commerce_micro: "Commerce – micro",
  commerce_small: "Commerce – piccola",
  commerce_medium: "Commerce – media",
  cloud_application: "Cloud Application Server",
  cloud_database: "Cloud Database Server",
  cloud_web: "Cloud Web Server",
  cloud_backup: "Cloud Database Backup",
  cyber_small: "Cyber Security – piccola",
  cyber_medium: "Cyber Security – media",
  max_micro: "Massimale micro",
  max_small: "Massimale piccola",
  max_medium: "Massimale media",
  min_project: "Contributo minimo progetto",
  workplace_categories: "Categorie obbligatorie Workplace",
  workplace_min_months: "Durata minima Workplace",
  de_minimis_cap: "Massimale de minimis Impresa Unica",
  sede_lazio: "Sede operativa Lazio",
  sme_thresholds: "Dimensione PMI",
  ateco_exclusions: "Attività escluse",
  diag_rule: "Requisiti diagnosi",
  commerce_tech: "Requisiti Commerce",
  cloud_rule: "Requisiti Cloud",
  cyber_sizes: "Requisiti Cyber Security",
  score_formula: "Criteri di punteggio",
};
/** Baseline ufficiale versionata. Nessuna scrittura sul database reale. */
export const OFFICIAL_RULES: RuleMap = Object.fromEntries(
  [...new Set([...Object.keys(NUMERIC_RULES), ...Object.keys(TEXT_RULES)])].map((key) => [
    key,
    {
      key,
      category: "Avviso 2026",
      label: RULE_LABELS[key] ?? key,
      value: NUMERIC_RULES[key] ?? null,
      value_text: TEXT_RULES[key] ?? null,
      unit: key.includes("months")
        ? "mesi"
        : key === "workplace_categories"
          ? "categorie"
          : key in NUMERIC_RULES
            ? "EUR"
            : null,
      source: BANDO_URL,
      reference: key.includes("score")
        ? "Art. 6; Appendice 1"
        : key.includes("cap") || key.startsWith("max_") || key === "min_project"
          ? "Artt. 1, 4, 5"
          : "Artt. 1, 4, 5; Appendici 1, 4",
      status: "validata",
      requires_official_check: false,
      review_notes: BANDO_VERSION,
    },
  ]),
);

// Requisiti distinti: una risposta generica non sostituisce la verifica delle singole condizioni.
export const GENERAL_CHECKS = [
  [
    "unica_pmi_progetto",
    "Progetto realizzato da una sola PMI e un solo progetto finanziato per PMI",
  ],
  [
    "aggiornamenti_requisiti",
    "Variazioni dei requisiti comunicate tempestivamente a Lazio Innova aggiornando le dichiarazioni",
  ],
  [
    "delocalizzazione_assente",
    "Nessuna delocalizzazione nei due anni precedenti o prevista dal progetto (art. 4)",
  ],
  [
    "polizza_catastrofale",
    "Polizza catastrofale valida o esenzione motivata con modello 3 (domanda e concessione)",
  ],
  [
    "esclusione_incentivi_assente",
    "Nessuna esclusione ex art. 16(3) Codice Incentivi per delocalizzazione",
  ],
  [
    "condanne_assenti",
    "Nessuna condanna ostativa ex art. 94 D.Lgs. 36/2023 per tutti i soggetti rilevanti",
  ],
  ["sanzioni_assenti", "Nessuna sanzione interdittiva o divieto di contrarre con la PA"],
  ["decadenze_assenti", "Nessuna decadenza per dichiarazioni mendaci nei due anni precedenti"],
  ["pantouflage_assente", "Nessun incarico vietato ad ex dipendenti Regione Lazio / Lazio Innova"],
  [
    "obblighi_lavoro_ambiente",
    "Rispetto CCNL, sicurezza, disabili, pari opportunità, lavoro regolare e ambiente",
  ],
  [
    "obblighi_mantenimento",
    "Piano di rispetto: contratti 3 anni; attività 3 anni, Lazio 5 anni, SEE 10 anni dall'erogazione; archivi 5 anni, controlli, CUP, pubblicità e DNSH",
  ],
  [
    "privacy_informativa",
    "Informativa Appendice 3 resa nota a tutte le persone di cui si trasmettono dati",
  ],
] as const;
export const TECH_CHECKS: Record<string, readonly (readonly [string, string])[]> = {
  workplace: [
    [
      "workplace_nuova_adozione",
      "Tutte le categorie sono nuove adozioni, senza rinnovi né upgrade",
    ],
    [
      "workplace_firma_conservazione",
      "La categoria 4 comprende firma digitale E conservazione a norma",
    ],
  ],
  commerce: [
    [
      "commerce_nuova_o_oltre3anni",
      "Nuova adozione o rifacimento integrale di soluzione realizzata oltre 3 anni prima della domanda",
    ],
    [
      "commerce_piattaforma",
      "Piattaforma IaaS/PaaS con funzionalità ammesse di commerce/engagement",
    ],
    ["commerce_dominio_ssl", "Dominio e certificato SSL inclusi"],
    [
      "commerce_ict_supporto",
      "Progettazione, configurazione, personalizzazione, verifica e supporto specialistico 36 mesi inclusi",
    ],
  ],
  cyber: [
    ["cyber_nuova_adozione", "Soluzioni di nuova adozione, non già installate"],
    [
      "cyber_hardware",
      "Hardware di sicurezza incluso, oppure incompatibilità motivata ex ante (nota 14)",
    ],
    ["cyber_software", "Software/licenze o servizi cloud di sicurezza e manutenzione inclusi"],
    ["cyber_outsourcing", "Servizi di sicurezza gestiti in outsourcing inclusi"],
    [
      "cyber_esperto",
      "Esperto indipendente con CISSP/CISA/CISM/SSCP o certificazione internazionale idonea firma la diagnosi; corso di formazione non sufficiente",
    ],
  ],
  cloud: [
    [
      "server_locale",
      "Applicazione propria già utilizzata su server locale dell'impresa (non solo PC individuale né SaaS/cloud)",
    ],
    [
      "pubblico",
      "Destinazione su cloud pubblico, con tipologia VM conforme alle definizioni dell'Appendice 1",
    ],
    [
      "sei_servizi",
      "Tutti i 6 servizi cloud della lettera a inclusi, o incompatibilità specifiche motivate ex ante (nota 12)",
    ],
    [
      "software_gestione",
      "Software di gestione/amministrazione e manutenzione della lettera b inclusi",
    ],
    [
      "ict_completo",
      "Tutte le attività ICT lettera c incluse: migrazione, configurazione, testing, validazione, formazione e supporto 36 mesi; esclusioni motivate ex ante (nota 13)",
    ],
    ["nuova_adozione", "Tutte le tre categorie sono di nuova adozione"],
  ],
};
export const COMMON_TECH_CHECKS = [
  [
    "fornitore_ict_unitario",
    "Servizi ICT prestati unitariamente da un unico soggetto per l'intervento",
  ],
  [
    "acquisto_impresa",
    "Acquisti dell'impresa e strumentali all'attività, contratti validi, regolarmente fatturati e pagati alla richiesta di saldo",
  ],
  [
    "avvio_successivo",
    "Adozione dopo la domanda e dopo la diagnosi ex ante, se successiva (diagnosi esclusa)",
  ],
] as const;
export const CYBER_SOLUTIONS = [
  "Identità e accessi",
  "Sicurezza rete",
  "Sicurezza endpoint",
  "Sicurezza dati",
  "Gestione vulnerabilità",
  "Analisi sicurezza",
  "Sicurezza applicazioni",
  "Rischio e conformità",
];
