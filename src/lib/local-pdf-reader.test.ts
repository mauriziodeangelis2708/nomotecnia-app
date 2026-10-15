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
