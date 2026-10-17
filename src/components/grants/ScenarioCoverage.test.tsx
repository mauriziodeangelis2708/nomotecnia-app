import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ruleScenarioCoverage, type GrantScenario } from "@/lib/grants/lifecycle";
import {
  syntheticGrant,
  SYNTHETIC_SCENARIOS,
  SYNTHETIC_ANSWERS,
} from "@/lib/grants/fixtures.test-support";
import { ScenarioCoverage } from "./ScenarioCoverage";

describe("independent scenario coverage", () => {
  const d = syntheticGrant();
  const cases: GrantScenario[] = [
    {
      ...SYNTHETIC_SCENARIOS[0]!,
      name: "Attiva verificata",
      ruleStates: { impresa_attiva: "passed" },
    },
    {
      name: "Inattiva verificata",
      answers: { ...SYNTHETIC_ANSWERS, attiva: false },
      expected: "not_eligible",
      ruleStates: { impresa_attiva: "failed" },
    },
    { ...SYNTHETIC_SCENARIOS[2]!, name: "Stato ignoto", ruleStates: { impresa_attiva: "unknown" } },
  ];
  it("never infers per-rule coverage from three passing overall cases", () => {
    const rows = ruleScenarioCoverage(d, SYNTHETIC_SCENARIOS);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.missing.join(",") === "passed,failed")).toBe(true);
    expect(rows.some((r) => r.id === "contributo")).toBe(false);
  });
  it("counts only explicit rule expectations from fully passing cases", () => {
    const row = ruleScenarioCoverage(d, cases)[0]!;
    expect(row.cases).toEqual({
      passed: ["Attiva verificata"],
      failed: ["Inattiva verificata"],
      unknown: ["Stato ignoto"],
      not_applicable: [],
    });
    expect(row.missing).toEqual([]);
    const wrong = ruleScenarioCoverage(d, [{ ...cases[0]!, score: 999 }])[0]!;
    expect(wrong.cases.passed).toEqual([]);
  });
  it("shows missing negative coverage beside the precise rule in the review", () => {
    render(<ScenarioCoverage definition={d} scenarios={[cases[0]!]} />);
    const row = screen.getByRole("rowheader", { name: /Impresa attiva/ }).closest("tr")!;
    expect(within(row).getByText("Attiva verificata")).toBeInTheDocument();
    expect(within(row).getByText(/Da collaudare: esito negativo/)).toBeInTheDocument();
    expect(screen.getByText(/riepilogo è informativo/)).toBeInTheDocument();
  });
});
