import { ruleScenarioCoverage, type GrantScenario } from "@/lib/grants/lifecycle";
import type { GrantDefinition } from "@/lib/grants/schema";

export function ScenarioCoverage({
  definition,
  scenarios,
}: {
  definition: GrantDefinition;
  scenarios: GrantScenario[];
}) {
  const coverage = ruleScenarioCoverage(definition, scenarios);
  return (
    <section className="space-y-2" aria-label="Copertura dei casi per regola">
      <h4 className="font-semibold">Copertura dei casi per regola</h4>
      <p className="text-sm">
        Contano solo i casi superati con un esito atteso esplicito per la singola regola. Un
        risultato complessivo corretto non dimostra che ogni condizione sia corretta. Questo
        riepilogo è informativo e non certifica la completezza del bando.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2">Regola</th>
              <th className="p-2">Regola superata</th>
              <th className="p-2">Regola non superata</th>
              <th className="p-2">Non verificato</th>
              <th className="p-2">Non applicabile</th>
            </tr>
          </thead>
          <tbody>
            {coverage.map((rule) => (
              <tr className="border-t" key={rule.id}>
                <th scope="row" className="p-2 font-normal">
                  {rule.label}
                  {rule.missing.length > 0 && (
                    <span className="block text-destructive">
                      Da collaudare:{" "}
                      {rule.missing
                        .map((s) => (s === "passed" ? "esito positivo" : "esito negativo"))
                        .join(", ")}
                      .
                    </span>
                  )}
                </th>
                {(["passed", "failed", "unknown", "not_applicable"] as const).map((state) => (
                  <td className="p-2" key={state}>
                    {rule.cases[state].length}
                    {rule.cases[state].length > 0 && (
                      <ul>
                        {rule.cases[state].map((name, i) => (
                          <li key={i}>{name}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
