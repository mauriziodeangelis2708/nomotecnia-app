import {
  parseDefinition,
  type Expression,
  type GrantAnswers,
  type GrantDefinition,
  type Predicate,
  type Scalar,
} from "./schema";

export type Truth = boolean | null;
export function configurationIssues(d: GrantDefinition): string[] {
  return [
    ...new Set([
      ...d.unresolved,
      ...(d.requirements ?? [])
        .filter((r) => r.gap || !r.questionIds.length || !r.ruleIds.length)
        .map(
          (r) =>
            `Requisito da verificare: ${r.label} — ${r.gap ?? "Copertura di domande e regole incompleta."}`,
        ),
    ]),
  ];
}
const has = (a: GrantAnswers, key: string) =>
  Object.hasOwn(a, key) && a[key] !== null && a[key] !== undefined && a[key] !== "";
export function testPredicate(p: Predicate, a: GrantAnswers): Truth {
  if (p.op === "all" || p.op === "any") {
    const states = p.args.map((x) => testPredicate(x, a));
    return p.op === "all"
      ? states.includes(false)
        ? false
        : states.includes(null)
          ? null
          : true
      : states.includes(true)
        ? true
        : states.includes(null)
          ? null
          : false;
  }
  if (p.op === "not") {
    const value = testPredicate(p.arg, a);
    return value === null ? null : !value;
  }
  if (!("field" in p) || !has(a, p.field)) return null;
  const value = a[p.field];
  if (p.op === "in") return p.values.some((v) => v === value);
  if (p.op === "eq") return value === p.value;
  if (p.op === "ne") return value !== p.value;
  if (typeof value !== "number" || typeof p.value !== "number" || !Number.isFinite(value))
    return null;
  if (p.op === "gt") return value > p.value;
  if (p.op === "gte") return value >= p.value;
  if (p.op === "lt") return value < p.value;
  return value <= p.value;
}
export function calculate(e: Expression, a: GrantAnswers): number | null {
  let value: number;
  if (e.op === "constant") return e.value;
  if (e.op === "field")
    return typeof a[e.field] === "number" && Number.isFinite(a[e.field])
      ? (a[e.field] as number)
      : null;
  if (e.op === "if") {
    const when = testPredicate(e.when, a);
    return when === null ? null : calculate(when ? e.then : e.otherwise, a);
  }
  if ("args" in e) {
    const values = e.args.map((arg) => calculate(arg, a));
    if (values.includes(null)) return null;
    const ns = values as number[];
    value =
      e.op === "add"
        ? ns.reduce((x, y) => x + y, 0)
        : e.op === "multiply"
          ? ns.reduce((x, y) => x * y, 1)
          : e.op === "min"
            ? Math.min(...ns)
            : Math.max(...ns);
  } else {
    const left = calculate(e.left, a),
      right = calculate(e.right, a);
    if (left === null || right === null || (e.op === "divide" && right === 0)) return null;
    value = e.op === "subtract" ? left - right : left / right;
  }
  return Number.isFinite(value) && Math.abs(value) <= 1e12 ? value : null;
}
export function activeAnswers(d: GrantDefinition, raw: GrantAnswers) {
  const answers: GrantAnswers = {},
    visible = new Set<string>(),
    pending = new Set<string>();
  for (const q of d.questions) {
    const state = q.showIf ? testPredicate(q.showIf, answers) : true;
    if (state === null) pending.add(q.id);
    if (state !== true) continue;
    visible.add(q.id);
    const value: Scalar | null | undefined = Object.hasOwn(raw, q.id) ? raw[q.id] : undefined;
    const valid =
      q.type === "boolean"
        ? typeof value === "boolean"
        : q.type === "number"
          ? typeof value === "number" &&
            Number.isFinite(value) &&
            Math.abs(value) <= 1e12 &&
            (q.min === undefined || value >= q.min) &&
            (q.max === undefined || value <= q.max)
          : typeof value === "string" &&
            value.trim().length > 0 &&
            value.length <= 4000 &&
            (q.type !== "select" || q.options?.some((o) => o.value === value));
    if (valid) answers[q.id] = value!;
  }
  return { answers, visible, pending };
}
export function evaluateGrant(input: unknown, raw: GrantAnswers) {
  const d = parseDefinition(input);
  const { answers, visible, pending } = activeAnswers(d, raw);
  const missing = d.questions
    .filter((q) => q.required && ((visible.has(q.id) && !has(answers, q.id)) || pending.has(q.id)))
    .map((q) => q.id);
  const rules = d.rules.map((r) => {
    const when = r.when ? testPredicate(r.when, answers) : true;
    if (when === false) return { ...r, state: "not_applicable" as const, value: null };
    if (when === null) return { ...r, state: "unknown" as const, value: null };
    if (r.formula) {
      const value = calculate(r.formula, answers);
      if (value === null || value < 0 || (r.maximum !== undefined && value > r.maximum))
        return { ...r, state: "unknown" as const, value: null };
      return {
        ...r,
        state: "calculated" as const,
        value: r.kind === "grant" ? Math.round((value + Number.EPSILON) * 100) / 100 : value,
      };
    }
    const condition = testPredicate(r.condition!, answers);
    const pass = condition === null ? null : r.kind === "exclusion" ? !condition : condition;
    return {
      ...r,
      state:
        pass === null ? ("unknown" as const) : pass ? ("passed" as const) : ("failed" as const),
      value: null,
    };
  });
  const failed = rules.filter(
    (r) => r.state === "failed" && ["eligibility", "exclusion"].includes(r.kind),
  );
  const applicableEligibility = rules.some(
    (r) => ["eligibility", "exclusion"].includes(r.kind) && r.state !== "not_applicable",
  );
  const incomplete =
    !applicableEligibility ||
    !!missing.length ||
    rules.some((r) => r.state === "unknown") ||
    configurationIssues(d).length > 0 ||
    rules.some((r) => r.kind === "document" && r.state === "failed");
  return {
    status: failed.length
      ? ("not_eligible" as const)
      : incomplete
        ? ("incomplete" as const)
        : ("pre_eligible" as const),
    missing,
    rules,
    score: rules.some((r) => r.kind === "score" && r.state === "unknown")
      ? null
      : rules.filter((r) => r.kind === "score").reduce((sum, r) => sum + (r.value ?? 0), 0),
    grants: rules.filter((r) => r.kind === "grant"),
    definitionId: d.id,
    version: d.version,
  };
}
