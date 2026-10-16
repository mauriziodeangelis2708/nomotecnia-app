import type { Answers } from "./engine";
import type { DemoDocumentKind, DocumentProposal } from "./document-prefill-demo";

/**
 * Only these question IDs can be imported from each supported document.
 * An extracted value is NEVER evidence that the document itself is valid.
 */
export const IMPORTABLE_FIELDS: Record<DemoDocumentKind, readonly string[]> = {
  altro: [],
  visura: ["ragione_sociale", "partita_iva", "ateco_codice", "sede_legale_indirizzo"],
  iva: ["iva_ve50_2025", "iva_vf25_2025"],
  inps: ["addetti_inps_luglio_2026"],
};

export interface DocumentMerge {
  answers: Answers;
  applied: string[];
  blocked: string[];
}

/** Pure and conservative: no overwrite, no duplicates, no unknown fields. */
export function mergeConfirmedDocumentFields(
  current: Answers,
  kind: DemoDocumentKind,
  approved: readonly DocumentProposal[],
): DocumentMerge {
  const answers: Answers = { ...current };
  const allowed = new Set<string>(IMPORTABLE_FIELDS[kind]);
  const counts = new Map<string, number>();
  const blocked: string[] = [];
  const applied: string[] = [];
  for (const proposal of approved) {
    counts.set(proposal.field, (counts.get(proposal.field) ?? 0) + 1);
  }
  for (const proposal of approved) {
    const field = proposal.field;
    if (applied.includes(field) || blocked.includes(field)) continue;
    const value = proposal.value;
    const valid =
      typeof value === "string"
        ? value.length > 0 && value.length <= 200
        : typeof value === "number" && Number.isFinite(value) && value >= 0;
    const provenance =
      Number.isSafeInteger(proposal.sourcePage) &&
      proposal.sourcePage > 0 &&
      Number.isSafeInteger(proposal.sourceLine) &&
      proposal.sourceLine > 0 &&
      proposal.sourceExcerpt.trim().length > 0;
    if (
      !allowed.has(field) ||
      !valid ||
      !provenance ||
      counts.get(field) !== 1 ||
      (answers[field] !== undefined && answers[field] !== null && answers[field] !== "")
    ) {
      blocked.push(field);
      continue;
    }
    answers[field] = value;
    applied.push(field);
  }
  return { answers, applied, blocked };
}
