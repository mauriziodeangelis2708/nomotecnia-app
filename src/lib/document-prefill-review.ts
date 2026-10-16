import { previewDocumentPages } from "./document-prefill-demo.ts";
import { canImportForIdentity, reviewDocumentIdentity } from "./document-prefill-identity.ts";
import { mergeConfirmedDocumentFields } from "./document-prefill-merge.ts";
import type { DemoDocumentKind, DocumentPage, DocumentProposal } from "./document-prefill-demo";
import type { Answers } from "./engine";
import type { DocumentMerge } from "./document-prefill-merge";

/**
 * Re-check the original extracted text and the target company immediately before
 * prefill. Fails closed if ANY selected proposal is stale or does not match its source.
 * This is NOT evidence verification and never saves documents or answers.
 */
export function mergeReviewedDocumentFields(
  current: Answers,
  kind: DemoDocumentKind,
  approved: readonly DocumentProposal[],
  pages: readonly DocumentPage[],
  ownershipConfirmed: boolean,
): DocumentMerge {
  const blocked = [...new Set(approved.map((proposal) => proposal.field))];
  const rejected: DocumentMerge = { answers: { ...current }, applied: [], blocked };
  if (approved.length === 0 || pages.length === 0) return rejected;

  const identity = reviewDocumentIdentity(pages, current["partita_iva"]);
  if (!canImportForIdentity(identity.status, ownershipConfirmed)) return rejected;
  if (kind === "iva" && current["regime_fiscale"] === "forfettario") return rejected;

  const fresh = previewDocumentPages(pages, kind);
  const known = new Map(fresh.proposals.map((proposal) => [proposal.field, proposal]));
  const allVerified = approved.every((proposal) => {
    const original = known.get(proposal.field);
    return (
      original !== undefined &&
      original.label === proposal.label &&
      original.value === proposal.value &&
      original.sourcePage === proposal.sourcePage &&
      original.sourceLine === proposal.sourceLine &&
      original.sourceExcerpt === proposal.sourceExcerpt
    );
  });
  if (!allVerified) return rejected;
  return mergeConfirmedDocumentFields(current, kind, approved);
}
