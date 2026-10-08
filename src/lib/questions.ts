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
    id: "anagrafica", title: "Anagrafica",
    questions: () => [
      { id: "ragione_sociale", label: "Ragione sociale", type: "text" },
      { id: "partita_iva", label: "Partita IVA", type: "text" },
      { id: "forma_giuridica", label: "Forma giuridica", type: "text" },
      { id: "pec", label: "PEC", type: "text" },
      { id: "iscritta_attiva", label: "L'impresa è iscritta al Registro Imprese e attiva?", type: "tri" },
    ],
  },
  {
    id: "sede", title: "Sede nel Lazio",
    questions: () => [
      { id: "sede_lazio", label: "Ha sede legale o operativa nel Lazio?", type: "tri" },
      { id: "sede_lazio_entro_termine", label: "Si impegna ad aprire una sede nel Lazio entro il termine previsto dall'Avviso?", type: "tri", showIf: is("sede_lazio", "no") },
      { id: "comune_sede", label: "Comune della sede nel Lazio", type: "text", showIf: (a) => a.sede_lazio === "si" || a.sede_lazio_entro_termine === "si" },
    ],
  },
  {
    id: "ateco", title: "ATECO",
    questions: () => [
      { id: "ateco_codice", label: "Codice ATECO prevalente (sede nel Lazio)", type: "text" },
      { id: "ateco_escluso", label: "Il codice rientra tra i settori esclusi dall'Avviso?", type: "tri", help: "Confrontare con l'elenco ufficiale delle esclusioni (regola 'Settori ATECO esclusi')." },
    ],
  },
  {
    id: "dimensione", title: "Dimensione PMI",
    intro: "Inserire ULA, fatturato e totale attivo per gli esercizi 2025 e 2024.",
    questions: () => [
      { id: "ula_2025", label: "ULA 2025", type: "number" },
      { id: "fatturato_2025", label: "Fatturato 2025 (EUR)", type: "number" },
      { id: "attivo_2025", label: "Totale attivo 2025 (EUR)", type: "number" },
      { id: "ula_2024", label: "ULA 2024", type: "number" },
      { id: "fatturato_2024", label: "Fatturato 2024 (EUR)", type: "number" },
      { id: "attivo_2024", label: "Totale attivo 2024 (EUR)", type: "number" },
      { id: "ha_associate_collegate", label: "L'impresa ha imprese associate o collegate?", type: "tri" },
      { id: "associate_descrizione", label: "Descrivere le imprese associate/collegate e le quote", type: "textarea", showIf: is("ha_associate_collegate", "si") },
      { id: "dati_aggregati_disponibili", label: "Sono disponibili i dati aggregati del gruppo?", type: "tri", showIf: is("ha_associate_collegate", "si") },
      ...(["2025", "2024"] as const).flatMap((y) => [
        { id: `ula_agg_${y}`, label: `ULA aggregate ${y}`, type: "number" as const, showIf: (a: Answers) => a.ha_associate_collegate === "si" && a.dati_aggregati_disponibili === "si" },
        { id: `fatturato_agg_${y}`, label: `Fatturato aggregato ${y}`, type: "number" as const, showIf: (a: Answers) => a.ha_associate_collegate === "si" && a.dati_aggregati_disponibili === "si" },
        { id: `attivo_agg_${y}`, label: `Totale attivo aggregato ${y}`, type: "number" as const, showIf: (a: Answers) => a.ha_associate_collegate === "si" && a.dati_aggregati_disponibili === "si" },
      ]),
    ],
  },
  {
    id: "aiuti", title: "De minimis e altri voucher",
    questions: () => [
      { id: "de_minimis_ricevuti", label: "Ha ricevuto aiuti de minimis nel periodo di riferimento?", type: "tri" },
      { id: "de_minimis_importo", label: "Importo de minimis ricevuto (EUR, da RNA)", type: "number", showIf: is("de_minimis_ricevuti", "si") },
      { id: "altri_voucher", label: "Ha ottenuto o richiesto altri voucher/agevolazioni per la digitalizzazione?", type: "tri" },
      { id: "altri_voucher_descrizione", label: "Quali?", type: "textarea", showIf: is("altri_voucher", "si") },
      { id: "stesse_spese", label: "Riguardano le stesse spese di questo progetto?", type: "tri", showIf: is("altri_voucher", "si") },
    ],
  },
  {
    id: "requisiti", title: "Requisiti generali",
    questions: () => [
      { id: "durc_regolare", label: "DURC regolare?", type: "tri" },
      { id: "impresa_difficolta", label: "L'impresa è in difficoltà ai sensi della normativa UE?", type: "tri" },
      { id: "procedure_concorsuali", label: "Sono in corso procedure concorsuali o liquidazione?", type: "tri" },
    ],
  },
  {
    id: "diagnosi", title: "Diagnosi digitale",
    info: (a) => {
      const s = sizeOf(a);
      if (s === "micro") return "Micro impresa: la diagnosi digitale non è ammissibile.";
      if (s === "piccola" || s === "media") return "Piccola/media impresa: la diagnosi digitale è obbligatoria.";
      return "Dimensione non ancora determinata: completare la sezione Dimensione PMI.";
    },
    questions: () => [
      { id: "diagnosi_prevista", label: "Il progetto prevede la diagnosi digitale?", type: "tri", showIf: (a) => ["piccola", "media"].includes(String(sizeOf(a))) },
    ],
  },
  {
    id: "workplace", title: "Digital Workplace",
    questions: (rules) => {
      const labels = (rules.workplace_categories?.value_text ?? "Categoria 1|Categoria 2|Categoria 3|Categoria 4|Categoria 5").split("|");
      return [
        { id: "interesse_workplace", label: "Interesse per Digital Workplace?", type: "tri" },
        { id: "sw_attuali", label: "Software attualmente in uso (postazioni, collaboration, gestionali…)", type: "textarea", showIf: is("interesse_workplace", "si") },
        { id: "sw_nuovi", label: "Nuovi software/servizi previsti", type: "textarea", showIf: is("interesse_workplace", "si") },
        { id: "workplace_categorie", label: "Categorie obbligatorie coperte", type: "multi", options: labels.map((l, i) => ({ value: `c${i + 1}`, label: l.trim() })), showIf: is("interesse_workplace", "si"), help: "Denominazioni configurabili in Admin › Regole." },
        { id: "workplace_durata_mesi", label: "Durata licenze/servizi (mesi)", type: "number", showIf: is("interesse_workplace", "si") },
        { id: "addetti_inps_luglio_2026", label: "Addetti INPS a luglio 2026", type: "number", showIf: is("interesse_workplace", "si") },
      ];
    },
  },
  {
    id: "commerce", title: "Digital Commerce",
    questions: () => [
      { id: "interesse_commerce", label: "Interesse per Digital Commerce?", type: "tri" },
      { id: "commerce_attuale", label: "Canali di vendita digitali attuali", type: "textarea", showIf: is("interesse_commerce", "si") },
      { id: "commerce_tipo", label: "Architettura della soluzione proposta", type: "select", showIf: is("interesse_commerce", "si"), options: [
        { value: "iaas", label: "Su infrastruttura IaaS" }, { value: "paas", label: "Su piattaforma PaaS" },
        { value: "saas", label: "Semplice abbonamento SaaS" }, { value: "nonso", label: "Non ancora definita" },
      ] },
      { id: "commerce_requisiti_confermati", label: "Il fornitore documenta i requisiti tecnici IaaS/PaaS?", type: "tri", showIf: isAny("commerce_tipo", ["iaas", "paas"]) },
      { id: "commerce_descrizione", label: "Descrizione tecnica (hosting, personalizzazioni, integrazioni)", type: "textarea", showIf: isAny("commerce_tipo", ["iaas", "paas"]) },
    ],
  },
  {
    id: "cyber", title: "Cybersecurity",
    info: (a) => (sizeOf(a) === "micro" ? "Micro impresa: la linea Cybersecurity non è ammissibile." : null),
    questions: () => [
      { id: "interesse_cyber", label: "Interesse per Cybersecurity?", type: "tri", showIf: (a) => sizeOf(a) !== "micro" },
      { id: "cyber_attuale", label: "Misure di sicurezza attuali", type: "textarea", showIf: is("interesse_cyber", "si") },
      { id: "cyber_perimetro_definito", label: "Perimetro e servizi di sicurezza sono definiti?", type: "tri", showIf: is("interesse_cyber", "si") },
    ],
  },
  {
    id: "cloud", title: "Migrazione Cloud",
    intro: "Ammissibili solo migrazioni REALI di sistemi esistenti (server applicativi, database, web, backup).",
    questions: () => [
      { id: "interesse_cloud", label: "Interesse per migrazione in cloud?", type: "tri" },
      { id: "gia_cloud", label: "L'impresa utilizza già il cloud?", type: "select", showIf: is("interesse_cloud", "si"), options: [
        { value: "no", label: "No, sistemi on-premise" }, { value: "parziale", label: "In parte" }, { value: "si", label: "Sì, interamente" },
      ] },
      { id: "sistemi_locali_residui", label: "Esistono sistemi locali residui (server, NAS, DB in sede)?", type: "tri", showIf: (a) => a.interesse_cloud === "si" && isAny("gia_cloud", ["si", "parziale"])(a) },
      { id: "sistemi_residui_descrizione", label: "Inventario sistemi locali residui", type: "textarea", showIf: is("sistemi_locali_residui", "si") },
      { id: "cloud_sistemi", label: "Sistemi esistenti da migrare", type: "multi", showIf: (a) => a.interesse_cloud === "si" && (a.gia_cloud === "no" || a.sistemi_locali_residui === "si"), options: [
        { value: "application", label: "Application server" }, { value: "database", label: "Database" },
        { value: "web", label: "Web server" }, { value: "backup", label: "Backup" },
      ] },
      ...(["application", "database", "web", "backup"] as const).flatMap((t) => [
        { id: `cloud_${t}_esistente`, label: `${t === "application" ? "Application server" : t === "database" ? "Database" : t === "web" ? "Web server" : "Backup"}: il sistema esiste oggi ed è in uso?`, type: "tri" as const, showIf: (a: Answers) => Array.isArray(a.cloud_sistemi) && (a.cloud_sistemi as string[]).includes(t) },
        { id: `cloud_${t}_descrizione`, label: "Descrizione sistema attuale (hw, sw, dimensioni)", type: "textarea" as const, showIf: (a: Answers) => Array.isArray(a.cloud_sistemi) && (a.cloud_sistemi as string[]).includes(t) && a[`cloud_${t}_esistente`] === "si" },
      ]),
    ],
  },
  {
    id: "punteggio", title: "Dati per punteggio",
    intro: "La formula di punteggio non è verificata: i dati vengono raccolti ma nessun punteggio viene calcolato.",
    questions: () => [
      { id: "iva_volume_2025", label: "Volume d'affari IVA 2025 (EUR)", type: "number" },
      { id: "inps_addetti_2025", label: "Addetti INPS 2025 (media)", type: "number" },
      { id: "premialita", label: "Possibili criteri premiali (descrizione)", type: "textarea" },
    ],
  },
];
