/**
 * Prototipo LOCALE su testo fittizio già estratto da un PDF.
 * Non legge PDF, non usa AI, non effettua upload e non scrive sul database.
 * Le proposte non attestano la validità del documento e non vanno salvate automaticamente.
 */
export type DemoDocumentKind = "visura" | "iva" | "inps";

export interface DocumentProposal {
  field: string;
  label: string;
  value: string | number;
  sourceLine: number;
  sourceExcerpt: string;
}

export interface DocumentPreview {
  kind: DemoDocumentKind;
  proposals: DocumentProposal[];
  warnings: string[];
}

const DOCUMENT_MARKERS: Record<DemoDocumentKind, RegExp[]> = {
  visura: [/visura\s+camerale/i],
  iva: [/dichiarazione\s+iva\s+2026/i, /(?:periodo|anno)\s+(?:d.imposta\s+)?2025/i],
  inps: [/attestazione\s+della\s+denuncia\s+contributiva/i, /luglio\s+2026/i],
};

const TEXT_LIMIT = 20000;

function money(raw: string): number | null {
  const compact = raw.replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(compact)) return null;
  // Migliaia italiane e decimali eventuali. Non dedurre formati ambigui.
  const italian = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/;
  const integer = /^\d+$/;
  if (!italian.test(compact) && !integer.test(compact)) return null;
  const n = Number(compact.replace(/\./g, "").replace(",", "."));
  return Number.isSafeInteger(Math.round(n * 100)) && n >= 0 && n <= 1_000_000_000_000
    ? n
    : null;
}

function int(raw: string): number | null {
  const n = Number(raw.trim());
  return Number.isSafeInteger(n) && n >= 0 && n < 1_000_000 ? n : null;
}

function linesOf(text: string) {
  return text.replace(/\r/g, "").split("\n").map((line) => line.trim());
}

export function previewSyntheticDocument(text: string, kind: DemoDocumentKind): DocumentPreview {
  const warnings: string[] = [];
  const proposals: DocumentProposal[] = [];
  if (!text.trim() || text.length > TEXT_LIMIT) {
    return {
      kind,
      proposals,
      warnings: ["Testo assente o superiore al limite della demo (20.000 caratteri)."],
    };
  }
  const lines = linesOf(text);
  if (DOCUMENT_MARKERS[kind].some((marker) => !marker.test(text))) {
    return {
      kind,
      proposals,
      warnings: ["Intestazione o periodo del documento non riconosciuti: nessun dato proposto."],
    };
  }
  function capture(field: string, label: string, regex: RegExp, parse: (raw: string) => string | number | null) {
    const found: DocumentProposal[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const m = line.match(regex);
      if (!m || !m[1]) continue;
      const parsed = parse(m[1].trim());
      if (parsed === null || parsed === "") continue;
      found.push({
        field,
        label,
        value: parsed,
        sourceLine: i + 1,
        sourceExcerpt: line.slice(0, 170),
      });
    }
    if (found.length === 1) proposals.push(found[0]!);
    if (found.length > 1) warnings.push("Più valori per " + label + ": verifica manuale obbligatoria.");
  }
  if (kind === "visura") {
    capture("ragione_sociale", "Ragione sociale", /^denominazione\s*:\s*(.{2,120})$/i, (v) => v);
    capture("partita_iva", "Partita IVA", /^partita\s+iva\s*:\s*(\d{11})$/i, (v) => v);
    capture("ateco_codice", "Codice ATECO", /^(?:codice\s+)?ateco(?:\s+prevalente)?\s*:\s*(\d{2}(?:[.]\d{1,2}){0,2})$/i, (v) => v);
    capture("sede_legale_indirizzo", "Sede legale", /^sede\s+legale\s*:\s*(.{5,180})$/i, (v) => v);
  } else if (kind === "iva") {
    capture("iva_ve50_2025", "VE50 volume d'affari 2025", /^ve50(?:\s+volume\s+d.affari)?\s*:\s*([\d., ]+)$/i, money);
    capture("iva_vf25_2025", "VF25 imponibile acquisti 2025", /^vf25(?:\s+imponibile(?:\s+totale\s+acquisti)?)?\s*:\s*([\d., ]+)$/i, money);
  } else {
    capture("addetti_inps_luglio_2026", "Forza aziendale luglio 2026", /^forza\s+aziendale\s*:\s*(\d+)$/i, int);
  }
  if (proposals.length === 0) warnings.push("Nessun campo univoco riconosciuto nel testo di prova.");
  return { kind, proposals, warnings };
}

/** Dati inventati. Non usare con documenti o anagrafiche reali. */
export const SYNTHETIC_EXAMPLES: Record<DemoDocumentKind, string> = {
  visura: "VISURA CAMERALE — DOCUMENTO FITTIZIO\nDenominazione: AZIENDA DEMO SRL\nPartita IVA: 00000000000\nATECO prevalente: 62.10.00\nSede legale: Via Esempio 1, Viterbo",
  iva: "DICHIARAZIONE IVA 2026 — DOCUMENTO FITTIZIO\nPeriodo d'imposta 2025\nVE50: 500.000\nVF25: 100.000",
  inps: "ATTESTAZIONE DELLA DENUNCIA CONTRIBUTIVA — DOCUMENTO FITTIZIO\nLuglio 2026\nForza Aziendale: 8",
};
