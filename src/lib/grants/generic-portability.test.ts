import { describe, expect, it } from "vitest";
import { testPredicate, calculate, evaluateGrant } from "./engine";
import { runScenarios, publicationProblems } from "./lifecycle";
import { nuovaImpresaReference, NUOVA_IMPRESA_CASES } from "./nuova-impresa-reference.test-support";
import { workplaceReference, WORKPLACE_CASES } from "./workplace-reference.test-support";
import { mergeFragments } from "./multipass";
import { parseDefinition, type Predicate } from "./schema";
import { acceptInventory } from "./inventory";
import nuovaSource from "./nuova-impresa-source.test-support.json";

describe("same configurable engine across different official schemes", () => {
  it.each([
    "La durata minima è definita nell’allegato 2.",
    "La formula è riportata nella tabella B.3.",
    "Sono richiesti i documenti di cui all’articolo 7.",
  ])("retains a source reference omitted from the model inventory: %s", (text) => {
    const inventory = acceptInventory({ requirements: [] }, [
      { documentId: "source", name: "Bando distinto", page: 1, text },
    ]);
    expect(inventory.requirements).toHaveLength(1);
    expect(inventory.requirements[0]!.id).toMatch(/^source_reference_/);
    expect(inventory.requirements[0]!.manualReview).toBe(true);
    expect(inventory.requirements[0]!.citations[0]!.quote).toBe(text);
  });
  it("retains the second real scheme's external definition reference without claiming it resolved", () => {
    const page = nuovaSource.source.pages[3]!.text;
    const end = page.indexOf("− lavoratori");
    expect(end).toBeGreaterThan(0);
    const inventory = acceptInventory({ requirements: [] }, [
      {
        documentId: "nuova_impresa",
        name: nuovaSource.source.name,
        page: 4,
        text: page.slice(0, end),
      },
    ]);
    expect(
      inventory.requirements.some(
        (r) => r.manualReview && r.citations[0]!.quote.includes("Allegato I"),
      ),
    ).toBe(true);
  });
  it.each(NUOVA_IMPRESA_CASES)("Nuova Impresa: $name", (scenario) => {
    expect(runScenarios(nuovaImpresaReference(), [scenario])[0]!.passed).toBe(true);
  });
  it.each(WORKPLACE_CASES)("Lazio: $name", (scenario) => {
    expect(runScenarios(workplaceReference(), [scenario])[0]!.passed).toBe(true);
  });
  it("remaps formula predicates without scheme-specific branches", () => {
    const d = nuovaImpresaReference(),
      merged = mergeFragments([d], 1);
    expect(evaluateGrant(merged, { q_1_1: 1500, q_1_2: 1500 }).grants[0]!.value).toBe(1500);
    expect(
      evaluateGrant(merged, { q_1_1: 1499.99, q_1_2: 1500 }).rules.find(
        (r) => r.label === "Investimento ammissibile minimo",
      )!.state,
    ).toBe("failed");
    expect(
      publicationProblems(d, { sources: [], items: [], scenarios: NUOVA_IMPRESA_CASES }),
    ).toContainEqual(expect.stringContaining("Riferimento parziale"));
  });
  it("propagates missing values and division by zero through numerical predicates", () => {
    const p: Predicate = {
      op: "compare",
      comparison: "gte",
      left: { op: "divide", left: { op: "field", field: "a" }, right: { op: "field", field: "b" } },
      right: { op: "constant", value: 2 },
    };
    expect(testPredicate(p, { a: 4, b: 2 })).toBe(true);
    expect(testPredicate(p, { a: 3, b: 2 })).toBe(false);
    expect(testPredicate(p, { a: 4, b: 0 })).toBeNull();
    expect(testPredicate(p, { a: 4 })).toBeNull();
    expect(
      calculate(
        {
          op: "if",
          when: p,
          then: { op: "constant", value: 10 },
          otherwise: { op: "constant", value: 0 },
        },
        { a: 4, b: 0 },
      ),
    ).toBeNull();
  });
  it("rejects nonnumeric formula dependencies and unbounded recursive input", () => {
    const d = nuovaImpresaReference();
    d.questions[0]!.type = "text";
    expect(() => parseDefinition(d)).toThrow("soltanto campi numerici");
    let predicate: Predicate = { op: "eq", field: "capital", value: 1 };
    for (let i = 0; i < 30; i++) predicate = { op: "not", arg: predicate };
    d.questions[0]!.type = "number";
    d.rules[0]!.condition = predicate;
    expect(() => parseDefinition(d)).toThrow("annidata");
  });
});
