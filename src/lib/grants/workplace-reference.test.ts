import { describe, expect, it } from "vitest";
import { workplaceReference, WORKPLACE_CASES } from "./workplace-reference.test-support";
import { runScenarios, publicationProblems } from "./lifecycle";
import { parseDefinition } from "./schema";

describe("independent partial Article 5.B numerical reference", () => {
  it.each(WORKPLACE_CASES)("$name", (scenario) => {
    expect(runScenarios(workplaceReference(), [scenario])[0]!.passed).toBe(true);
  });
  it("keeps a correct partial reference blocked from operational publication", () => {
    expect(
      publicationProblems(workplaceReference(), {
        sources: [],
        items: [],
        scenarios: WORKPLACE_CASES,
      }),
    ).toContainEqual(expect.stringContaining("Riferimento numerico parziale"));
  });
  it("rejects integer flags on nonnumeric questions and preserves legacy numbers", () => {
    const d = workplaceReference();
    d.questions[0]!.type = "text";
    expect(() => parseDefinition(d)).toThrow("vincolo intero");
    d.questions[0]!.type = "number";
    delete d.questions[0]!.integer;
    expect(() => parseDefinition(d)).not.toThrow();
  });
});
