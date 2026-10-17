import { describe, expect, it } from "vitest";
import { sourceSpans } from "./source-spans";
import {
  resolveGeneratedCitations,
  resolveAuditCitations,
  spanAuditFormat,
} from "./source-citations";
import { spanGenerationFormat, GENERATION_FORMAT } from "./output-format";
import { syntheticGrant } from "./fixtures.test-support";
import { acceptGeneratedDefinition } from "./generation";
import { addCoverageFindings, HUMAN_COVERAGE_REVIEW } from "./coverage";

const d = syntheticGrant();
const chunk = d.sources.flatMap((s) =>
  s.pages.map((p) => ({ documentId: s.id, name: s.name, ...p })),
);
const spans = sourceSpans(chunk);
const wire = () => ({
  description: d.description,
  questions: d.questions.map((q) => ({ ...q, citations: [{ spanId: "span_1" }] })),
  rules: d.rules.map((r) => ({ ...r, citations: [{ spanId: "span_1" }] })),
  unresolved: [],
  coverage: [],
});
describe("server-owned evidence for generation and audit", () => {
  it("resolves question and rule references without changing their logic", () => {
    const { coverage, ...raw } = resolveGeneratedCitations(wire(), spans, chunk);
    expect(coverage).toEqual([]);
    const parsed = acceptGeneratedDefinition(raw, {
      id: d.id,
      title: d.title,
      version: 1,
      sources: d.sources,
      chunkIndex: 0,
    });
    expect(parsed).toEqual(d);
  });
  it.each(["questions", "rules"] as const)(
    "rejects unknown IDs and provider-supplied quotations in %s",
    (group) => {
      const raw = wire();
      raw[group][0]!.citations = [{ spanId: "span_999" }];
      expect(() => resolveGeneratedCitations(raw, spans, chunk)).toThrow("inesistente");
      expect(() =>
        resolveGeneratedCitations(
          {
            ...wire(),
            [group]: [{ ...wire()[group][0], citations: [{ spanId: "span_1", quote: "forged" }] }],
          },
          spans,
          chunk,
        ),
      ).toThrow();
      expect(() =>
        resolveGeneratedCitations(
          {
            ...wire(),
            [group]: [
              {
                ...wire()[group][0],
                citations: [{ documentId: "avviso", page: 1, quote: chunk[0]!.text }],
              },
            ],
          },
          spans,
          chunk,
        ),
      ).toThrow();
    },
  );
  it("rejects stale/mismatched contexts, duplicate source IDs and oversized responses", () => {
    expect(() => resolveGeneratedCitations(wire(), spans, [{ ...chunk[0]!, page: 2 }])).toThrow(
      "Contesto",
    );
    expect(() => resolveGeneratedCitations(wire(), [...spans, ...spans], chunk)).toThrow(
      "Contesto",
    );
    expect(() =>
      resolveGeneratedCitations({ ...wire(), description: "x".repeat(1500001) }, spans, chunk),
    ).toThrow("1,5 MB");
  });
  it("materializes audit evidence, preserving the mandatory human review", () => {
    const resolved = resolveAuditCitations(
      { findings: [{ message: "Verificare la soglia", spanId: "span_1" }] },
      spans,
      chunk,
    );
    expect(resolved.findings[0]).toEqual({
      message: "Verificare la soglia",
      documentId: "avviso",
      page: 1,
      quote: chunk[0]!.text,
    });
    const audited = addCoverageFindings(d, resolved, chunk);
    expect(audited.unresolved).toContain(HUMAN_COVERAGE_REVIEW);
    expect(audited.unresolved.some((x) => x.includes("Verificare la soglia"))).toBe(true);
    expect(() =>
      resolveAuditCitations(
        { findings: [{ message: "Verificare", spanId: "other" }] },
        spans,
        chunk,
      ),
    ).toThrow("inesistente");
    expect(() =>
      resolveAuditCitations(
        { findings: [{ message: "Verificare", spanId: "span_1", quote: "forged" }] },
        spans,
        chunk,
      ),
    ).toThrow();
  });
  it("builds per-request citation enums without mutating the common schema or another request", () => {
    const before = JSON.stringify(GENERATION_FORMAT);
    const a = JSON.stringify(spanGenerationFormat(spans));
    const b = JSON.stringify(spanGenerationFormat([{ ...spans[0]!, id: "different" }]));
    expect(a).toContain('"enum":["span_1"]');
    expect(a).not.toContain('"documentId"');
    expect(b).toContain('"enum":["different"]');
    expect(b).not.toContain('"span_1"');
    expect(JSON.stringify(GENERATION_FORMAT)).toBe(before);
    expect(JSON.stringify(spanAuditFormat(spans))).toContain('"spanId"');
    const covered = JSON.stringify(spanGenerationFormat(spans, ["known_requirement"]));
    expect(covered).toContain('"enum":["known_requirement"]');
    const empty = spanGenerationFormat(spans) as {
      json_schema: { properties: { coverage: { maxItems: number } } };
    };
    expect(empty.json_schema.properties.coverage.maxItems).toBe(0);
  });
});
