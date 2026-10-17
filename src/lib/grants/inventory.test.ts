import { describe, expect, it } from "vitest";
import { acceptInventory, attachInventory } from "./inventory";
import { syntheticGrant, SYNTHETIC_SCENARIOS } from "./fixtures.test-support";
import { publicationProblems } from "./lifecycle";
import { mergeFragments } from "./multipass";
import observed from "./inventory-observed.test-support.json";
import generated from "./inventory-generation-observed.test-support.json";
import { parseFragment } from "./schema";
import { evaluateGrant } from "./engine";
import { SYNTHETIC_ANSWERS } from "./fixtures.test-support";

const d = syntheticGrant();
const chunk = d.sources[0]!.pages.map((p) => ({
  ...p,
  documentId: "avviso",
  name: "synthetic.pdf",
}));
const raw = {
  requirements: [{ id: "attiva", label: "Impresa attiva", citations: d.questions[0]!.citations }],
};
const mapping = [{ requirementId: "attiva", questionIds: ["attiva"], ruleIds: ["impresa_attiva"] }];
describe("requirement inventory and traceability", () => {
  it("keeps source-reference gaps after model mapping and clearing generic warnings", () => {
    const definition = syntheticGrant();
    definition.sources[0]!.pages[0]!.text +=
      "\n\nLe condizioni tecniche sono definite nell’allegato 2.";
    const excerpts = definition.sources[0]!.pages.map((p) => ({
      ...p,
      documentId: "avviso",
      name: "Bando",
    }));
    const inventory = acceptInventory({ requirements: [] }, excerpts);
    const requirement = inventory.requirements.find((r) => r.id.startsWith("source_reference_"))!;
    const mapped = attachInventory(definition, inventory, [
      { requirementId: requirement.id, questionIds: ["attiva"], ruleIds: ["impresa_attiva"] },
    ]);
    mapped.unresolved = [];
    expect(evaluateGrant(mapped, SYNTHETIC_ANSWERS).status).toBe("incomplete");
    expect(mapped.requirements![0]!.gap).toContain("rinvio");
    expect(publicationProblems(mapped, { sources: [], items: [], scenarios: [] })).toContain(
      "Completare la copertura di tutti i requisiti dell'inventario.",
    );
  });
  it("rejects model impersonation of a deterministic source-reference identifier", () => {
    expect(() =>
      acceptInventory(
        { requirements: [{ ...raw.requirements[0], id: "source_reference_1" }] },
        chunk,
      ),
    ).toThrow("riservato");
  });
  it("rejects the observed self-gated real eligibility rules instead of silently skipping failures", () => {
    const { coverage: _coverage, ...response } = generated.response;
    expect(() => parseFragment({ ...d, ...response })).toThrow("auto-condizionato");
  });
  it("retains missing mappings as persistent blocking gaps, even if unresolved is cleared", () => {
    const inventory = acceptInventory(raw, chunk),
      definition = attachInventory(d, inventory, []);
    expect(definition.requirements![0]!.gap).toBeTruthy();
    definition.unresolved = [];
    expect(evaluateGrant(definition, SYNTHETIC_ANSWERS).status).toBe("incomplete");
    expect(publicationProblems(definition, { sources: [], items: [], scenarios: [] })).toContain(
      "Completare la copertura di tutti i requisiti dell'inventario.",
    );
  });
  it("requires separate human review of mapped requirements", () => {
    const definition = attachInventory(d, acceptInventory(raw, chunk), mapping);
    expect(definition.requirements![0]!.gap).toBeUndefined();
    expect(
      publicationProblems(definition, { sources: [], items: [], scenarios: SYNTHETIC_SCENARIOS }),
    ).toContain("Revisionare ogni requisito dell'inventario e i relativi collegamenti.");
  });
  it("rejects invented citations, duplicate inventory IDs and fake mapping IDs", () => {
    expect(() =>
      acceptInventory(
        {
          requirements: [
            {
              ...raw.requirements[0],
              citations: [{ documentId: "avviso", page: 2, quote: "Citazione inventata" }],
            },
          ],
        },
        chunk,
      ),
    ).toThrow();
    expect(() =>
      acceptInventory({ requirements: [raw.requirements[0], raw.requirements[0]] }, chunk),
    ).toThrow();
    expect(() =>
      attachInventory(d, acceptInventory(raw, chunk), [{ ...mapping[0], ruleIds: ["missing"] }]),
    ).toThrow();
    expect(() =>
      attachInventory(d, acceptInventory(raw, chunk), [
        { ...mapping[0], requirementId: "invented" },
      ]),
    ).toThrow();
  });
  it("remaps inventory links when merging duplicate rules and questions", () => {
    const definition = attachInventory(d, acceptInventory(raw, chunk), mapping);
    const merged = mergeFragments([definition, structuredClone(definition)], 2);
    expect(merged.requirements).toHaveLength(2);
    expect(new Set(merged.requirements!.map((r) => r.id)).size).toBe(2);
    for (const r of merged.requirements!) {
      expect(r.questionIds).toEqual([merged.questions[0]!.id]);
      expect(r.ruleIds).toEqual([merged.rules[0]!.id]);
    }
  });
  it("preserves real Lazio exception paragraphs omitted by the live extractor", () => {
    const inventory = acceptInventory(observed.response, observed.excerpts);
    const guards = inventory.requirements.filter((r) => r.manualReview);
    expect(
      guards.some((r) =>
        r.citations.some((c) => c.quote.includes("a meno che") && c.quote.includes("medesima")),
      ),
    ).toBe(true);
    expect(guards.some((r) => r.citations.some((c) => c.quote.includes("ad eccezione")))).toBe(
      true,
    );
    expect(guards.some((r) => r.citations.some((c) => c.quote.includes("a condizione che")))).toBe(
      true,
    );
  });
  it("never accepts a model mapping as resolution of a detected exception", () => {
    const modified = chunk.map((c) => ({
      ...c,
      text: c.text + "\n\nSono esclusi, a meno che sia verificata una deroga.",
    }));
    const inventory = acceptInventory(raw, modified),
      guard = inventory.requirements.find((r) => r.manualReview)!;
    // Keep the source updated so exact citations remain verifiable.
    const definition = structuredClone(d);
    definition.sources[0]!.pages[0]!.text = modified[0]!.text;
    const result = attachInventory(definition, inventory, [
      ...mapping,
      { ...mapping[0]!, requirementId: guard.id },
    ]);
    expect(result.requirements!.find((r) => r.id === guard.id)!.gap).toContain("manualmente");
  });
});
