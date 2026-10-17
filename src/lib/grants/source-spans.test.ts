import { describe, expect, it } from "vitest";
import { sourceSpans, acceptSpanInventory } from "./source-spans";
import observed from "./nuova-impresa-observed.test-support.json";
import { acceptInventory } from "./inventory";
import { attachInventory } from "./inventory";
import { parseFragment } from "./schema";
import { evaluateGrant } from "./engine";
import source from "./nuova-impresa-source.test-support.json";
import { nuovaImpresaReference } from "./nuova-impresa-reference.test-support";

const chunk = [
  {
    documentId: "first",
    name: "Bando",
    page: 4,
    text: "Sono ammessi progetti con almeno dodici mesi di durata.",
  },
  {
    documentId: "second",
    name: "Allegato",
    page: 2,
    text: "Il documento tecnico descrive i requisiti della formazione.",
  },
];
const response = (spanId: string) => ({
  requirements: [{ id: "duration", label: "Durata da verificare", citations: [{ spanId }] }],
});
describe("source identifiers for inventory citations", () => {
  it("detects the revised real model's contribution error against the independent second-grant case", () => {
    const { coverage, ...generated } = observed.revisedGenerationResponse;
    expect(coverage.length).toBeGreaterThan(0);
    const draft = parseFragment({
      schemaVersion: 1,
      id: "nuova_revised",
      version: 1,
      title: "Revised observed draft",
      sources: [source.source],
      ...generated,
    });
    const actual = evaluateGrant(draft, {
      investimento_minimo: 3000,
      spese_in_conto_capitale: 1500,
      spese_di_parte_corrente: 1500,
      intensita_contributo: 50,
      importo_contributo_massimo: 10000,
    });
    const expected = evaluateGrant(nuovaImpresaReference(), { capital: 1500, current: 1500 });
    expect(expected.grants[0]!.value).toBe(1500);
    expect(actual.grants[0]!.value).toBe(750);
    expect(actual.status).toBe("incomplete");
  });
  it("accepts the real source-ID extraction while retaining generation coverage gaps", () => {
    const inventory = acceptSpanInventory(observed.spanResponse, observed.spans, observed.excerpts);
    expect(inventory.requirements).toHaveLength(9);
    const { coverage, ...generated } = observed.generationResponse;
    const draft = attachInventory(
      parseFragment({
        schemaVersion: 1,
        id: "nuova_observed",
        version: 1,
        title: "Observed partial draft",
        sources: [source.source],
        ...generated,
      }),
      inventory,
      coverage,
    );
    expect(draft.requirements!.some((r) => r.gap)).toBe(true);
    draft.unresolved = [];
    expect(
      evaluateGrant(draft, {
        investimento_minimo: 3000,
        spese_in_conto_capitale: 1000,
        spese_di_parte_corrente: 2000,
        intensita_contributo: 50,
        importo_contributo_massimo: 10000,
      }).status,
    ).toBe("incomplete");
    // The shape now passes, but a currency threshold of 0.5 does NOT implement the required share.
    const result = evaluateGrant(draft, {
      investimento_minimo: 3000,
      spese_in_conto_capitale: 1000,
      spese_di_parte_corrente: 2000,
      intensita_contributo: 50,
      importo_contributo_massimo: 10000,
    });
    expect(result.rules.find((r) => r.id === "spese_in_conto_capitale_rule")!.state).toBe("passed");
    expect(
      evaluateGrant(nuovaImpresaReference(), { capital: 1000, current: 2000 }).rules.find(
        (r) => r.id === "capital_share",
      )!.state,
    ).toBe("failed");
    expect(result.grants).toEqual([]);
  });
  it("preserves every character, surrogate pair and original source identity", () => {
    const input = [{ ...chunk[0]!, text: "a".repeat(1199) + "😀" + "b".repeat(1203) }, chunk[1]!];
    const spans = sourceSpans(input);
    expect(new Set(spans.map((s) => s.id)).size).toBe(spans.length);
    for (const p of input)
      expect(
        spans
          .filter((s) => s.documentId === p.documentId && s.page === p.page)
          .map((s) => s.text)
          .join(""),
      ).toBe(p.text);
    expect(spans.every((s) => !/[\uD800-\uDBFF]$/.test(s.text))).toBe(true);
    expect(spans.at(-1)!.name).toBe("Allegato");
  });
  it("retrieves a literal citation instead of accepting model-generated quotations", () => {
    const spans = sourceSpans(chunk),
      inventory = acceptSpanInventory(response("span_2"), spans, chunk);
    expect(inventory.requirements[0]!.citations).toEqual([
      { documentId: "second", page: 2, quote: chunk[1]!.text },
    ]);
  });
  it("rejects unknown identifiers, extra quote fields and a wrong source context", () => {
    const spans = sourceSpans(chunk);
    expect(() => acceptSpanInventory(response("span_999"), spans, chunk)).toThrow("inesistente");
    const injected = {
      requirements: [
        { id: "duration", label: "Durata", citations: [{ spanId: "span_1", quote: "invented" }] },
      ],
    };
    expect(() => acceptSpanInventory(injected, spans, chunk)).toThrow();
    expect(() => acceptSpanInventory(response("span_1"), spans, [chunk[1]!])).toThrow(
      "Citazione inventario",
    );
  });
  it("preserves the observed second-grant table-quotation failure as a negative case", () => {
    expect(() => acceptInventory(observed.response, observed.excerpts)).toThrow(
      "Citazione inventario non riscontrata",
    );
    expect(observed.response.requirements[0]!.citations[0]!.quote).toContain("Investimento minimo");
  });
});
