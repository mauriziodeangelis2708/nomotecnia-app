import { describe, expect, it } from "vitest";
import { previewSyntheticDocument, SYNTHETIC_EXAMPLES } from "./document-prefill-demo";

describe("sandbox precompilazione (nessun upload, soli dati fittizi)", () => {
  it("propone campi dalla visura con righe di provenienza", () => {
    const r = previewSyntheticDocument(SYNTHETIC_EXAMPLES.visura, "visura");
    expect(r.proposals.map((x) => x.field)).toEqual([
      "ragione_sociale",
      "partita_iva",
      "ateco_codice",
      "sede_legale_indirizzo",
    ]);
    expect(r.proposals[1]).toMatchObject({ value: "00000000000", sourceLine: 3 });
  });

  it("legge VE50 e VF25 ma mai altri numeri fuori dalle etichette", () => {
    const r = previewSyntheticDocument(SYNTHETIC_EXAMPLES.iva + "\nVE51: 900.000", "iva");
    expect(r.proposals.map((x) => [x.field, x.value])).toEqual([
      ["iva_ve50_2025", 500000],
      ["iva_vf25_2025", 100000],
    ]);
  });

  it("richiede il periodo corretto prima di proporre dati INPS", () => {
    const ok = previewSyntheticDocument(SYNTHETIC_EXAMPLES.inps, "inps");
    expect(ok.proposals[0]?.value).toBe(8);
    const wrong = previewSyntheticDocument(
      SYNTHETIC_EXAMPLES.inps.replace("Luglio 2026", "Luglio 2025"),
      "inps",
    );
    expect(wrong.proposals).toHaveLength(0);
    expect(wrong.warnings).toHaveLength(1);
  });

  it("non propone dati se non riconosce la tipologia e il periodo IVA", () => {
    expect(
      previewSyntheticDocument("VE50: 500000\nVF25: 100000", "iva").proposals,
    ).toHaveLength(0);
  });

  it("blocca dati duplicati, non sceglie arbitrariamente", () => {
    const r = previewSyntheticDocument(SYNTHETIC_EXAMPLES.inps + "\nForza Aziendale: 12", "inps");
    expect(r.proposals).toHaveLength(0);
    expect(r.warnings.some((w) => w.includes("Più valori"))).toBe(true);
  });

  it("non accetta importi ambigui o negativi", () => {
    const s = "DICHIARAZIONE IVA 2026\nPeriodo d'imposta 2025\nVE50: -500\nVF25: 2,000,000";
    expect(previewSyntheticDocument(s, "iva").proposals).toHaveLength(0);
  });

  it("non considera un testo troppo grande", () => {
    const r = previewSyntheticDocument("a".repeat(20001), "visura");
    expect(r.proposals).toHaveLength(0);
  });
});
