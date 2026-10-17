import { describe, expect, it } from "vitest";
import { compileCalculationPlan, compileGeneratedCalculations } from "./calculation-plan";
import { calculate, evaluateGrant } from "./engine";
import { acceptGeneratedDefinition } from "./generation";
import { normalizeQuote, parseDefinition } from "./schema";
import { planSourceChunks } from "./multipass";
import { nuovaImpresaReference, NUOVA_IMPRESA_CASES } from "./nuova-impresa-reference.test-support";
import observed from "./quantitative-observed.test-support.json";
import integrated from "./calculation-integrated-observed.test-support.json";
import source from "./nuova-impresa-source.test-support.json";
import { workplaceReference, WORKPLACE_CASES } from "./workplace-reference.test-support";

describe("bounded calculation plans shared by all grants", () => {
  it("keeps the maximum supported cap lists valid in the existing expression schema", () => {
    const ref = nuovaImpresaReference();
    const caps = Array.from({ length: 30 }, (_, i) => `cap_${i}`);
    const questions = [...ref.questions, ...caps.map((id) => ({ ...ref.questions[0]!, id }))];
    for (const plan of [
      {
        method: "percentage",
        ratePercent: 50,
        baseFields: ["capital", "current"],
        capAmount: 10000,
        capFields: caps,
      },
      {
        method: "per_unit",
        amountPerUnit: 2,
        quantityField: "capital",
        maxUnits: 10000,
        capQuantityFields: caps,
        capAmount: 10000,
      },
    ]) {
      const formula = compileCalculationPlan(plan);
      const definition = parseDefinition({
        ...ref,
        questions,
        rules: ref.rules.map((r) => (r.kind === "grant" ? { ...r, formula } : r)),
      });
      const answers = {
        capital: 1500,
        current: 1500,
        ...Object.fromEntries(caps.map((id) => [id, 2000])),
      };
      expect(evaluateGrant(definition, answers).grants[0]!.value).toBe(
        plan.method === "percentage" ? 1500 : 3000,
      );
    }
  });
  it.each(WORKPLACE_CASES)("also preserves the independent per-unit case: $name", (scenario) => {
    const reference = workplaceReference();
    const formula = compileCalculationPlan({
      method: "per_unit",
      amountPerUnit: 2270.4,
      quantityField: "requested",
    });
    const compiled = parseDefinition({
      ...reference,
      rules: reference.rules.map((r) => (r.kind === "grant" ? { ...r, formula } : r)),
    });
    const a = evaluateGrant(compiled, scenario.answers),
      b = evaluateGrant(reference, scenario.answers);
    expect(a.status).toBe(b.status);
    expect(a.missing).toEqual(b.missing);
    expect(a.rules.map(({ id, state, value }) => ({ id, state, value }))).toEqual(
      b.rules.map(({ id, state, value }) => ({ id, state, value })),
    );
  });
  it("rejects the integrated live response's reconstructed table quotation rather than repairing it", () => {
    const { coverage, ...raw } = integrated.result.response;
    expect(coverage.length).toBeGreaterThan(0);
    expect(normalizeQuote(source.source.pages[6]!.text)).not.toContain(
      normalizeQuote(raw.questions[0]!.citations[0]!.quote),
    );
    const chunkIndex = planSourceChunks([source.source]).findIndex((chunk) =>
      chunk.some((p) => p.page === 7 && p.text.includes("Investimento")),
    );
    expect(chunkIndex).toBeGreaterThanOrEqual(0);
    expect(() =>
      acceptGeneratedDefinition(raw, {
        id: "observed",
        title: "Observed partial",
        version: 1,
        sources: [source.source],
        chunkIndex,
      }),
    ).toThrow("Citazione");
  });
  // Human-authored plans exercise compilation only; they are not successful AI extraction.
  it.each(NUOVA_IMPRESA_CASES)(
    "matches the independent partial numerical case: $name",
    (scenario) => {
      const reference = nuovaImpresaReference();
      const formula = compileCalculationPlan({
        method: "percentage",
        ratePercent: 50,
        baseFields: ["capital", "current"],
        capAmount: 10000,
        capFields: ["capital"],
      });
      const compiled = parseDefinition({
        ...reference,
        rules: reference.rules.map((r) => (r.kind === "grant" ? { ...r, formula } : r)),
      });
      const summarize = (d: ReturnType<typeof evaluateGrant>) => ({
        status: d.status,
        missing: d.missing,
        score: d.score,
        rules: d.rules.map(({ id, state, value }) => ({ id, state, value })),
      });
      expect(summarize(evaluateGrant(compiled, scenario.answers))).toEqual(
        summarize(evaluateGrant(reference, scenario.answers)),
      );
    },
  );
  it.each([
    [{ capital: 1500, current: 1500 }, 1500],
    [{ capital: 5000, current: 2000 }, 3500],
    [{ capital: 50000, current: 50000 }, 10000],
    // Cap on the award is independent of the percentage base.
    [{ capital: 1000, current: 4000 }, 1000],
  ] as const)("keeps all base components and each award cap: %j", (answers, expected) => {
    expect(
      calculate(
        compileCalculationPlan({
          method: "percentage",
          ratePercent: 50,
          baseFields: ["capital", "current"],
          capAmount: 10000,
          capFields: ["capital"],
        }),
        answers,
      ),
    ).toBe(expected);
  });
  it("supports different rates, multiple caps, zero caps and fractional monetary inputs", () => {
    const p = {
      method: "percentage",
      ratePercent: 37.5,
      baseFields: ["equipment", "training"],
      capFields: ["ceiling", "remaining"],
    };
    expect(
      calculate(compileCalculationPlan(p), {
        equipment: 1000.4,
        training: 100.4,
        ceiling: 800,
        remaining: 300,
      }),
    ).toBe(300);
    expect(
      calculate(compileCalculationPlan({ ...p, capAmount: 0 }), {
        equipment: 10,
        training: 10,
        ceiling: 800,
        remaining: 300,
      }),
    ).toBe(0);
    expect(
      calculate(compileCalculationPlan({ ...p, ratePercent: 0 }), {
        equipment: 10,
        training: 10,
        ceiling: 800,
        remaining: 300,
      }),
    ).toBe(0);
  });
  it.each([
    [{ units: 5, employees: 3 }, 1800],
    [{ units: 100, employees: 100 }, 2400],
    [{ units: 1, employees: 0 }, 0],
    [{ units: 1 }, null],
  ] as const)("caps quantities before applying the unit amount: %j", (answers, expected) => {
    expect(
      calculate(
        compileCalculationPlan({
          method: "per_unit",
          amountPerUnit: 600,
          quantityField: "units",
          capQuantityFields: ["employees"],
          maxUnits: 4,
          capAmount: 5000,
        }),
        answers,
      ),
    ).toBe(expected);
  });
  it("also applies a monetary cap after quantity caps, and supports fixed awards", () => {
    expect(
      calculate(
        compileCalculationPlan({
          method: "per_unit",
          amountPerUnit: 600,
          quantityField: "units",
          maxUnits: 0,
          capAmount: 2000,
        }),
        { units: 20 },
      ),
    ).toBe(0);
    expect(
      calculate(
        compileCalculationPlan({
          method: "per_unit",
          amountPerUnit: 600,
          quantityField: "units",
          capAmount: 2000,
        }),
        { units: 20 },
      ),
    ).toBe(2000);
    expect(calculate(compileCalculationPlan({ method: "fixed", amount: 1234.56 }), {})).toBe(
      1234.56,
    );
  });
  it.each([
    { method: "percentage", ratePercent: 101, baseFields: ["a"] },
    { method: "percentage", ratePercent: 50, baseFields: [] },
    { method: "percentage", ratePercent: 50, baseFields: ["a", "a"] },
    { method: "percentage", ratePercent: 50, baseFields: ["a"], capFields: ["b", "b"] },
    { method: "percentage", ratePercent: "50", baseFields: ["a"] },
    { method: "fixed", amount: -1 },
    { method: "fixed", amount: Infinity },
    { method: "per_unit", amountPerUnit: 1, quantityField: "a", maxUnits: -1 },
    { method: "fixed", amount: 0, script: "execute()" },
  ])("rejects invalid plans without repair: %j", (p) =>
    expect(() => compileCalculationPlan(p)).toThrow(),
  );
  it("keeps missing operands unknown rather than assuming zero", () => {
    expect(
      calculate(
        compileCalculationPlan({ method: "percentage", ratePercent: 50, baseFields: ["a", "b"] }),
        { a: 20 },
      ),
    ).toBeNull();
  });
  it("rejects mixed wire formats and preserves input objects", () => {
    const rule = { id: "amount", kind: "grant", calculation: { method: "fixed", amount: 10 } };
    expect(compileGeneratedCalculations([rule])[0]).toEqual({
      id: "amount",
      kind: "grant",
      formula: { op: "constant", value: 10 },
    });
    expect(rule).toHaveProperty("calculation");
    expect(() =>
      compileGeneratedCalculations([{ ...rule, formula: { op: "constant", value: 10 } }]),
    ).toThrow();
    expect(() => compileGeneratedCalculations([{ ...rule, kind: "score" }])).toThrow();
  });
  it("retains independent field-type and source validation after lowering", () => {
    const ref = nuovaImpresaReference();
    const rule = {
      id: ref.rules[2]!.id,
      label: ref.rules[2]!.label,
      kind: "grant",
      citations: ref.rules[2]!.citations,
      calculation: { method: "percentage", ratePercent: 50, baseFields: ["capital", "current"] },
    };
    const request = {
      id: ref.id,
      title: ref.title,
      version: 1,
      sources: ref.sources,
      chunkIndex: 0,
    };
    // All source pages do not fit chunk 0: use a single original page text as a synthetic one-page source.
    request.sources = [
      { ...ref.sources[0]!, pages: [{ page: 1, text: ref.sources[0]!.pages[6]!.text }] },
    ];
    const questions = ref.questions.map((q) => ({
      ...q,
      citations: q.citations.map((c) => ({ ...c, page: 1 })),
    }));
    const payload = {
      description: ref.description,
      questions,
      rules: [{ ...rule, citations: rule.citations.map((c) => ({ ...c, page: 1 })) }],
      unresolved: [],
    };
    expect(acceptGeneratedDefinition(payload, request).rules[0]!.formula).toBeDefined();
    expect(() =>
      acceptGeneratedDefinition(
        {
          ...payload,
          questions: questions.map((q) =>
            q.id === "capital" ? { ...q, type: "text", min: undefined } : q,
          ),
        },
        request,
      ),
    ).toThrow("campi numerici");
    expect(() =>
      acceptGeneratedDefinition(
        {
          ...payload,
          rules: [
            { ...payload.rules[0], calculation: { ...rule.calculation, baseFields: ["unknown"] } },
          ],
        },
        request,
      ),
    ).toThrow("Campo sconosciuto");
    expect(() =>
      acceptGeneratedDefinition(
        {
          ...payload,
          rules: [
            {
              ...payload.rules[0],
              citations: [
                {
                  documentId: request.sources[0]!.id,
                  page: 1,
                  quote: "Una citazione inventata che non esiste nella fonte",
                },
              ],
            },
          ],
        },
        request,
      ),
    ).toThrow("Citazione");
  });
  it("does not turn the observed calculation-plan response into a complete assessment", () => {
    const attempt = observed.attempts.find((a) => a.name === "calculation_wire")!;
    const raw = attempt.result.response as {
      rules: unknown[];
      questions: { id: string }[];
      coverage: { ruleIds: string[] }[];
    };
    expect(raw.coverage.some((c) => !c.ruleIds.length)).toBe(true);
    const compiled = compileGeneratedCalculations(raw.rules) as {
      formula?: Parameters<typeof calculate>[0];
    }[];
    expect(calculate(compiled[1]!.formula!, { spese_ammissibili: 3000 })).toBe(1500);
    // Numeric formula lowering works; the model still asks for a derived total and omits requirements.
    expect(raw.questions.some((q) => q.id === "spese_ammissibili")).toBe(true);
  });
});
