import { describe, expect, it } from "vitest";
import { addCoverageFindings, HUMAN_COVERAGE_REVIEW } from "./coverage";
import { acceptGeneratedDefinition } from "./generation";
import { evaluateGrant } from "./engine";
import original from "./workers-ai-observed.test-support.json";
import observed from "./coverage-observed.test-support.json";

const request = {
  title: "Prova sintetica",
  id: "prova",
  version: 1,
  chunkIndex: 0,
  sources: [
    {
      id: "documento_1",
      name: "synthetic.pdf",
      sha256: "a".repeat(64),
      pages: [{ page: 1, text: original.source }],
    },
  ],
};
const chunk = [
  { documentId: "documento_1", name: "synthetic.pdf", page: 1, text: original.source },
];
describe("independent coverage review", () => {
  it("blocks publication even when the real auditor missed a known omission", () => {
    const d = acceptGeneratedDefinition(original.response, request);
    expect(addCoverageFindings(d, observed.audit.response, chunk).unresolved).toContain(
      HUMAN_COVERAGE_REVIEW,
    );
  });
  it("retains located findings and rejects invented citations or unexpected payloads", () => {
    const d = acceptGeneratedDefinition(original.response, request);
    const finding = {
      message: "Requisito PMI mancante",
      documentId: "documento_1",
      page: 1,
      quote: "Possono partecipare le PMI",
    };
    expect(
      addCoverageFindings(d, { findings: [finding] }, chunk).unresolved.some((x) =>
        x.includes(finding.message),
      ),
    ).toBe(true);
    expect(() => addCoverageFindings(d, { findings: [{ ...finding, page: 2 }] }, chunk)).toThrow();
    expect(() => addCoverageFindings(d, { findings: [], approved: true }, chunk)).toThrow();
  });
  it("checks real regenerated SME, location, exclusion, threshold and capped contribution", () => {
    const d = acceptGeneratedDefinition(observed.regenerated.response, request);
    const a = { pmi: true, sede_lazio: true, liquidazione: false, spesa_ammissibile: 20000 };
    expect(evaluateGrant(d, a).status).toBe("pre_eligible");
    expect(evaluateGrant(d, a).grants[0]!.value).toBe(10000);
    for (const change of [
      { pmi: false },
      { sede_lazio: false },
      { liquidazione: true },
      { spesa_ammissibile: 13999 },
    ])
      expect(evaluateGrant(d, { ...a, ...change }).status).toBe("not_eligible");
    expect(evaluateGrant(d, { ...a, spesa_ammissibile: 14000 }).grants[0]!.value).toBe(7000);
    expect(evaluateGrant(d, {}).status).toBe("incomplete");
  });
});
