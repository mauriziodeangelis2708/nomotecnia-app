export const CHECKLIST = [
  { key: "visura", label: "Visura: sede operativa Lazio, attività e assetto societario" },
  { key: "bilancio_2025", label: "Bilancio / dichiarazione 2025" },
  {
    key: "bilancio_2024",
    label: "Bilancio / dichiarazione 2024 (ulteriori esercizi se necessari)",
  },
  { key: "ula", label: "Calcolo ULA 2024–2025 e aggregazioni associate/collegate" },
  { key: "dich_pmi", label: "Dimensione PMI modelli 5/6 (su richiesta Lazio Innova)" },
  { key: "durc", label: "DURC: regolare alla domanda; controllo nuovamente al saldo" },
  { key: "de_minimis", label: "RNA / Impresa Unica: aiuti concessi nei tre anni mobili" },
  {
    key: "inps_attestazione_luglio_2026",
    label: "Attestazione della denuncia contributiva INPS luglio 2026 (NON UniEmens/DM10)",
  },
  {
    key: "iva_modello_2026",
    label: "Modello IVA 2026, periodo 2025, presentato all'Agenzia Entrate",
  },
  { key: "redditi_2025", label: "Forfettari: dichiarazione redditi d'impresa anno 2025" },
  { key: "iva_oss_2025", label: "Se OSS: dichiarazioni trimestrali relative al 2025" },
  {
    key: "attestazione_editoria",
    label: "Se editoria integrata: attestazione commercialista su vendite/acquisti",
  },
  {
    key: "polizza_o_modello3",
    label: "Polizza catastrofale valida alla domanda e concessione, oppure esenzione modello 3",
  },
  {
    key: "modello2_exante",
    label:
      "Micro: Relazione sulla Digitalizzazione modello 2 ex ante (o diagnosi equivalente), allegata alla domanda",
  },
  {
    key: "modello1_exante",
    label:
      "Piccole/medie: diagnosi modello 1 ex ante entro Atto di Impegno; manager qualificato indipendente",
  },
  { key: "modello_expost", label: "Al saldo: modello 1/2 ex post firmato dal soggetto richiesto" },
  { key: "cert_genere", label: "Premialità: certificazione UNI/PdR 125:2022 valida alla domanda" },
  {
    key: "cert_ambiente",
    label: "Premialità: certificazione ambientale ammessa, valida alla domanda",
  },
  {
    key: "impresa_giovanile",
    label: "Età e maggioranze soci/quote/amministratori per Impresa Giovanile alla domanda",
  },
  {
    key: "modello4_conflitti",
    label: "Conflitti di interesse: modello 4 se ricorrono rapporti rilevanti",
  },
  {
    key: "rappresentante_ue",
    label: "Imprese UE: incarico revisore/avvocato italiano, relazione e documenti equipollenti",
  },
  {
    key: "domanda_pec",
    label: "Domanda generata GeCoWEB, firma digitale, finalizzazione e ricevuta PEC",
  },
  {
    key: "precedenti_voucher",
    label: "Precedenti voucher: PEC domanda erogazione e tipologie già concesse",
  },
  {
    key: "preventivi",
    label: "Preventivi e contratti (non determinano l'importo della somma forfettaria)",
  },
  {
    key: "specifiche_tecniche",
    label: "Specifiche tecniche e componenti obbligatorie Appendice 4",
  },
  {
    key: "inventario_it",
    label: "Cloud: applicazioni in uso su server locali propri, inventario e VM conforme",
  },
  {
    key: "sede_operativa_lazio",
    label:
      "Sede operativa e attività Lazio, o apertura descritta/giustificata/documentata in domanda",
  },
] as const;

export type DocStatus = "mancante" | "richiesto" | "ricevuto" | "verificato" | "non_applicabile";
export const DOC_STATUS: { value: DocStatus; label: string }[] = [
  { value: "mancante", label: "Mancante" },
  { value: "richiesto", label: "Richiesto" },
  { value: "ricevuto", label: "Ricevuto" },
  { value: "verificato", label: "Verificato" },
  { value: "non_applicabile", label: "N/A" },
];

export const eur = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
export const dt = (s: string) =>
  new Date(s).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
