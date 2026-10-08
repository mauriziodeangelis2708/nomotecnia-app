export const CHECKLIST = [
  { key: "visura", label: "Visura camerale aggiornata" },
  { key: "bilancio_2025", label: "Bilancio / dichiarazione 2025" },
  { key: "bilancio_2024", label: "Bilancio / dichiarazione 2024" },
  { key: "ula", label: "Prospetto calcolo ULA 2024–2025" },
  { key: "dich_pmi", label: "Dichiarazione dimensione PMI (incl. associate/collegate)" },
  { key: "durc", label: "DURC in corso di validità" },
  { key: "de_minimis", label: "Dichiarazione de minimis / visura RNA" },
  { key: "inps_luglio", label: "Dato addetti INPS luglio 2026 (UniEmens)" },
  { key: "iva_2025", label: "Dichiarazione IVA 2025" },
  { key: "preventivi", label: "Preventivi fornitori" },
  { key: "specifiche_tecniche", label: "Specifiche tecniche (IaaS/PaaS, cloud, cyber)" },
  { key: "inventario_it", label: "Inventario sistemi IT esistenti" },
  { key: "sede_lazio", label: "Evidenza sede nel Lazio" },
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
  n === null || n === undefined ? "—" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
export const dt = (s: string) => new Date(s).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
