import { describe, expect, it } from "vitest";
import { auditExecutableView } from "./audit-view";
import { activeAnswers, evaluateGrant } from "./engine";
import { syntheticGrant } from "./fixtures.test-support";
import { SPAN_GENERATOR_SYSTEM, acceptGeneratedDefinition } from "./generation";
import { SPAN_COVERAGE_SYSTEM, addCoverageFindings } from "./coverage";
import { resolveGeneratedCitations, resolveAuditCitations } from "./source-citations";
import { attachInventory } from "./inventory";
import { planSourceChunks } from "./multipass";
import { normalizeQuote } from "./schema";
import observed from "./all-spans-observed.test-support.json";
import source from "./nuova-impresa-source.test-support.json";
import { nuovaImpresaReference } from "./nuova-impresa-reference.test-support";

function observedDraft(raw: unknown = observed.generationResult.response) {
  const input = JSON.parse(observed.generationRequest.messages[1]!.content);
  const { coverage, ...generated } = resolveGeneratedCitations(
    raw,
    input.spans,
    input.spans.map((s: { documentId: string; name: string; page: number; text: string }) => ({
      documentId: s.documentId,
      name: s.name,
      page: s.page,
      text: s.text,
    })),
  );
  const chunkIndex = planSourceChunks([source.source]).findIndex((chunk) =>
    generated.questions.every((q) =>
      q.citations.every((c) =>
        chunk.some(
          (p) =>
            p.documentId === c.documentId &&
            p.page === c.page &&
            normalizeQuote(p.text).includes(normalizeQuote(c.quote)),
        ),
      ),
    ),
  );
  const draft = attachInventory(
    acceptGeneratedDefinition(generated, {
      id: "observed",
      version: 1,
      title: "Osservazione parziale",
      sources: [source.source],
      chunkIndex,
    }),
    input.inventory,
    coverage,
  );
  return { draft, input };
}
describe("executable evidence for independent source review", () => {
  it("shows only execution facts, not generated conclusions, labels, source copies or expected outcomes", () => {
    const d = syntheticGrant();
    d.unresolved = ["PRIVATE_GENERATOR_CONCLUSION"];
    const view = auditExecutableView(d);
    expect(view).not.toHaveProperty("unresolved");
    expect(view).not.toHaveProperty("sources");
    expect(view.rules.every((r) => !("label" in r))).toBe(true);
    expect(JSON.stringify(view)).not.toContain("PRIVATE_GENERATOR_CONCLUSION");
    expect(JSON.stringify(view)).not.toContain('"expected"');
    expect(view.probes.length).toBeLessThanOrEqual(6);
  });
  it("reuses assessment execution with identical visibility, input validation, states and amounts", () => {
    const d = syntheticGrant();
    d.questions[2]!.integer = true;
    d.questions[3]!.showIf = { op: "eq", field: "attiva", value: true };
    for (const probe of auditExecutableView(d).probes) {
      expect(probe.acceptedAnswers).toEqual(activeAnswers(d, probe.hypotheticalAnswers).answers);
      expect(probe.ruleResults).toEqual(
        evaluateGrant(d, probe.hypotheticalAnswers).rules.map(({ id, state, value }) => ({
          id,
          state,
          value,
        })),
      );
    }
  });
  it("keeps the real source-ID response formally valid but exposes its semantic failure", () => {
    const { draft } = observedDraft();
    expect(draft.requirements!.filter((r) => r.gap)).toHaveLength(4);
    const actual = evaluateGrant(draft, {
      investimento_minimo: 3000,
      spese_capitale: 1500,
      spese_corrente: 1500,
      spese_ammissibili: 3000,
    });
    expect(actual.rules.find((r) => r.id === "spese_corrente_massimo")!.state).toBe("failed");
    const reference = evaluateGrant(nuovaImpresaReference(), { capital: 1500, current: 1500 });
    expect(reference.status).toBe("incomplete");
    expect(actual.status).toBe("not_eligible");
    expect(
      auditExecutableView(draft).probes.some(
        (p) =>
          p.hypotheticalAnswers["spese_corrente"] === 1 &&
          p.ruleResults.some((r) => r.id === "spese_corrente_massimo" && r.state === "failed"),
      ),
    ).toBe(true);
  });
  it("keeps source-linked audit findings advisory and rejects the failed repair experiment", () => {
    const { draft, input } = observedDraft();
    const chunk = input.spans.map(
      (s: { documentId: string; name: string; page: number; text: string }) => ({ ...s }),
    );
    const findings = resolveAuditCitations(
      observed.auditExecutable.result.response,
      input.spans,
      chunk,
    );
    expect(findings.findings.some((f) => f.message.includes("spese di parte corrente"))).toBe(true);
    expect(
      addCoverageFindings(draft, findings, chunk).unresolved.some((s) =>
        s.includes("spese di parte corrente"),
      ),
    ).toBe(true);
    expect(() => observedDraft(observed.revisionExperiment.result.response)).toThrow(
      "Confronto numerico non valido",
    );
  });
  it("does not offer free quotation output in the source-ID prompts", () => {
    expect(SPAN_GENERATOR_SYSTEM).not.toContain("Citation: {documentId");
    expect(SPAN_GENERATOR_SYSTEM).toContain("Citation: {spanId");
    expect(SPAN_COVERAGE_SYSTEM).not.toContain("{message:string,documentId");
    expect(SPAN_COVERAGE_SYSTEM).toContain("{message:string,spanId");
  });
});
