import { describe, expect, it } from "vitest";
import observed from "./lazio-observed.test-support.json";
import { acceptGeneratedDefinition } from "./generation";
import { addCoverageFindings, HUMAN_COVERAGE_REVIEW } from "./coverage";
import { testPredicate } from "./engine";
import { publicationProblems } from "./lifecycle";
import { syntheticGrant } from "./fixtures.test-support";

const sources = [...new Set(observed.excerpts.map((c) => c.documentId))].map((id) => ({
  id,
  name: "extracted-real-Lazio.pdf",
  sha256: "a".repeat(64),
  pages: observed.excerpts
    .filter((c) => c.documentId === id)
    .map((c) => ({ page: c.page, text: c.text })),
}));
const request = {
  id: "lazio_benchmark",
  title: "Lazio benchmark negativo",
  version: 1,
  chunkIndex: 0,
  sources,
};
describe("negative real Lazio benchmark evidence", () => {
  it("does not confuse valid citations with correct eligibility logic", () => {
    const d = acceptGeneratedDefinition(observed.original.response, request);
    const size = d.rules.find((r) => r.id === "requisito_dimensionale")!;
    // Source admits all SME sizes; this observed model response incorrectly rejects Small.
    expect(testPredicate(size.condition!, { tipo_impresa: "Piccola" })).toBe(false);
    const guarded = addCoverageFindings(d, observed.audit.response, observed.excerpts);
    expect(guarded.unresolved).toContain(HUMAN_COVERAGE_REVIEW);
    expect(publicationProblems(guarded, { sources: [], items: [], scenarios: [] })).toContain(
      HUMAN_COVERAGE_REVIEW,
    );
  });
  it("rejects the revised and alternative model outputs rather than repairing their meaning", () => {
    expect(() => acceptGeneratedDefinition(observed.revised.response, request)).toThrow();
    expect(() => acceptGeneratedDefinition(observed.alternative.response, request)).toThrow();
  });
  it("requires citations inside the actual excerpt, even when another source page contains the quote", () => {
    const d = syntheticGrant();
    const quote = d.sources[0]!.pages[0]!.text;
    d.sources[0]!.pages = [
      { page: 1, text: "x".repeat(10000) },
      { page: 2, text: quote },
    ];
    for (const item of [...d.questions, ...d.rules])
      item.citations = item.citations.map((c) => ({ ...c, page: 2 }));
    const { description, questions, rules, unresolved } = d;
    expect(() =>
      acceptGeneratedDefinition(
        { description, questions, rules, unresolved },
        {
          id: d.id,
          title: d.title,
          version: 1,
          chunkIndex: 0,
          sources: d.sources,
        },
      ),
    ).toThrow("esterna all'estratto");
  });
});
