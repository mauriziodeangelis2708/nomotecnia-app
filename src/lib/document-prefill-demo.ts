/**
 * Lettura conservativa da testo locale (dimostrativo).
 * Nessun upload, AI esterna o verifica automatica di autenticità.
 * NON marcare i documenti come verificati a partire dalle proposte.
 */
export type DemoDocumentKind = "visura" | "iva" | "inps";

export interface DocumentPage {
  page: number;
  text: string;
}
export interface DocumentProposal {
  field: string;
  label: string;
  value: string | number;
  sourcePage: number;
  sourceLine: number;
  sourceExcerpt: string;
}
export interface DocumentPreview {
  kind: DemoDocumentKind;
  proposals: DocumentProposal[];
  warnings: string[];
}

export const DOCUMENT_TEXT_LIMIT = 240000;
const DOCUMENT_MARKERS: Record<DemoDocumentKind, RegExp[]> = {
  visura: [/visura\s+camerale|visura\s+ordinaria/i],
  iva: [/dichiarazione\s+iva\s+2026/i, /(?:periodo|anno)\s+(?:d.imposta\s+)?2025/i],
  inps: [/attestazione\s+della\s+denuncia\s+contributiva/i, /luglio\s+2026/i],
};

/** Italian number format, intentionally reject ambiguous grouping. */
function money(raw: string): number | null {
  const compact = raw.replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(compact)) return null;
  if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(compact)) return null;
  const n = Number(compact.replace(/\./g, "").replace(",", "."));
  return Number.isSafeInteger(Math.round(n * 100)) && n >= 0 && n <= 1_000_000_000_000 ? n : null;
}

function integer(raw: string): number | null {
  const n = Number(raw.trim());
  return /^\d+$/.test(raw.trim()) && Number.isSafeInteger(n) && n >= 0 && n < 1_000_000 ? n : null;
}

export function previewDocumentPages(
  pages: readonly DocumentPage[],
  kind: DemoDocumentKind,
): DocumentPreview {
  const warnings: string[] = [];
  const proposals: DocumentProposal[] = [];
  const validPages = pages.filter((p) => Number.isSafeInteger(p.page) && p.page >= 1);
  const whole = validPages.map((p) => p.text).join("\n");
  if (!whole.trim() || whole.length > DOCUMENT_TEXT_LIMIT || validPages.length !== pages.length) {
    return {
      kind,
      proposals,
      warnings: ["Testo assente, pagina non valida o dimensione superiore a 240.000 caratteri."],
    };
  }
  if (DOCUMENT_MARKERS[kind].some((marker) => !marker.test(whole))) {
    return {
      kind,
      proposals,
      warnings: ["Tipo o periodo del documento non riconosciuto: nessun dato proposto."],
    };
  }
  function capture(
    field: string,
    label: string,
    regex: RegExp,
    parse: (raw: string) => string | number | null,
  ) {
    const found: DocumentProposal[] = [];
    for (const p of validPages) {
      const lines = p.text
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim());
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
          sourcePage: p.page,
          sourceLine: i + 1,
          sourceExcerpt: line.slice(0, 170),
        });
      }
    }
    if (found.length === 1) proposals.push(found[0]!);
    if (found.length > 1) {
      warnings.push("Valori multipli per " + label + ": campo bloccato, serve verifica manuale.");
    }
  }
  if (kind === "visura") {
    capture("ragione_sociale", "Ragione sociale", /^denominazione\s*:\s*(.{2,120})$/i, (v) => v);
    capture("partita_iva", "Partita IVA", /^partita\s+iva\s*:\s*(\d{11})$/i, (v) => v);
    capture(
      "ateco_codice",
      "Codice ATECO",
      /^(?:codice\s+)?ateco(?:\s+prevalente)?\s*:\s*(\d{2}(?:[.]\d{1,2}){0,2})$/i,
      (v) => v,
    );
    capture("sede_legale_indirizzo", "Sede legale", /^sede\s+legale\s*:\s*(.{5,180})$/i, (v) => v);
  } else if (kind === "iva") {
    capture(
      "iva_ve50_2025",
      "VE50 volume d'affari 2025",
      /^ve50(?:\s+volume\s+d.affari)?\s*:\s*([\d., ]+)$/i,
      money,
    );
    capture(
      "iva_vf25_2025",
      "VF25 imponibile acquisti 2025",
      /^vf25(?:\s+imponibile(?:\s+totale\s+acquisti)?)?\s*:\s*([\d., ]+)$/i,
      money,
    );
  } else {
    capture(
      "addetti_inps_luglio_2026",
      "Forza aziendale luglio 2026",
      /^forza\s+aziendale\s*:\s*(\d+)$/i,
      integer,
    );
  }
  if (proposals.length === 0)
    warnings.push("Nessun campo univoco riconosciuto: compilazione manuale.");
  return { kind, proposals, warnings };
}

/** Compatible wrapper for the synthetic text-only tests. */
export function previewSyntheticDocument(text: string, kind: DemoDocumentKind): DocumentPreview {
  return previewDocumentPages([{ page: 1, text }], kind);
}

/** Completely fictitious identifiers and values; do not use customer documents in the lab. */
export const SYNTHETIC_EXAMPLES: Record<DemoDocumentKind, string> = {
  visura:
    "VISURA CAMERALE — DOCUMENTO FITTIZIO\nDenominazione: AZIENDA DEMO SRL\nPartita IVA: 00000000000\nATECO prevalente: 62.10.00\nSede legale: Via Esempio 1, Viterbo",
  iva: "DICHIARAZIONE IVA 2026 — DOCUMENTO FITTIZIO\nPeriodo d'imposta 2025\nVE50: 500.000\nVF25: 100.000",
  inps: "ATTESTAZIONE DELLA DENUNCIA CONTRIBUTIVA — DOCUMENTO FITTIZIO\nLuglio 2026\nForza Aziendale: 8",
};
