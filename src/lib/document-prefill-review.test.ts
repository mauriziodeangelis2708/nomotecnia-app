import { describe, expect, it } from "vitest";
import {
  previewDocumentPages,
  SYNTHETIC_EXAMPLES,
  type DemoDocumentKind,
  type DocumentPage,
} from "./document-prefill-demo";
import { mergeReviewedDocumentFields } from "./document-prefill-review";

function extracted(kind: DemoDocumentKind, text = SYNTHETIC_EXAMPLES[kind]) {
  const pages: DocumentPage[] = [{ page: 1, text }];
  const proposals = previewDocumentPages(pages, kind).proposals;
  return { pages, proposals };
}

describe("document import rechecked against the current source", () => {
  it("imports a synthetic IVA only after manual ownership confirmation", () => {
    const { pages, proposals } = extracted("iva");
    const before = { regime_fiscale: "iva" };
    const blocked = mergeReviewedDocumentFields(before, "iva", proposals, pages, false);
    expect(blocked.applied).toEqual([]);
    const accepted = mergeReviewedDocumentFields(before, "iva", proposals, pages, true);
    expect(accepted.applied).toEqual(["iva_ve50_2025", "iva_vf25_2025"]);
    expect(accepted.answers["iva_ve50_2025"]).toBe(500000);
    expect(before).toEqual({ regime_fiscale: "iva" });
  });

  it("rejects an altered value even if its page and line are unchanged", () => {
    const { pages, proposals } = extracted("iva");
    const forged = proposals.map((p) =>
      p.field === "iva_ve50_2025" ? { ...p, value: 999999 } : p,
    );
    const result = mergeReviewedDocumentFields({}, "iva", forged, pages, true);
    expect(result.applied).toEqual([]);
    expect(result.answers["iva_vf25_2025"]).toBeUndefined();
  });

  it("rejects stale selections if a PDF was replaced after preview", () => {
    const { proposals } = extracted("inps");
    const changed: DocumentPage[] = [
      {
        page: 1,
        text: SYNTHETIC_EXAMPLES.inps.replace("Forza Aziendale: 8", "Forza Aziendale: 12"),
      },
    ];
    const result = mergeReviewedDocumentFields({}, "inps", proposals, changed, true);
    expect(result.applied).toEqual([]);
  });

  it("rejects a wrong-company document despite manual confirmation", () => {
    const text = SYNTHETIC_EXAMPLES.iva + "\nPartita IVA: 00000000000";
    const { pages, proposals } = extracted("iva", text);
    const result = mergeReviewedDocumentFields(
      { partita_iva: "12345678901" },
      "iva",
      proposals,
      pages,
      true,
    );
    expect(result.applied).toEqual([]);
  });

  it("rejects a document with conflicting identity lines", () => {
    const text = SYNTHETIC_EXAMPLES.visura + "\nPartita IVA: 12345678901";
    const { pages, proposals } = extracted("visura", text);
    const result = mergeReviewedDocumentFields(
      { partita_iva: "00000000000" },
      "visura",
      proposals,
      pages,
      true,
    );
    expect(result.applied).toEqual([]);
  });

  it("blocks IVA imported into an explicitly forfettario assessment", () => {
    const { pages, proposals } = extracted("iva");
    const result = mergeReviewedDocumentFields(
      { regime_fiscale: "forfettario" },
      "iva",
      proposals,
      pages,
      true,
    );
    expect(result.applied).toEqual([]);
    expect(result.answers["iva_ve50_2025"]).toBeUndefined();
  });

  it("rejects an unrelated field even when a valid field is also selected", () => {
    const { pages, proposals } = extracted("inps");
    const result = mergeReviewedDocumentFields(
      {},
      "inps",
      [...proposals, { ...proposals[0]!, field: "is_admin" }],
      pages,
      true,
    );
    expect(result.applied).toEqual([]);
    expect(result.answers).toEqual({});
  });

  it("preserves existing values and never changes evidence status", () => {
    const { pages, proposals } = extracted("iva");
    const result = mergeReviewedDocumentFields(
      { iva_ve50_2025: 120000, source_document_verified: "no" },
      "iva",
      proposals,
      pages,
      true,
    );
    expect(result.applied).toEqual(["iva_vf25_2025"]);
    expect(result.blocked).toEqual(["iva_ve50_2025"]);
    expect(result.answers["iva_ve50_2025"]).toBe(120000);
    expect(result.answers["source_document_verified"]).toBe("no");
  });
});
