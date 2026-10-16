import { evaluateGrant } from "./engine";
import { parseDefinition, type GrantAnswers, type GrantDefinition } from "./schema";
import { z } from "zod";

export const scenarioSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    answers: z.record(z.union([z.string().max(4000), z.number().finite(), z.boolean(), z.null()])),
    expected: z.enum(["pre_eligible", "not_eligible", "incomplete"]),
    score: z.number().finite().nonnegative().nullable().optional(),
    grants: z.record(z.number().finite().nonnegative().nullable()).optional(),
  })
  .strict();
export type GrantScenario = z.infer<typeof scenarioSchema>;
export interface GrantReview {
  sources: string[];
  items: string[];
  scenarios: GrantScenario[];
}
export const sourceReviewKey = (id: string, page: number) => `${id}:${page}`;
export function runScenarios(d: GrantDefinition, scenarios: GrantScenario[]) {
  return scenarios.map((raw) => {
    const test = scenarioSchema.parse(raw),
      actual = evaluateGrant(d, test.answers as GrantAnswers);
    return {
      name: test.name,
      passed:
        actual.status === test.expected &&
        (test.score === undefined || actual.score === test.score) &&
        Object.entries(test.grants ?? {}).every(([id, amount]) =>
          actual.grants.some((r) => r.id === id && r.value === amount),
        ),
      actual,
    };
  });
}
export function publicationProblems(input: unknown, review: GrantReview): string[] {
  const d = parseDefinition(input),
    problems = [...d.unresolved];
  if (
    d.sources.some((s) =>
      s.pages.some((p) => !review.sources.includes(sourceReviewKey(s.id, p.page))),
    )
  )
    problems.push("Revisionare tutte le pagine delle fonti, incluse quelle senza regole estratte.");
  if (
    d.questions.some((q) => !review.items.includes(`question:${q.id}`)) ||
    d.rules.some((r) => !review.items.includes(`rule:${r.id}`))
  )
    problems.push("Revisionare ogni domanda e ogni regola.");
  const expectations = review.scenarios.map((s) => s.expected);
  if (
    !["pre_eligible", "not_eligible", "incomplete"].every((s) =>
      expectations.includes(s as GrantScenario["expected"]),
    )
  )
    problems.push(
      "Servono almeno un caso ammissibile, uno escluso e uno incompleto, con esiti attesi indipendenti.",
    );
  if (review.scenarios.length > 50) problems.push("Massimo 50 scenari di collaudo.");
  if (runScenarios(d, review.scenarios).some((s) => !s.passed))
    problems.push("Almeno uno scenario non corrisponde al risultato atteso.");
  for (const r of d.rules.filter((r) => ["score", "grant"].includes(r.kind))) {
    if (
      !review.scenarios.some((s) =>
        r.kind === "score"
          ? s.score !== undefined && s.score !== null
          : s.grants?.[r.id] !== undefined && s.grants[r.id] !== null,
      )
    )
      problems.push(`Manca un risultato numerico atteso per ${r.label}.`);
  }
  return [...new Set(problems)];
}
export async function definitionHash(d: GrantDefinition): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(parseDefinition(d)));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
