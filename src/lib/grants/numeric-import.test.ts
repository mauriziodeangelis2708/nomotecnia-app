import { describe, expect, it } from "vitest";
import { importGrantConfiguration, numericReviewPacket } from "./numeric-import";
import { syntheticGrant } from "./fixtures.test-support";
import { NUMERIC_SPECIFICATION_SCOPE } from "./numeric-specification";
import { evaluateGrant } from "./engine";

const d = syntheticGrant();
const envelope = () => ({
  kind: "requirement_specification",
  id: d.id,
  title: d.title,
  version: d.version,
  sourceHashes: d.sources.map((s) => s.sha256),
  chunkIndex: 0,
  specification: {
    inputs: [{ id: "budget", label: "Spese già verificate", unit: "EUR", spanId: "span_1" }],
    declarations: [
      {
        id: "active",
        label: "Impresa attiva verificata?",
        kind: "eligibility",
        expected: true,
        spanIds: ["span_1"],
      },
      {
        id: "insolvent",
        label: "Procedura concorsuale presente?",
        kind: "exclusion",
        expected: true,
        spanIds: ["span_1"],
      },
    ],
    minimums: [{ sumOf: ["budget"], value: 14000, spanId: "span_1" }],
    shares: [],
    fieldLimits: [],
    awardCaps: [],
    awards: [
      {
        id: "award",
        calculation: {
          method: "percentage",
          ratePercent: 50,
          baseFields: ["budget"],
          capAmount: 10000,
        },
        spanIds: ["span_1"],
      },
    ],
    unresolved: [],
  },
});
describe("reviewed requirement import tied to uploaded sources", () => {
  it("exports local text, hashes and per-section IDs without inventing a specification", () => {
    const packet = numericReviewPacket(d.sources);
    expect(packet.sourceHashes).toEqual(d.sources.map((s) => s.sha256));
    expect(packet.chunks[0]!.spans[0]!.text).toBe(d.sources[0]!.pages[0]!.text);
    expect(packet.importFormat.kind).toBe("requirement_specification");
    expect(packet).not.toHaveProperty("reviewed");
    expect(packet).not.toHaveProperty("published_at");
  });
  it("compiles numeric conditions and source-backed confirmations into a blocked preview", () => {
    const compiled = importGrantConfiguration(envelope(), d.sources);
    expect(compiled.unresolved).toContain(NUMERIC_SPECIFICATION_SCOPE);
    expect(compiled.questions.map((q) => q.id)).toEqual(["budget", "active", "insolvent"]);
    const a = { budget: 20000, active: true, insolvent: false };
    expect(evaluateGrant(compiled, a).grants[0]!.value).toBe(10000);
    expect(evaluateGrant(compiled, a).status).toBe("incomplete");
    expect(evaluateGrant(compiled, { ...a, active: false }).status).toBe("not_eligible");
    expect(evaluateGrant(compiled, { ...a, insolvent: true }).status).toBe("not_eligible");
    expect(evaluateGrant(compiled, { budget: 20000 }).status).toBe("incomplete");
  });
  it("rejects missing/different source files, impossible sections, references and dimensions", () => {
    expect(() => importGrantConfiguration(envelope(), [])).toThrow("fonti");
    expect(() =>
      importGrantConfiguration({ ...envelope(), sourceHashes: ["b".repeat(64)] }, d.sources),
    ).toThrow("fonti");
    expect(() => importGrantConfiguration({ ...envelope(), chunkIndex: 99 }, d.sources)).toThrow(
      "Passaggio",
    );
    const e = envelope();
    e.specification.inputs[0]!.spanId = "missing";
    expect(() => importGrantConfiguration(e, d.sources)).toThrow("inesistente");
    const b = envelope();
    b.specification.minimums[0]!.sumOf = ["active"];
    expect(() => importGrantConfiguration(b, d.sources)).toThrow("Variabile");
  });
  it("rejects declaration collisions and retains compatibility with saved configurations", () => {
    const e = envelope();
    e.specification.declarations[0]!.id = "budget";
    expect(() => importGrantConfiguration(e, d.sources)).toThrow("duplicati");
    expect(importGrantConfiguration(d, [])).toEqual(d);
    expect(() => importGrantConfiguration(numericReviewPacket(d.sources), d.sources)).toThrow();
    const longest = envelope();
    longest.specification.declarations[0]!.id = "a".repeat(55);
    expect(
      importGrantConfiguration(longest, d.sources).rules.find((r) => r.id.endsWith("_decision"))!.id
        .length,
    ).toBe(64);
    longest.specification.declarations[0]!.id = "a".repeat(56);
    expect(() => importGrantConfiguration(longest, d.sources)).toThrow();
  });
  it("does not mutate the submitted specification or uploaded text", () => {
    const e = envelope(),
      sources = structuredClone(d.sources),
      before = JSON.stringify({ e, sources });
    importGrantConfiguration(e, sources);
    expect(JSON.stringify({ e, sources })).toBe(before);
  });
});
