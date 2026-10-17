import { describe, expect, it } from "vitest";
import { compileNumericSpecification, NUMERIC_SPECIFICATION_SCOPE } from "./numeric-specification";
import { evaluateGrant } from "./engine";
import { runScenarios, publicationProblems } from "./lifecycle";
import { NUOVA_IMPRESA_CASES } from "./nuova-impresa-reference.test-support";
import source from "./nuova-impresa-source.test-support.json";
import grounded from "./all-spans-observed.test-support.json";
import observed from "./numeric-specification-observed.test-support.json";
import { workplaceReference, WORKPLACE_CASES } from "./workplace-reference.test-support";
import workplace from "./workplace-observed.test-support.json";
import { sourceSpans } from "./source-spans";
const spans = JSON.parse(grounded.generationRequest.messages[1]!.content).spans;
const context = {
  id: "numeric_spec",
  title: "Specifica numerica parziale",
  version: 1,
  sources: [source.source],
  spans,
  chunk: spans,
};
// Independently reviewed data, not an AI response repaired to pass its own tests.
const reviewed = () => ({
  inputs: [
    {
      id: "capital",
      label: "Spese in conto capitale già verificate",
      unit: "EUR",
      spanId: "span_2",
    },
    {
      id: "current",
      label: "Spese correnti già verificate dopo riduzioni",
      unit: "EUR",
      spanId: "span_2",
    },
  ],
  minimums: [{ sumOf: ["capital", "current"], value: 3000, spanId: "span_2" }],
  shares: [
    { part: "capital", total: ["capital", "current"], atLeastPercent: 50, spanId: "span_2" },
  ],
  fieldLimits: [],
  awardCaps: [{ awardId: "grant_amount", amountField: "capital", spanId: "span_2" }],
  awards: [
    {
      id: "grant_amount",
      calculation: {
        method: "percentage",
        ratePercent: 50,
        baseFields: ["capital", "current"],
        capAmount: 10000,
      },
      spanIds: ["span_2"],
    },
  ],
  unresolved: [],
});
describe("compilation from reviewed quantitative requirements", () => {
  it.each(WORKPLACE_CASES)(
    "also compiles a different reviewed per-unit scheme: $name",
    (scenario) => {
      const ref = workplaceReference();
      const spec = {
        inputs: [
          { id: "requested", label: "Postazioni richieste", unit: "count", spanId: "span_1" },
          { id: "employees", label: "Addetti verificati", unit: "count", spanId: "span_1" },
        ],
        minimums: [{ sumOf: ["requested"], value: 1, spanId: "span_1" }],
        shares: [],
        fieldLimits: [{ field: "requested", atMostField: "employees", spanId: "span_1" }],
        awardCaps: [],
        awards: [
          {
            id: "workplace_amount",
            calculation: { method: "per_unit", amountPerUnit: 2270.4, quantityField: "requested" },
            spanIds: ["span_1"],
          },
        ],
        unresolved: [],
      };
      const d = compileNumericSpecification(spec, {
        id: ref.id,
        title: ref.title,
        version: 1,
        sources: ref.sources,
        spans: sourceSpans([workplace.excerpt]),
        chunk: [workplace.excerpt],
      });
      const ruleStates = scenario.ruleStates
        ? Object.fromEntries(
            Object.entries(scenario.ruleStates).map(([id, state]) => [
              id === "quantity_positive" ? "numeric_minimum_1" : "numeric_limit_1",
              state,
            ]),
          )
        : undefined;
      expect(
        runScenarios(d, [{ ...scenario, ...(ruleStates ? { ruleStates } : {}) }])[0]!.passed,
      ).toBe(true);
    },
  );
  it.each(NUOVA_IMPRESA_CASES)(
    "preserves independent numerical expectations: $name",
    (scenario) => {
      const d = compileNumericSpecification(reviewed(), context);
      const ruleStates = scenario.ruleStates
        ? Object.fromEntries(
            Object.entries(scenario.ruleStates).map(([id, state]) => [
              id === "minimum" ? "numeric_minimum_1" : "numeric_share_1",
              state,
            ]),
          )
        : undefined;
      expect(
        runScenarios(d, [{ ...scenario, ...(ruleStates ? { ruleStates } : {}) }])[0]!.passed,
      ).toBe(true);
    },
  );
  it("checks the share against the whole sum and keeps the award ceiling separate", () => {
    const d = compileNumericSpecification(reviewed(), context);
    const result = evaluateGrant(d, { capital: 1000, current: 2000 });
    expect(result.rules.find((r) => r.id === "numeric_share_1")!.state).toBe("failed");
    expect(result.grants[0]!.value).toBe(1000);
    expect(d.questions.map((q) => q.id)).toEqual(["capital", "current"]);
  });
  it("remains a blocked partial specification even if all numeric expectations pass", () => {
    const d = compileNumericSpecification(reviewed(), context);
    expect(publicationProblems(d, { sources: [], items: [], scenarios: [] })).toContain(
      NUMERIC_SPECIFICATION_SCOPE,
    );
  });
  it("rejects unknown or ambiguous references instead of manufacturing an input or a total", () => {
    const spec = reviewed();
    expect(() =>
      compileNumericSpecification(
        {
          ...spec,
          fieldLimits: [{ field: "grant_amount", atMostField: "capital", spanId: "span_2" }],
        },
        context,
      ),
    ).toThrow("Variabile");
    expect(() =>
      compileNumericSpecification(
        {
          ...spec,
          shares: [{ part: "capital", total: ["current"], atLeastPercent: 50, spanId: "span_2" }],
        },
        context,
      ),
    ).toThrow("comprende");
    expect(() =>
      compileNumericSpecification(
        { ...spec, awardCaps: [{ awardId: "missing", amountField: "capital", spanId: "span_2" }] },
        context,
      ),
    ).toThrow("sconosciuto");
    expect(() =>
      compileNumericSpecification({ ...spec, inputs: [...spec.inputs, spec.inputs[0]!] }, context),
    ).toThrow("duplicati");
    expect(() =>
      compileNumericSpecification(
        { ...spec, minimums: [{ sumOf: ["capital", "capital"], value: 3000, spanId: "span_2" }] },
        context,
      ),
    ).toThrow();
  });
  it("rejects incompatible dimensions and missing source IDs", () => {
    const spec = reviewed();
    expect(() =>
      compileNumericSpecification(
        {
          ...spec,
          inputs: spec.inputs.map((i) => (i.id === "current" ? { ...i, unit: "count" } : i)),
        },
        context,
      ),
    ).toThrow("Unità");
    expect(() =>
      compileNumericSpecification(
        {
          ...spec,
          awards: [
            {
              id: "grant_amount",
              calculation: { method: "per_unit", amountPerUnit: 2, quantityField: "capital" },
              spanIds: ["span_2"],
            },
          ],
        },
        context,
      ),
    ).toThrow("quantità");
    expect(() =>
      compileNumericSpecification(
        { ...spec, minimums: [{ sumOf: ["capital"], value: 3000, spanId: "missing" }] },
        context,
      ),
    ).toThrow("inesistente");
  });
  it("preserves the incomplete high-budget response and rejects the first prototype's contract violation", () => {
    expect(observed.highBudgetAttempt.result.status).toBe("incomplete");
    expect(observed.highBudgetAttempt.result.final).toBe("");
    const raw = JSON.parse(observed.numericAttempt.result.final);
    expect(raw.inputs).toHaveLength(2);
    expect(() => compileNumericSpecification(raw, context)).toThrow();
    // Its award was incorrectly used as an input in fieldLimits; no post-hoc conversion is applied.
    expect(raw.fieldLimits[0].field).toBe(raw.awards[0].id);
    expect(() =>
      compileNumericSpecification(
        JSON.parse(observed.explicitAwardCapAttempt.result.final),
        context,
      ),
    ).toThrow("comprende");
  });
});
