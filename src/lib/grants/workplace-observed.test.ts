import { describe, expect, it } from "vitest";
import observed from "./workplace-observed.test-support.json";
import { acceptInventory } from "./inventory";
import { parseFragment } from "./schema";

describe("real Article 5.B probe: failed model quality gate", () => {
  it("rejects the first inventory's altered original quotation", () => {
    expect(() => acceptInventory(observed.first.response, [observed.excerpt])).toThrow(
      "Citazione inventario non riscontrata",
    );
  });
  it("accepts exact retry citations without treating semantic fidelity as certified", () => {
    const inventory = acceptInventory(observed.retry.response, [observed.excerpt]);
    expect(inventory.requirements).toHaveLength(1);
    // A passing quotation check is NOT an assertion that the label's cost-cap interpretation is correct.
    expect(inventory.requirements[0]!.label).toContain("costo massimo");
    expect(inventory.requirements[0]!.citations[0]!.quote).toContain("2.270,40 euro cadauna");
  });
  it("rejects the generated field-name string in a numeric comparison, without repairing it", () => {
    const { coverage, ...generated } = observed.generation.response;
    expect(coverage).toHaveLength(1);
    expect(generated.rules[0]!.condition).toEqual({
      op: "lte",
      field: "numero_addetti",
      value: "numero_addetti",
    });
    expect(() =>
      parseFragment({
        schemaVersion: 1,
        id: "workplace_observed",
        version: 1,
        title: "Negative observed probe",
        sources: [observed.source],
        ...generated,
      }),
    ).toThrow("Confronto numerico non valido");
    // The model omitted the requested quantity and contribution formula; do not invent either during replay.
    expect(generated.questions.map((q) => q.id)).toEqual([
      "numero_addetti",
      "costo_acquisto_applicazioni",
    ]);
    expect(generated.rules.some((r) => "formula" in r)).toBe(false);
  });
});
