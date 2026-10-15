import { describe, expect, it } from "vitest";
import {
  previewDocumentPages,
  previewSyntheticDocument,
  SYNTHETIC_EXAMPLES,
} from "./document-prefill-demo";

describe("conservative document preview: local data, human review only", () => {
  it("proposes only exact visura labels with provenance", () => {
    const r = previewSyntheticDocument(SYNTHETIC_EXAMPLES.visura, "visura");
    expect(r.proposals.map((x) => x.field)).toEqual([
      "ragione_sociale", "partita_iva", "ateco_codice", "sede_legale_indirizzo",
    ]);
    expect(r.proposals[1]).toMatchObject({
      value: "00000000000", sourcePage: 1, sourceLine: 3,
    });
  });

  it("reads VE50 and VF25 and ignores other lines", () => {
    const r = previewSyntheticDocument(SYNTHETIC_EXAMPLES.iva + "\nVE51: 900.000", "iva");
    expect(r.proposals.map((x) => [x.field, x.value])).toEqual([
      ["iva_ve50_2025", 500000], ["iva_vf25_2025", 100000],
    ]);
  });

  it("keeps the original PDF page for source and does not mix proposals", () => {
    const r = previewDocumentPages([
      { page: 1, text: "DICHIARAZIONE IVA 2026\nPeriodo d'imposta 2025" },
      { page: 7, text: "VE50: 500.000\nVF25: 100.000" },
    ], "iva");
    expect(r.proposals.map((x) => x.sourcePage)).toEqual([7, 7]);
  });

  it("requires the exact INPS period", () => {
    const ok = previewSyntheticDocument(SYNTHETIC_EXAMPLES.inps, "inps");
    expect(ok.proposals[0]?.value).toBe(8);
    const wrong = previewSyntheticDocument(
      SYNTHETIC_EXAMPLES.inps.replace("Luglio 2026", "Luglio 2025"), "inps",
    );
    expect(wrong.proposals).toHaveLength(0);
  });

  it("rejects unidentified document even when numeric labels exist", () => {
    expect(previewSyntheticDocument("VE50: 500000\nVF25: 100000", "iva").proposals).toHaveLength(0);
  });

  it("blocks duplicate/contradictory values across pages instead of guessing", () => {
    const r = previewDocumentPages([
      { page: 1, text: SYNTHETIC_EXAMPLES.inps },
      { page: 2, text: "Forza Aziendale: 12" },
    ], "inps");
    expect(r.proposals).toHaveLength(0);
    expect(r.warnings.some((w) => w.includes("Valori multipli"))).toBe(true);
  });

  it("rejects ambiguous/negative money formats", () => {
    const r = previewSyntheticDocument(
      "DICHIARAZIONE IVA 2026\nPeriodo d'imposta 2025\nVE50: -500\nVF25: 2,000,000", "iva",
    );
    expect(r.proposals).toHaveLength(0);
  });

  it("rejects overlarge extracted text and invalid page numbers", () => {
    expect(previewSyntheticDocument("a".repeat(240001), "visura").proposals).toHaveLength(0);
    expect(previewDocumentPages([{ page: 0, text: SYNTHETIC_EXAMPLES.iva }], "iva").proposals).toHaveLength(0);
  });

  it("does not infer employee counts from unrelated rows", () => {
    const r = previewSyntheticDocument(
      SYNTHETIC_EXAMPLES.inps.replace("Forza Aziendale: 8", "Totale lavoratori: 8"), "inps",
    );
    expect(r.proposals).toHaveLength(0);
  });
});
