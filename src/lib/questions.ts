import {
  GENERAL_CHECKS,
  TECH_CHECKS,
  COMMON_TECH_CHECKS,
  CYBER_SOLUTIONS,
  WORKPLACE_CATEGORIES,
} from "./bando";
import { classifySize, type Answers, type RuleMap } from "./engine";

export type QType = "text" | "number" | "tri" | "select" | "multi" | "textarea";

export interface Question {
  id: string;
  label: string;
  type: QType;
  help?: string;
  options?: { value: string; label: string }[];
  showIf?: (a: Answers) => boolean;
}

export interface Step {
  id: string;
  title: string;
  intro?: string;
  questions: (rules: RuleMap) => Question[];
  info?: (a: Answers) => string | null;
}

const is = (k: string, v: string) => (a: Answers) => a[k] === v;
const isAny = (k: string, vs: string[]) => (a: Answers) => vs.includes(String(a[k]));
const sizeOf = (a: Answers) => classifySize(a).size;

export const STEPS: Step[] = [
  {
    id: "anagrafica",
    title: "Anagrafica",
    questions: () => [
      { id: "ragione_sociale", label: "Ragione sociale", type: "text" },
      { id: "partita_iva", label: "Partita IVA", type: "text" },
      {
        id: "codice_fiscale",
        label: "Codice fiscale (se diverso dalla P.IVA)",
        type: "text",
      },
      { id: "forma_giuridica", label: "Forma giuridica", type: "text" },
      { id: "pec", label: "PEC", type: "text" },
      { id: "email", label: "Email aziendale", type: "text" },
      { id: "telefono", label: "Telefono aziendale", type: "text" },
      {
        id: "sede_legale_indirizzo",
        label: "Indirizzo sede legale",
        type: "text",
      },
      {
        id: "iscritta_attiva",
        label: "L'impresa è iscritta al Registro Imprese e attiva?",
        type: "tri",
      },
    ],
  },
  {
    id: "sede",
    title: "Sede nel Lazio",
    questions: () => [
      {
        id: "sede_lazio",
        label: "Ha sede legale o operativa nel Lazio?",
        type: "tri",
      },
      {
        id: "sede_lazio_entro_termine",
        label: "Si impegna ad aprire una sede nel Lazio entro il termine previsto dall'Avviso?",
        type: "tri",
        showIf: is("sede_lazio", "no"),
      },
      {
        id: "comune_sede",
        label: "Comune della sede nel Lazio",
        type: "text",
        showIf: (a) => a["sede_operativa_lazio"] === "si" || a["sede_lazio_entro_termine"] === "si",
      },
    ],
  },
  {
    id: "ateco",
    title: "ATECO",
    questions: () => [
      {
        id: "ateco_codice",
        label: "Codice ATECO prevalente (sede nel Lazio)",
        type: "text",
      },
      {
        id: "ateco_escluso",
        label: "Il codice rientra tra i settori esclusi dall'Avviso?",
        type: "tri",
        help: "Confrontare con l'elenco ufficiale delle esclusioni (regola 'Settori ATECO esclusi').",
      },
    ],
  },
  {
    id: "dimensione",
    title: "Dimensione PMI",
    intro: "Inserire ULA, fatturato e totale attivo per gli esercizi 2025 e 2024.",
    questions: () => [
      { id: "ula_2025", label: "ULA 2025", type: "number" },
      {
        id: "fatturato_2025",
        label: "Fatturato 2025 (EUR)",
        type: "number",
      },
      {
        id: "attivo_2025",
        label: "Totale attivo 2025 (EUR)",
        type: "number",
      },
      { id: "ula_2024", label: "ULA 2024", type: "number" },
      {
        id: "fatturato_2024",
        label: "Fatturato 2024 (EUR)",
        type: "number",
      },
      {
        id: "attivo_2024",
        label: "Totale attivo 2024 (EUR)",
        type: "number",
      },
      {
        id: "ha_associate_collegate",
        label: "L'impresa ha imprese associate o collegate?",
        type: "tri",
      },
      {
        id: "associate_descrizione",
        label: "Descrivere le imprese associate/collegate e le quote",
        type: "textarea",
        showIf: is("ha_associate_collegate", "si"),
      },
      {
        id: "dati_aggregati_disponibili",
        label: "Sono disponibili i dati aggregati del gruppo?",
        type: "tri",
        showIf: is("ha_associate_collegate", "si"),
      },
      ...(["2025", "2024"] as const).flatMap((y) => [
        {
          id: `ula_agg_${y}`,
          label: `ULA aggregate ${y}`,
          type: "number" as const,
          showIf: (a: Answers) =>
            a["ha_associate_collegate"] === "si" && a["dati_aggregati_disponibili"] === "si",
        },
        {
          id: `fatturato_agg_${y}`,
          label: `Fatturato aggregato ${y}`,
          type: "number" as const,
          showIf: (a: Answers) =>
            a["ha_associate_collegate"] === "si" && a["dati_aggregati_disponibili"] === "si",
        },
        {
          id: `attivo_agg_${y}`,
          label: `Totale attivo aggregato ${y}`,
          type: "number" as const,
          showIf: (a: Answers) =>
            a["ha_associate_collegate"] === "si" && a["dati_aggregati_disponibili"] === "si",
        },
      ]),
    ],
  },
  {
    id: "aiuti",
    title: "De minimis e altri voucher",
    questions: () => [
      {
        id: "de_minimis_ricevuti",
        label: "Ha ricevuto aiuti de minimis nel periodo di riferimento?",
        type: "tri",
      },
      {
        id: "de_minimis_importo",
        label: "Importo de minimis ricevuto (EUR, da RNA)",
        type: "number",
        showIf: is("de_minimis_ricevuti", "si"),
      },
      {
        id: "altri_voucher",
        label: "Ha ottenuto o richiesto altri voucher/agevolazioni per la digitalizzazione?",
        type: "tri",
      },
      {
        id: "altri_voucher_descrizione",
        label: "Quali?",
        type: "textarea",
        showIf: is("altri_voucher", "si"),
      },
      {
        id: "stesse_spese",
        label: "Riguardano le stesse spese di questo progetto?",
        type: "tri",
        showIf: is("altri_voucher", "si"),
      },
    ],
  },
  {
    id: "requisiti",
    title: "Requisiti generali",
    questions: () => [
      {
        id: "durc_regolare",
        label: "DURC regolare?",
        type: "tri",
      },
      {
        id: "impresa_difficolta",
        label: "L'impresa è in difficoltà ai sensi della normativa UE?",
        type: "tri",
      },
      {
        id: "procedure_concorsuali",
        label: "Sono in corso procedure concorsuali o liquidazione?",
        type: "tri",
      },
    ],
  },
  {
    id: "diagnosi",
    title: "Diagnosi digitale",
    info: (a) => {
      const s = sizeOf(a);
      if (s === "micro") return "Micro impresa: la diagnosi digitale non è ammissibile.";
      if (s === "piccola" || s === "media")
        return "Piccola/media impresa: la diagnosi digitale è obbligatoria.";
      return "Dimensione non ancora determinata: completare la sezione Dimensione PMI.";
    },
    questions: () => [
      {
        id: "diagnosi_prevista",
        label: "Il progetto prevede la diagnosi digitale?",
        type: "tri",
        showIf: (a) => ["piccola", "media"].includes(String(sizeOf(a))),
      },
    ],
  },
  {
    id: "workplace",
    title: "Digital Workplace",
    questions: () => {
      const labels = WORKPLACE_CATEGORIES;

      return [
        {
          id: "interesse_workplace",
          label: "Interesse per Digital Workplace?",
          type: "tri",
        },
        {
          id: "sw_attuali",
          label: "Software attualmente in uso (postazioni, collaboration, gestionali…)",
          type: "textarea",
          showIf: is("interesse_workplace", "si"),
        },
        {
          id: "sw_nuovi",
          label: "Nuovi software/servizi previsti",
          type: "textarea",
          showIf: is("interesse_workplace", "si"),
        },
        {
          id: "workplace_categorie",
          label: "Categorie obbligatorie coperte",
          type: "multi",
          options: labels.map((l, i) => ({
            value: `c${i + 1}`,
            label: l.trim(),
          })),
          showIf: is("interesse_workplace", "si"),
          help: "Appendice 4.B: tutte le cinque categorie, senza rinnovi o upgrade.",
        },
        {
          id: "workplace_durata_mesi",
          label: "Durata licenze/servizi (mesi)",
          type: "number",
          showIf: is("interesse_workplace", "si"),
        },
        {
          id: "addetti_inps_luglio_2026",
          label: "Addetti INPS a luglio 2026",
          type: "number",
          showIf: is("interesse_workplace", "si"),
        },
      ];
    },
  },
  {
    id: "commerce",
    title: "Digital Commerce",
    questions: () => [
      {
        id: "interesse_commerce",
        label: "Interesse per Digital Commerce?",
        type: "tri",
      },
      {
        id: "commerce_attuale",
        label: "Canali di vendita digitali attuali",
        type: "textarea",
        showIf: is("interesse_commerce", "si"),
      },
      {
        id: "commerce_tipo",
        label: "Architettura della soluzione proposta",
        type: "select",
        showIf: is("interesse_commerce", "si"),
        options: [
          { value: "iaas", label: "Su infrastruttura IaaS" },
          { value: "paas", label: "Su piattaforma PaaS" },
          { value: "saas", label: "Semplice abbonamento SaaS" },
          { value: "nonso", label: "Non ancora definita" },
        ],
      },
      {
        id: "commerce_requisiti_confermati",
        label: "Il fornitore documenta i requisiti tecnici IaaS/PaaS?",
        type: "tri",
        showIf: isAny("commerce_tipo", ["iaas", "paas"]),
      },
      {
        id: "commerce_descrizione",
        label: "Descrizione tecnica (hosting, personalizzazioni, integrazioni)",
        type: "textarea",
        showIf: isAny("commerce_tipo", ["iaas", "paas"]),
      },
    ],
  },
  {
    id: "cyber",
    title: "Cybersecurity",
    info: (a) =>
      sizeOf(a) === "micro" ? "Micro impresa: la linea Cybersecurity non è ammissibile." : null,
    questions: () => [
      {
        id: "interesse_cyber",
        label: "Interesse per Cybersecurity?",
        type: "tri",
        showIf: (a) => sizeOf(a) !== "micro",
      },
      {
        id: "cyber_attuale",
        label: "Misure di sicurezza attuali",
        type: "textarea",
        showIf: is("interesse_cyber", "si"),
      },
      {
        id: "cyber_perimetro_definito",
        label: "Perimetro e servizi di sicurezza sono definiti?",
        type: "tri",
        showIf: is("interesse_cyber", "si"),
      },
    ],
  },
  {
    id: "cloud",
    title: "Migrazione Cloud",
    intro:
      "Ammissibili solo migrazioni REALI di sistemi esistenti (server applicativi, database, web, backup).",
    questions: () => [
      {
        id: "interesse_cloud",
        label: "Interesse per migrazione in cloud?",
        type: "tri",
      },
      {
        id: "gia_cloud",
        label: "L'impresa utilizza già il cloud?",
        type: "select",
        showIf: is("interesse_cloud", "si"),
        options: [
          { value: "no", label: "No, sistemi on-premise" },
          { value: "parziale", label: "In parte" },
          { value: "si", label: "Sì, interamente" },
        ],
      },
      {
        id: "sistemi_locali_residui",
        label: "Esistono sistemi locali residui (server, NAS, DB in sede)?",
        type: "tri",
        showIf: (a) => a["interesse_cloud"] === "si" && isAny("gia_cloud", ["si", "parziale"])(a),
      },
      {
        id: "sistemi_residui_descrizione",
        label: "Inventario sistemi locali residui",
        type: "textarea",
        showIf: is("sistemi_locali_residui", "si"),
      },
      {
        id: "cloud_sistemi",
        label: "Sistemi esistenti da migrare",
        type: "multi",
        showIf: (a) =>
          a["interesse_cloud"] === "si" &&
          (a["gia_cloud"] === "no" || a["sistemi_locali_residui"] === "si"),
        options: [
          { value: "application", label: "Application server" },
          { value: "database", label: "Database" },
          { value: "web", label: "Web server" },
          { value: "backup", label: "Backup" },
        ],
      },
      ...(["application", "database", "web", "backup"] as const).flatMap((t) => [
        {
          id: `cloud_${t}_esistente`,
          label: `${
            t === "application"
              ? "Application server"
              : t === "database"
                ? "Database"
                : t === "web"
                  ? "Web server"
                  : "Backup"
          }: il sistema esiste oggi ed è in uso?`,
          type: "tri" as const,
          showIf: (a: Answers) =>
            a["interesse_cloud"] === "si" &&
            Array.isArray(a["cloud_sistemi"]) &&
            (a["cloud_sistemi"] as string[]).includes(t),
        },
        {
          id: `cloud_${t}_descrizione`,
          label: "Descrizione sistema attuale (hw, sw, dimensioni)",
          type: "textarea" as const,
          showIf: (a: Answers) =>
            a["interesse_cloud"] === "si" &&
            Array.isArray(a["cloud_sistemi"]) &&
            (a["cloud_sistemi"] as string[]).includes(t) &&
            a[`cloud_${t}_esistente`] === "si",
        },
      ]),
    ],
  },
  {
    id: "punteggio",
    title: "Dati per punteggio",
    intro:
      "La formula di punteggio non è verificata: i dati vengono raccolti ma nessun punteggio viene calcolato.",
    questions: () => [
      {
        id: "iva_volume_2025",
        label: "Volume d'affari IVA 2025 (EUR)",
        type: "number",
      },
      {
        id: "inps_addetti_2025",
        label: "Addetti INPS 2025 (media)",
        type: "number",
      },
      {
        id: "premialita",
        label: "Possibili criteri premiali (descrizione)",
        type: "textarea",
      },
    ],
  },
];

// Le domande aggiuntive usano nuovi identificativi: i vecchi "sì" generici non
// vengono reinterpretati come verifiche tecniche più rigorose.
function extend(id: string, additions: Question[], remove: string[] = []) {
  const step = STEPS.find((s) => s.id === id)!;
  const previous = step.questions;
  step.questions = (rules) => [
    ...previous(rules).filter((q) => !remove.includes(q.id)),
    ...additions,
  ];
}
const tq = (id: string, label: string, showIf?: Question["showIf"], help?: string): Question => ({
  id,
  label,
  type: "tri",
  ...(showIf ? { showIf } : {}),
  ...(help ? { help } : {}),
});
const nq = (id: string, label: string, showIf?: Question["showIf"]): Question => ({
  id,
  label,
  type: "number",
  ...(showIf ? { showIf } : {}),
});
extend("anagrafica", [
  tq(
    "registro_ue",
    "Se non iscritta in Italia: è iscritta al registro di un altro Stato dello Spazio Economico Europeo (SEE)?",
    is("iscritta_attiva", "no"),
  ),
  tq(
    "registro_italiano_entro_saldo",
    "Iscrizione italiana prevista entro richiesta di saldo e documenti equipollenti/rappresentante italiano predisposti?",
    is("registro_ue", "si"),
  ),
]);
extend(
  "sede",
  [
    tq(
      "sede_operativa_lazio",
      "Sede OPERATIVA nel Lazio e attività oggetto dell'aiuto risultano al Registro Imprese?",
    ),
    tq(
      "sede_lazio_entro_termine",
      "Apertura e attività saranno acquisite entro richiesta di erogazione?",
      is("sede_operativa_lazio", "no"),
    ),
    tq(
      "apertura_sede_documentata",
      "L'apertura e l'attività sono descritte, giustificate e documentate già in domanda?",
      is("sede_lazio_entro_termine", "si"),
    ),
  ],
  ["sede_lazio", "sede_lazio_entro_termine"],
);
extend("ateco", [
  tq(
    "attivita_esclusioni_verificate",
    "Sono verificate le attività effettive rispetto a TUTTE le esclusioni dell'Appendice 1?",
    undefined,
    "Produzione primaria agricola/pesca, tabacco, gioco d'azzardo, commercio sessuale, diritti umani, difesa vietata, ricerche vietate, sperimentazione animale non conforme, attività illegali e nucleare. Il solo codice ATECO non certifica l'ammissibilità.",
  ),
]);
extend("dimensione", [
  tq(
    "operazioni_straordinarie",
    "Fusioni, acquisizioni o altre operazioni straordinarie rilevanti per la dimensione?",
    undefined,
    "Se sì: dimensione da verificare con modelli 5/6 e consulente; non basta la regola dei due esercizi.",
  ),
]);
extend(
  "aiuti",
  [
    nq(
      "de_minimis_impresa_unica",
      "Aiuti de minimis CONCESSI all'Impresa Unica nei tre anni mobili alla concessione (EUR, indicare anche zero)",
    ),
    tq(
      "de_minimis_verificato",
      "Verificati RNA, perimetro Impresa Unica, altri aiuti e operazioni societarie?",
    ),
    tq(
      "doppio_finanziamento_assente",
      "Assenti altri aiuti pubblici sugli interventi e sui costi coperti dalle somme forfettarie?",
    ),
    tq(
      "precedenti_voucher_lazio",
      "Ottenuto contributo sui precedenti Avvisi Voucher Digitalizzazione PMI Lazio?",
    ),
    tq(
      "precedenti_erogazione_presentata",
      "Richiesta di erogazione del precedente voucher già PRESENTATA alla data della nuova domanda?",
      is("precedenti_voucher_lazio", "si"),
    ),
    tq(
      "precedenti_tipologie_complete",
      "Elenco completo delle tipologie già concesse verificato?",
      is("precedenti_voucher_lazio", "si"),
    ),
    {
      id: "precedenti_tipologie",
      label: "Tipologie già finanziate (escluse dalla nuova domanda anche con spese diverse)",
      type: "multi",
      showIf: is("precedenti_voucher_lazio", "si"),
      options: [
        "diagnosi",
        "workplace",
        "commerce",
        "cloud_application",
        "cloud_database",
        "cloud_web",
        "cloud_backup",
        "cyber",
      ].map((value) => ({ value, label: value })),
    },
  ],
  [
    "de_minimis_ricevuti",
    "de_minimis_importo",
    "altri_voucher",
    "altri_voucher_descrizione",
    "stesse_spese",
  ],
);
extend(
  "requisiti",
  GENERAL_CHECKS.map(([id, label]) => tq(id, label)),
  ["impresa_difficolta"],
);
extend("diagnosi", [
  tq(
    "diagnosi_manager",
    "Manager qualificato UNI 11814 con accreditamento o albo MIMIT settore 8; persona e società indipendenti; modello 1 e stesso professionista ex post salvo forza maggiore?",
    (a) => ["piccola", "media"].includes(String(sizeOf(a))),
  ),
  tq(
    "diagnosi_tempi",
    "Diagnosi ex ante prima degli interventi, non oltre tre mesi prima della domanda e inviata entro termine Atto di Impegno?",
    (a) => ["piccola", "media"].includes(String(sizeOf(a))),
  ),
  tq(
    "diagnosi_contributo_micro",
    "Richiede il contributo A Diagnosi (vietato alle micro, anche quando una diagnosi sostituisce il modello 2)?",
    (a) => sizeOf(a) === "micro",
  ),
  tq(
    "relazione_micro_exante",
    "Modello 2 ex ante (o diagnosi equivalente) completo allegato alla domanda?",
    (a) => sizeOf(a) === "micro",
  ),
  tq(
    "fornitore_micro_unico",
    "Unico soggetto ICT per TUTTI gli interventi e firma ex post della Relazione sulla Digitalizzazione?",
    (a) => sizeOf(a) === "micro",
  ),
]);
for (const prefix of ["workplace", "commerce", "cyber"]) {
  const show = is(`interesse_${prefix}`, "si");
  extend(prefix, [
    ...TECH_CHECKS[prefix]!.map(([id, label]) => tq(id, label, show)),
    ...COMMON_TECH_CHECKS.filter(
      ([id]) => prefix !== "cyber" || id !== "fornitore_ict_unitario",
    ).map(([id, label]) => tq(`${prefix}_${id}`, label, show)),
    ...(prefix === "workplace"
      ? []
      : [
          nq(
            `${prefix}_durata_mesi`,
            "Durata minima di tutti i servizi ricorrenti (mesi, almeno 36)",
            show,
          ),
        ]),
  ]);
}
extend(
  "workplace",
  [
    nq(
      "workplace_postazioni",
      "Postazioni Digital Workplace effettivamente acquistate (intero)",
      is("interesse_workplace", "si"),
    ),
    tq(
      "inps_accentrato",
      "Posizione INPS accentrata comprende addetti di sedi fuori Lazio?",
      is("interesse_workplace", "si"),
    ),
    nq(
      "addetti_lazio_documentati",
      "Limite addetti Lazio da Registro o quantificazione alternativa allegata in domanda",
      (a) => a["interesse_workplace"] === "si" && a["inps_accentrato"] === "si",
    ),
    tq(
      "addetti_lazio_verificati",
      "Quantificazione del limite Lazio documentata e verificata?",
      (a) => a["interesse_workplace"] === "si" && a["inps_accentrato"] === "si",
    ),
  ],
  ["addetti_inps_luglio_2026"],
);
extend("cyber", [
  {
    id: "cyber_soluzioni",
    label: "Soluzioni nuove da adottare (almeno una)",
    type: "multi",
    options: CYBER_SOLUTIONS.map((label, i) => ({ value: `s${i + 1}`, label })),
    showIf: is("interesse_cyber", "si"),
  },
]);
for (const t of ["application", "database", "web", "backup"]) {
  const show = (a: Answers) =>
    a["interesse_cloud"] === "si" &&
    Array.isArray(a["cloud_sistemi"]) &&
    a["cloud_sistemi"].includes(t);
  extend("cloud", [
    ...TECH_CHECKS["cloud"]!.map(([id, label]) => tq(`cloud_${t}_${id}`, `${t}: ${label}`, show)),
    nq(`cloud_${t}_durata_mesi`, `${t}: durata minima di tutti i servizi ricorrenti (mesi)`, show),
    ...COMMON_TECH_CHECKS.map(([id, label]) => tq(`cloud_${t}_${id}`, `${t}: ${label}`, show)),
  ]);
}
const scoreStep = STEPS.find((s) => s.id === "punteggio")!;
scoreStep.intro =
  "Art. 6: punteggio stimato 0–100. La checklist verificata determina i punti sostenuti dai documenti; non si tratta del punteggio attribuito da Lazio Innova.";
scoreStep.questions = () => [
  nq(
    "addetti_inps_luglio_2026",
    "Forza Aziendale dell'Attestazione della denuncia contributiva INPS LUGLIO 2026 (intero, anche zero)",
    undefined,
  ),
  {
    id: "regime_fiscale",
    label: "Regime fiscale",
    type: "select",
    options: [
      { value: "iva", label: "IVA" },
      { value: "forfettario", label: "Forfettario" },
    ],
  },
  nq(
    "iva_ve50_2025",
    "Modello IVA 2026, periodo 2025: VE50 Volume d'affari (EUR)",
    is("regime_fiscale", "iva"),
  ),
  nq(
    "iva_vf25_2025",
    "Modello IVA 2026, periodo 2025: VF25 imponibile Totale Acquisti (EUR)",
    is("regime_fiscale", "iva"),
  ),
  nq(
    "reddito_forfettario_2025",
    "Reddito imponibile impresa 2025 (EUR)",
    is("regime_fiscale", "forfettario"),
  ),
  tq(
    "vendite_oss",
    "Vendite in regime IVA OSS nel 2025 da integrare?",
    is("regime_fiscale", "iva"),
  ),
  nq(
    "iva_oss_2025",
    "Vendite OSS 2025 (EUR), allegare dichiarazioni trimestrali",
    is("vendite_oss", "si"),
  ),
  tq(
    "integrazione_editoria",
    "Integrazione vendite/acquisti prodotti editoriali con IVA assolta a monte?",
    is("regime_fiscale", "iva"),
  ),
  nq(
    "editoria_vendite_2025",
    "Vendite editoriali integrative 2025 (EUR)",
    is("integrazione_editoria", "si"),
  ),
  nq(
    "editoria_acquisti_2025",
    "Acquisti editoriali integrativi 2025 (EUR)",
    is("integrazione_editoria", "si"),
  ),
  tq(
    "cert_genere_valida",
    "UNI/PdR 125:2022 da organismo accreditato Accredia, valida alla domanda e attestazione allegata?",
  ),
  tq(
    "impresa_giovanile",
    "Impresa Giovanile ai sensi dell'Appendice 1 alla domanda?",
    undefined,
    "Giovani: non hanno ancora compiuto 36 anni. Società capitali: maggioranza quote e amministratori; cooperative/persone: maggioranza soci; individuale: titolare.",
  ),
  tq(
    "cert_ambiente_valida",
    "Certificazione ambientale ammessa, valida alla domanda e attestazione allegata?",
    undefined,
    "Appendice 1: EMAS/ISO14000, ISO50001, Ecolabel UE, FSC/PEFC, ISO14064-1/14067, ISO14040, EPD ISO14025, ISO20400, PEF/OEF, Remade in Italy.",
  ),
];
STEPS.push({
  id: "procedura",
  title: "Domanda e saldo",
  intro:
    "Le spunte documentali rappresentano una verifica dell'operatore, non una verifica automatica del contenuto dei file o delle banche dati pubbliche.",
  questions: () => [
    tq("domanda_inviata", "Domanda già inviata?"),
    {
      id: "domanda_timestamp",
      label: "Data/ora della PEC GeCoWEB (ISO con fuso, es. 2026-10-09T13:00:00+02:00)",
      type: "text",
      showIf: is("domanda_inviata", "si"),
    },
    tq(
      "domanda_gecoweb_regolare",
      "Formulario finalizzato, file generato e firmato digitalmente, invio via GeCoWEB e PEC confermata?",
      is("domanda_inviata", "si"),
    ),
    tq(
      "saldo_entro_sei_mesi",
      "Piano di conclusione, configurazione/installazione e richiesta saldo completa entro 6 mesi dalla concessione?",
    ),
  ],
});

extend("procedura", [
  tq("progetto_realizzato", "Progetto già realizzato (controllare anche le date effettive)?"),
  ...[
    ["data_concessione", "Data concessione (pubblicazione BUR)"],
    ["data_conclusione", "Data conclusione di tutti gli interventi"],
    ["data_richiesta_saldo", "Data della richiesta di erogazione"],
    ["data_diagnosi_exante", "Data sottoscrizione diagnosi ex ante (piccole/medie)"],
  ].map(([id, label]) => ({
    id: id!,
    label: `${label} — YYYY-MM-DD`,
    type: "text" as const,
    showIf: is("progetto_realizzato", "si"),
  })),
]);
for (const prefix of [
  "workplace",
  "commerce",
  "cyber",
  "cloud_application",
  "cloud_database",
  "cloud_web",
  "cloud_backup",
]) {
  extend("procedura", [
    {
      id: `${prefix}_data_avvio`,
      label: `${prefix}: prima data di adozione/acquisto componenti — YYYY-MM-DD`,
      type: "text",
      showIf: (a) =>
        a["progetto_realizzato"] === "si" &&
        (prefix.startsWith("cloud_")
          ? a["interesse_cloud"] === "si" &&
            Array.isArray(a["cloud_sistemi"]) &&
            a["cloud_sistemi"].includes(prefix.slice(6))
          : a[`interesse_${prefix}`] === "si"),
    },
  ]);
}

export function isIntegerQuestion(id: string) {
  return /durata_mesi|postazioni|addetti/.test(id);
}

// Una risposta storica a un quesito generico non sostituisce i nuovi controlli.
extend("commerce", [], ["commerce_requisiti_confermati"]);
extend("cyber", [], ["cyber_perimetro_definito"]);
extend("cloud", [], ["gia_cloud", "sistemi_locali_residui", "sistemi_residui_descrizione"]);
for (const step of STEPS) {
  const previous = step.questions;
  step.questions = (rules) =>
    previous(rules).map((q) =>
      q.id === "cloud_sistemi"
        ? { ...q, showIf: is("interesse_cloud", "si") }
        : q.id === "interesse_cyber"
          ? {
              ...q,
              showIf: () => true,
              help: "Contributo E non ammesso alle micro: scegliere No per rimuoverlo dal progetto.",
            }
          : q.id === "commerce_descrizione"
            ? {
                ...q,
                showIf: (a) =>
                  a["interesse_commerce"] === "si" && isAny("commerce_tipo", ["iaas", "paas"])(a),
              }
            : q,
    );
}

extend("procedura", [
  tq(
    "conflitti_interesse",
    "Ricorrono rapporti di parentela, coniugio o affinità rilevanti secondo modello 4?",
    undefined,
    "Se sì, verificare e allegare la dichiarazione prevista: non determina automaticamente esclusione.",
  ),
  tq(
    "marca_bollo_regolare",
    "Marca da bollo annullata e conservata, identificativo14 cifre e data nel formulario, oppure esenzione motivata?",
    is("domanda_inviata", "si"),
  ),
]);
