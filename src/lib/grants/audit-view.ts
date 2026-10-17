import { activeAnswers, evaluateRule } from "./engine";
import type { GrantAnswers, GrantDefinition } from "./schema";

/** These are behavioral samples, NOT normative expectations or completeness tests. */
export function auditExecutableView(d: GrantDefinition) {
  const thresholds = new Set<number>();
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (
      ["gt", "gte", "lt", "lte", "eq", "ne"].includes(String(n["op"])) &&
      typeof n["value"] === "number"
    )
      thresholds.add(n["value"]);
    for (const v of Object.values(n))
      if (Array.isArray(v)) v.forEach(walk);
      else walk(v);
  };
  d.rules.forEach((r) => {
    walk(r.when);
    walk(r.condition);
  });
  // Bound the diagnostic samples explicitly; never truncate the source, rules or questions.
  const candidates = [...new Set([0, 1, ...[...thresholds].flatMap((n) => [n, n - 1, n + 1])])];
  const seeds = candidates.filter((n) => Number.isFinite(n) && Math.abs(n) <= 1e12).slice(0, 6);
  const probes = seeds.map((seed, index) => {
    const raw: GrantAnswers = Object.fromEntries(
      d.questions.map((q) => [
        q.id,
        q.type === "number"
          ? seed
          : q.type === "boolean"
            ? index % 2 === 1
            : q.type === "select"
              ? (q.options?.[index % (q.options.length || 1)]?.value ?? null)
              : "dato sintetico",
      ]),
    );
    const { answers } = activeAnswers(d, raw);
    return {
      hypotheticalAnswers: raw,
      acceptedAnswers: answers,
      ruleResults: d.rules.map((r) => {
        const { id, state, value } = evaluateRule(r, answers);
        return { id, state, value };
      }),
    };
  });
  const view = {
    diagnosticScope:
      "Campioni sintetici limitati: esecuzioni effettive delle regole, non esiti normativi attesi, dati cliente o prove di correttezza. Confrontare il comportamento con la fonte. Nomi e descrizioni delle domande sono ipotesi del generatore.",
    questions: d.questions.map(({ citations, ...q }) => {
      void citations;
      return q;
    }),
    rules: d.rules.map(({ id, kind, when, condition, formula, maximum }) => ({
      id,
      kind,
      when,
      condition,
      formula,
      maximum,
    })),
    probes,
    omittedNumericSampleCount: Math.max(0, candidates.length - seeds.length),
  };
  if (JSON.stringify(view).length > 45000)
    throw new Error("Controllo operativo troppo esteso: nessuna bozza verificabile.");
  return view;
}
