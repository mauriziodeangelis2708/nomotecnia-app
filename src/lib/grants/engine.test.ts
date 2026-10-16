import { describe, expect, it } from "vitest";
import { parseDefinition, type GrantAnswers, type Predicate } from "./schema";
import { activeAnswers, calculate, evaluateGrant, testPredicate } from "./engine";
import { publicationProblems, runScenarios } from "./lifecycle";
import { acceptGeneratedDefinition, generationRequest } from "./generation";
import {
  syntheticGrant,
  syntheticReview,
  SYNTHETIC_ANSWERS as good,
} from "./fixtures.test-support";

describe("configurable grant engine", () => {
  it.each([
    [13999.99, "not_eligible"],
    [14000, "pre_eligible"],
    [14000.01, "pre_eligible"],
  ])("handles exact boundary %s", (amount, expected) =>
    expect(evaluateGrant(syntheticGrant(), { ...good, investimento: amount }).status).toBe(
      expected,
    ),
  );
  it("caps contribution and calculates independent expected points", () => {
    const r = evaluateGrant(syntheticGrant(), { ...good, investimento: 25000, certificata: true });
    expect(r.grants[0]?.value).toBe(10000);
    expect(r.score).toBe(5);
  });
  it("exclusion wins over otherwise positive requirements", () =>
    expect(evaluateGrant(syntheticGrant(), { ...good, procedura: true }).status).toBe(
      "not_eligible",
    ));
  it.each([null, "", "14000", Number.NaN, Number.POSITIVE_INFINITY, -5])(
    "does not coerce invalid input %s",
    (value) => {
      const r = evaluateGrant(syntheticGrant(), { ...good, investimento: value } as GrantAnswers);
      expect(r.status).toBe("incomplete");
      expect(r.grants[0]?.value).toBeNull();
      expect(r.missing).toContain("investimento");
    },
  );
  it("does not turn unknown score into zero", () => {
    const r = evaluateGrant(syntheticGrant(), { ...good, certificata: null });
    expect(r.score).toBeNull();
    expect(r.status).toBe("incomplete");
  });
  it("implements three-valued compound logic", () => {
    const p: Predicate = {
      op: "all",
      args: [
        { op: "eq", field: "a", value: true },
        { op: "not", arg: { op: "eq", field: "b", value: true } },
      ],
    };
    expect(testPredicate(p, { a: true })).toBeNull();
    expect(testPredicate(p, { a: false })).toBe(false);
    expect(testPredicate(p, { a: true, b: false })).toBe(true);
    expect(
      testPredicate(
        { op: "any", args: [p, { op: "in", field: "c", values: ["ok"] }] },
        { c: "ok" },
      ),
    ).toBe(true);
  });
  it("does not use stale answers hidden by a changed branch", () => {
    const d = syntheticGrant();
    d.questions[2]!.showIf = { op: "eq", field: "attiva", value: true };
    const a = { ...good, attiva: false, investimento: 50000 };
    expect(activeAnswers(d, a).answers["investimento"]).toBeUndefined();
    expect(evaluateGrant(d, a).grants[0]?.value).toBeNull();
  });
  it("does not declare eligibility when every eligibility rule is inapplicable", () => {
    const d = syntheticGrant();
    d.rules.forEach((r) => {
      r.when = { op: "eq", field: "attiva", value: false };
    });
    expect(evaluateGrant(d, good).status).toBe("incomplete");
  });
  it("treats divide by zero and overflow as unknown", () => {
    expect(
      calculate(
        { op: "divide", left: { op: "constant", value: 4 }, right: { op: "constant", value: 0 } },
        {},
      ),
    ).toBeNull();
    expect(
      calculate(
        {
          op: "multiply",
          args: [
            { op: "constant", value: 1e12 },
            { op: "constant", value: 1e12 },
          ],
        },
        {},
      ),
    ).toBeNull();
  });
  it("does not silently clamp a formula exceeding its declared maximum", () => {
    const d = syntheticGrant();
    d.rules[3]!.maximum = 5000;
    expect(evaluateGrant(d, good).grants[0]?.state).toBe("unknown");
  });
  it("unresolved requirements prevent positive result and activation", () => {
    const d = syntheticGrant();
    d.unresolved = ["Manca allegato 2"];
    expect(evaluateGrant(d, good).status).toBe("incomplete");
    expect(publicationProblems(d, syntheticReview())).toContain("Manca allegato 2");
  });
});
describe("untrusted definitions and lifecycle", () => {
  it("accepts only citations present on the specified page", () => {
    const d = syntheticGrant();
    d.rules[0]!.citations = [
      { documentId: "avviso", page: 1, quote: "Una norma completamente inventata" },
    ];
    expect(() => parseDefinition(d)).toThrow("Citazione");
  });
  it("rejects missing or reordered pages", () => {
    const d = syntheticGrant();
    d.sources[0]!.pages[0]!.page = 2;
    expect(() => parseDefinition(d)).toThrow("Pagine");
  });
  it("rejects duplicate questions and unknown fields", () => {
    const d = syntheticGrant();
    d.questions.push(d.questions[0]!);
    expect(() => parseDefinition(d)).toThrow("duplicata");
    d.questions.pop();
    d.rules[0]!.condition = { op: "eq", field: "inesistente", value: true };
    expect(() => parseDefinition(d)).toThrow("sconosciuto");
  });
  it("rejects future or cyclic visibility dependencies", () => {
    const d = syntheticGrant();
    d.questions[0]!.showIf = { op: "eq", field: "procedura", value: false };
    expect(() => parseDefinition(d)).toThrow("dipendenza futura");
  });
  it("rejects scripts and incompatible numeric comparisons", () => {
    expect(() => parseDefinition({ ...syntheticGrant(), script: "alert(1)" })).toThrow();
    const d = syntheticGrant();
    d.rules[0]!.condition = { op: "gte", field: "attiva", value: 1 };
    expect(() => parseDefinition(d)).toThrow("numerico");
    d.rules[0]!.condition = { op: "eq", field: "attiva", value: "true" };
    expect(() => parseDefinition(d)).toThrow("incompatibile");
  });
  it("rejects deeply nested or oversized output", () => {
    let nested: unknown = {};
    for (let i = 0; i < 30; i++) nested = { a: nested };
    expect(() => parseDefinition(nested)).toThrow("annidata");
    expect(() => parseDefinition({ x: "a".repeat(1500001) })).toThrow("1,5 MB");
  });
  it("rejects prototype-related keys", () =>
    expect(() => parseDefinition(JSON.parse('{"__proto__":{"admin":true}}'))).toThrow("Chiave"));
  it("requires review of every page, including uncited pages", () => {
    const d = syntheticGrant();
    d.sources[0]!.pages.push({ page: 2, text: "Allegato aggiuntivo da revisionare." });
    expect(publicationProblems(d, syntheticReview()).join(" ")).toContain("tutte le pagine");
  });
  it("requires individual review and all three test outcomes", () => {
    const review = syntheticReview();
    review.items = [];
    review.scenarios = review.scenarios.slice(0, 1);
    const problems = publicationProblems(syntheticGrant(), review).join(" ");
    expect(problems).toContain("ogni regola");
    expect(problems).toContain("uno escluso");
  });
  it("checks independent expected amounts and points", () => {
    const review = syntheticReview();
    expect(runScenarios(syntheticGrant(), review.scenarios).every((s) => s.passed)).toBe(true);
    expect(publicationProblems(syntheticGrant(), review)).toEqual([]);
    review.scenarios[0]!.grants = { contributo: 9999 };
    expect(publicationProblems(syntheticGrant(), review).join(" ")).toContain("risultato atteso");
  });
  it("keeps caller identity and sources instead of model replacements", () => {
    const d = syntheticGrant(),
      { description, questions, rules, unresolved } = d;
    const request = generationRequest.parse({
      id: d.id,
      version: 1,
      title: d.title,
      sources: d.sources,
    });
    expect(
      acceptGeneratedDefinition({ description, questions, rules, unresolved }, request),
    ).toEqual(d);
    expect(() =>
      acceptGeneratedDefinition(
        { description, questions, rules, unresolved, sources: [] },
        request,
      ),
    ).toThrow();
  });
  it("rejects oversized or blank sources without truncation", () => {
    const d = syntheticGrant(),
      req = { id: d.id, version: 1, title: d.title, sources: d.sources };
    d.sources[0]!.pages = [1, 2, 3].map((page) => ({ page, text: "a".repeat(200001) }));
    expect(() => generationRequest.parse(req)).toThrow("non verrà troncato");
    d.sources[0]!.pages = [{ page: 1, text: "" }];
    expect(() => generationRequest.parse(req)).toThrow("priva di testo");
  });
});
