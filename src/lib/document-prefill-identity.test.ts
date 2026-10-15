import { describe, expect, it } from "vitest";
import { canImportForIdentity, reviewDocumentIdentity } from "./document-prefill-identity";

const page = (text: string, n = 1) => [{ page: n, text }];

describe("documento - identita impresa, fail closed", () => {
  it("accepts matching, explicitly labeled VAT and rejects a different VAT", () => {
    const source = page("PARTITA IVA: 00000000000");
    expect(reviewDocumentIdentity(source, "00000000000").status).toBe("matched");
    const mismatched = reviewDocumentIdentity(source, "12345678901");
    expect(mismatched.status).toBe("mismatch");
    expect(canImportForIdentity(mismatched.status, true)).toBe(false);
  });

  it("does not confuse unrelated 11-digit numbers with partita IVA", () => {
    const result = reviewDocumentIdentity(page("Numero pratica: 00000000000"), "00000000000");
    expect(result.status).toBe("unverified");
    expect(canImportForIdentity(result.status, false)).toBe(false);
    expect(canImportForIdentity(result.status, true)).toBe(true);
  });

  it("rejects multiple different VATs, even if one matches", () => {
    const result = reviewDocumentIdentity(
      [{ page: 1, text: "Partita IVA: 00000000000" }, { page: 2, text: "Partita IVA: 12345678901" }],
      "00000000000",
    );
    expect(result.status).toBe("conflict");
    expect(canImportForIdentity(result.status, true)).toBe(false);
  });

  it("repeated identical VAT identifiers are not a conflict", () => {
    const r = reviewDocumentIdentity(
      [{ page: 1, text: "PARTITA IVA: 00000000000" }, { page: 2, text: "P. IVA: IT00000000000" }],
      "IT00000000000",
    );
    expect(r.status).toBe("matched");
  });

  it("requires manual check when practice VAT is missing or malformed", () => {
    const r = reviewDocumentIdentity(page("Partita IVA: 00000000000"), "");
    expect(r.status).toBe("unverified");
    expect(canImportForIdentity(r.status, false)).toBe(false);
  });
});
