import { describe, expect, it } from "vitest";
import { evaluateGrant } from "./engine";
import { generationRequest } from "./generation";
import { mergeFragments, planSourceChunks, CHUNK_CHARACTERS } from "./multipass";
import { syntheticGrant, SYNTHETIC_ANSWERS } from "./fixtures.test-support";
import { parseDefinition, parseFragment } from "./schema";

describe("multipass source coverage and deterministic merging", () => {
  it("retains every character, original page number and document ID across chunks", () => {
    const d = syntheticGrant();
    d.sources[0]!.pages = [
      { page: 1, text: "a".repeat(9999) + "😀" + "b".repeat(21000) },
      { page: 2, text: "Fine del documento." },
    ];
    const chunks = planSourceChunks(d.sources),
      all = chunks.flat();
    expect(chunks.length).toBe(4);
    expect(chunks.every((c) => c.reduce((n, p) => n + p.text.length, 0) <= CHUNK_CHARACTERS)).toBe(
      true,
    );
    for (const p of d.sources[0]!.pages)
      expect(
        all
          .filter((x) => x.page === p.page)
          .map((x) => x.text)
          .join(""),
      ).toBe(p.text);
    expect(all.every((p) => p.documentId === "avviso")).toBe(true);
    expect(all.every((p) => !/[\uD800-\uDBFF]$/.test(p.text))).toBe(true);
  });
  it("rejects unknown pass indexes and oversized entire jobs instead of truncating", () => {
    const d = syntheticGrant(),
      r = { title: d.title, id: d.id, version: 1, sources: d.sources };
    expect(() => generationRequest.parse({ ...r, chunkIndex: 1 })).toThrow("inesistente");
    d.sources[0]!.pages[0]!.text = "a".repeat(180001);
    expect(() => generationRequest.parse(r)).toThrow("non verrà troncato");
  });
  it("accepts non-normative fragments but never activates a complete empty assessment", () => {
    const d = { ...syntheticGrant(), questions: [], rules: [] };
    expect(parseFragment(d).rules).toEqual([]);
    expect(() => parseDefinition(d)).toThrow();
    expect(() => mergeFragments([d], 1)).toThrow();
  });
  it("rejects incomplete or unrelated jobs", () => {
    const a = syntheticGrant(),
      b = syntheticGrant();
    b.sources[0]!.sha256 = "b".repeat(64);
    expect(() => mergeFragments([a], 2)).toThrow("incompleta");
    expect(() => mergeFragments([a, b], 2)).toThrow("stesse fonti");
  });
  it("deduplicates exact repeated rules and questions without doubling points or grants", () => {
    const d = syntheticGrant(),
      merged = mergeFragments([d, structuredClone(d)], 2);
    expect(merged.questions.length).toBe(d.questions.length);
    expect(merged.rules.length).toBe(d.rules.length);
    const answers = Object.fromEntries(
      d.questions.map((q, i) => [
        `q_1_${i + 1}`,
        SYNTHETIC_ANSWERS[q.id as keyof typeof SYNTHETIC_ANSWERS],
      ]),
    );
    const r = evaluateGrant(merged, answers);
    expect(r.grants[0]?.value).toBe(7000);
    expect(r.score).toBe(0);
    expect(r.status).toBe("incomplete");
    expect(merged.unresolved.join(" ")).toContain("revisione incrociata");
  });
  it("preserves conflicting thresholds and explicitly blocks activation", () => {
    const a = syntheticGrant(),
      b = syntheticGrant();
    b.rules[2]!.condition = { op: "gte", field: "investimento", value: 15000 };
    const merged = mergeFragments([a, b], 2);
    expect(merged.rules.length).toBe(6);
    expect(merged.unresolved.join(" ")).toContain("Possibile conflitto");
  });
  it("remaps visibility dependencies before canonical deduplication", () => {
    const a = syntheticGrant();
    a.questions[2]!.showIf = { op: "eq", field: "attiva", value: true };
    const merged = mergeFragments([a, structuredClone(a)], 2);
    expect(merged.questions.length).toBe(4);
    expect(merged.questions[2]!.showIf).toEqual({ op: "eq", field: "q_1_1", value: true });
  });
});
