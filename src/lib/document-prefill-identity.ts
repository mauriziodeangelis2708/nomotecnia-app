import type { DocumentPage } from "./document-prefill-demo";

export type DocumentIdentityStatus = "matched" | "unverified" | "mismatch" | "conflict";

export interface DocumentIdentityReview {
  status: DocumentIdentityStatus;
  explanation: string;
}

/**
 * Conservative identity check, not an authenticity check.
 * Read only exactly labeled Partita IVA lines; unrelated 11-digit values
 * and ambiguous identifiers must never be used to link customer documents.
 */
export function reviewDocumentIdentity(
  pages: readonly DocumentPage[],
  assessmentVat: unknown,
): DocumentIdentityReview {
  const vatIds = new Set<string>();
  const vatPattern =
    /^(?:partita\s+iva|p\.?\s*iva|p\.?\s*i\.?\s*v\.?\s*a\.?)\s*:?\s*(?:IT\s*)?(\d{11})\s*$/i;
  for (const page of pages) {
    for (const line of page.text.split(/\r?\n/)) {
      const match = line.trim().match(vatPattern);
      if (match?.[1]) vatIds.add(match[1]);
    }
  }

  if (vatIds.size > 1) {
    return {
      status: "conflict",
      explanation: "Nel documento sono presenti Partite IVA discordanti: importazione bloccata.",
    };
  }
  const sourceVat = [...vatIds][0];
  const targetVat =
    typeof assessmentVat === "string" ? assessmentVat.replace(/\s/g, "").replace(/^IT/i, "") : "";
  if (!sourceVat || !/^\d{11}$/.test(targetVat)) {
    return {
      status: "unverified",
      explanation:
        "Non posso confermare automaticamente che questo documento appartenga all'impresa della pratica.",
    };
  }
  if (sourceVat !== targetVat) {
    return {
      status: "mismatch",
      explanation:
        "Partita IVA del documento diversa da quella nella pratica: importazione bloccata.",
    };
  }
  return {
    status: "matched",
    explanation:
      "Partita IVA del documento coerente con quella della pratica. Verificare comunque il documento.",
  };
}

export function canImportForIdentity(
  status: DocumentIdentityStatus,
  operatorConfirmedOwnership: boolean,
): boolean {
  return status === "matched" || (status === "unverified" && operatorConfirmedOwnership);
}
