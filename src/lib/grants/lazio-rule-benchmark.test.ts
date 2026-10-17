import { describe, expect, it } from "vitest";
import { LAZIO_RULE_CASES, lazioRuleReference } from "./lazio-rule-benchmark.test-support";
import { runScenarios, type GrantScenario } from "./lifecycle";
import { parseDefinition } from "./schema";
import observed from "./lazio-observed.test-support.json";
import { syntheticGrant, SYNTHETIC_SCENARIOS } from "./fixtures.test-support";

describe("independent partial Art. 4 rule benchmark", () => {
  it.each(LAZIO_RULE_CASES)("$name", (scenario) => {
    const [result] = runScenarios(lazioRuleReference(), [scenario]);
    expect(result!.passed).toBe(true);
  });
  it("detects wrong rule outcomes even when the overall expected result matches", () => {
    const d = syntheticGrant(),
      positive = SYNTHETIC_SCENARIOS[0]!;
    expect(runScenarios(d, [positive])[0]!.passed).toBe(true);
    expect(
      runScenarios(d, [{ ...positive, ruleStates: { impresa_attiva: "failed" } }])[0]!.passed,
    ).toBe(false);
    expect(
      runScenarios(d, [{ ...positive, ruleStates: { nonexistent_rule: "passed" } }])[0]!.passed,
    ).toBe(false);
  });
  it("explains every mismatch, distinguishing missing rules from unknown outcomes", () => {
    const [result] = runScenarios(syntheticGrant(), [
      {
        ...SYNTHETIC_SCENARIOS[0]!,
        expected: "not_eligible",
        score: 999,
        grants: { missing_grant: null },
        ruleStates: { impresa_attiva: "failed", nonexistent_rule: "unknown" },
      },
    ]);
    expect(result!.passed).toBe(false);
    expect(result!.differences).toHaveLength(5);
    expect(result!.differences).toContain("Regola impresa_attiva: atteso failed, ottenuto passed.");
    expect(result!.differences).toContain(
      "Regola nonexistent_rule: atteso unknown, ottenuto regola assente.",
    );
    expect(result!.differences).toContain(
      "Contributo missing_grant: atteso null, ottenuto regola assente.",
    );
    expect(runScenarios(syntheticGrant(), [SYNTHETIC_SCENARIOS[0]!])[0]!.differences).toEqual([]);
  });
  it("exposes the observed model's small/medium SME and previous-voucher false exclusions", () => {
    const d = parseDefinition({
      schemaVersion: 1,
      id: "observed_lazio",
      version: 1,
      title: "Observed negative benchmark",
      sources: [
        {
          id: "documento_2",
          name: "Observed input excerpt",
          sha256: "a".repeat(64),
          pages: observed.excerpts.map(({ page, text }) => ({ page, text })),
        },
      ],
      ...observed.original.response,
    });
    const questions: Record<string, string> = {
      size: "tipo_impresa",
      existing_lazio: "sede_operativa",
      previous_voucher: "contributo_precedente",
    };
    const rules: Record<string, string> = {
      size: "requisito_dimensionale",
      registry: "missing_registry",
      seat: "sede_operativa_lazio",
      previous: "contributo_precedente_ammissibile",
    };
    // Only explicit field-name correspondence; no rewriting or repairing model logic.
    const mapped: GrantScenario[] = LAZIO_RULE_CASES.map((s) => ({
      ...s,
      answers: Object.fromEntries(
        Object.entries(s.answers).map(([key, value]) => [
          questions[key] ?? `unsupported_${key}`,
          value,
        ]),
      ),
      ruleStates: Object.fromEntries(
        Object.entries(s.ruleStates!).map(([key, value]) => [rules[key]!, value]),
      ),
    }));
    const results = runScenarios(d, mapped);
    for (const name of [
      "PMI Piccola",
      "PMI Media",
      "Precedente voucher: richiesta già presentata e tipologia diversa",
      "Sede acquisita entro erogazione e piano completo in domanda",
    ])
      expect(results.find((r) => r.name === name)!.passed, name).toBe(false);
    expect(results.some((r) => r.passed)).toBe(true);
    expect(results.some((r) => !r.passed)).toBe(true);
  });
});
