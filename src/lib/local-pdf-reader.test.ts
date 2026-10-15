import { describe, expect, it } from "vitest";
import { pdfItemsToLines } from "./local-pdf-reader";

describe("PDF text-line normalization", () => {
  it("combines fragments on one baseline in left-to-right order", () => {
    expect(pdfItemsToLines([
      { str: "500.000", transform: [1,0,0,1,100,200] },
      { str: "VE50:", transform: [1,0,0,1,10,200], hasEOL: true },
    ])).toEqual(["VE50: 500.000"]);
  });

  it("splits fragments on distinct visual baselines", () => {
    expect(pdfItemsToLines([
      { str: "VE50: 500.000", transform: [1,0,0,1,10,200] },
      { str: "VF25: 100.000", transform: [1,0,0,1,10,175], hasEOL: true },
    ])).toEqual(["VE50: 500.000", "VF25: 100.000"]);
  });

  it("ignores empty strings and normalizes whitespace", () => {
    expect(pdfItemsToLines([{ str: "  " }, { str: "Attestazione    INPS ", hasEOL: true }]))
      .toEqual(["Attestazione INPS"]);
  });
});


/** Create a tiny standards-shaped PDF containing only invented test values. */
function syntheticPdf(): Uint8Array {
  const stream =
    "BT /F1 12 Tf 50 740 Td (DICHIARAZIONE IVA 2026) Tj " +
    "0 -20 Td (Periodo d'imposta 2025) Tj " +
    "0 -20 Td (VE50: 500.000) Tj " +
    "0 -20 Td (VF25: 100.000) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += (i + 1) + " 0 obj\n" + o + "\nendobj\n";
  });
  const xref = out.length;
  out += "xref\n0 6\n0000000000 65535 f \n";
  offsets.slice(1).forEach((n) => { out += String(n).padStart(10, "0") + " 00000 n \n"; });
  out += "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  return new TextEncoder().encode(out);
}

describe("actual PDF.js parsing, entirely synthetic bytes", () => {
  it("extracts labeled values from a one-page generated PDF", async () => {
    const pdfjs = await import("pdfjs-dist");
    const task = pdfjs.getDocument({ data: syntheticPdf() });
    try {
      const document = await task.promise;
      expect(document.numPages).toBe(1);
      const firstPage = await document.getPage(1);
      const content = await firstPage.getTextContent();
      const fragments = content.items.flatMap((item) => (
        "str" in item ? [{
          str: item.str,
          transform: item.transform,
          hasEOL: item.hasEOL,
        }] : []
      ));
      const lines = pdfItemsToLines(fragments);
      expect(lines.join(" ")).toContain("VE50: 500.000");
      expect(lines.join(" ")).toContain("VF25: 100.000");
    } finally {
      await task.destroy();
    }
  });
});
