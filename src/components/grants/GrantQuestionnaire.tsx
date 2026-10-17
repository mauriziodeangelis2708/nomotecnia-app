import { activeAnswers, configurationIssues, evaluateGrant } from "@/lib/grants/engine";
import type { GrantAnswers, GrantDefinition } from "@/lib/grants/schema";
import { Input } from "@/components/ui/input";

import { GRANT_STATUS } from "@/lib/grants/status";

export function GrantQuestionnaire({
  definition,
  answers,
  onChange,
}: {
  definition: GrantDefinition;
  answers: GrantAnswers;
  onChange: (a: GrantAnswers) => void;
}) {
  const { visible } = activeAnswers(definition, answers);
  let previousSection = "";
  return (
    <div className="space-y-5">
      {definition.questions
        .filter((q) => visible.has(q.id))
        .map((q) => {
          const heading = q.section !== previousSection;
          previousSection = q.section;
          const value = answers[q.id];
          return (
            <div key={q.id} className="min-w-0 space-y-2">
              {heading && <h2 className="pt-4 text-lg font-semibold">{q.section}</h2>}
              <label className="block space-y-1 text-sm">
                <span className="break-words">
                  {q.label} {q.required && "*"} {q.unit && `(${q.unit})`}
                </span>
                {q.type === "boolean" || q.type === "select" ? (
                  <select
                    className="block w-full min-w-0 rounded-md border bg-background p-2"
                    value={value === null || value === undefined ? "" : String(value)}
                    onChange={(e) =>
                      onChange({
                        ...answers,
                        [q.id]:
                          e.target.value === ""
                            ? null
                            : q.type === "boolean"
                              ? e.target.value === "true"
                              : e.target.value,
                      })
                    }
                  >
                    <option value="">Da verificare</option>
                    {q.type === "boolean" ? (
                      <>
                        <option value="true">Sì</option>
                        <option value="false">No</option>
                      </>
                    ) : (
                      q.options?.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <Input
                    type={q.type === "number" ? "number" : "text"}
                    step="any"
                    min={q.min}
                    max={q.max}
                    maxLength={4000}
                    value={typeof value === "number" || typeof value === "string" ? value : ""}
                    onChange={(e) =>
                      onChange({
                        ...answers,
                        [q.id]:
                          e.target.value === ""
                            ? null
                            : q.type === "number"
                              ? e.target.valueAsNumber
                              : e.target.value,
                      })
                    }
                  />
                )}
              </label>
              {q.help && <p className="text-sm text-muted-foreground">{q.help}</p>}
              <p className="break-words text-xs text-muted-foreground">
                {q.citations
                  .map(
                    (c) =>
                      `${definition.sources.find((s) => s.id === c.documentId)?.name} · p. ${c.page}`,
                  )
                  .join("; ")}
              </p>
            </div>
          );
        })}
    </div>
  );
}
export function GrantResult({
  definition,
  answers,
  company,
}: {
  definition: GrantDefinition;
  answers: GrantAnswers;
  company?: string | undefined;
}) {
  const result = evaluateGrant(definition, answers);
  const active = activeAnswers(definition, answers);
  return (
    <article className="min-w-0 space-y-4 break-words">
      {company && <h1 className="text-2xl font-semibold">{company}</h1>}
      <h2 className="text-xl font-semibold">
        {definition.title} · versione {definition.version}
      </h2>
      <p>{definition.description}</p>
      <p className="font-semibold">{GRANT_STATUS[result.status]}</p>
      <p className="text-sm">
        Valutazione preliminare secondo la versione indicata; non costituisce concessione del
        contributo.
      </p>
      {result.missing.length > 0 && (
        <p>
          Risposte richieste mancanti o non valide:{" "}
          {result.missing
            .map((id) => definition.questions.find((q) => q.id === id)?.label)
            .join("; ")}
        </p>
      )}
      {configurationIssues(definition).map((s, i) => (
        <p role="alert" key={i}>
          {s}
        </p>
      ))}
      {result.rules.map((r) => (
        <section key={r.id} className="break-inside-avoid rounded-md border p-3 text-sm">
          <h3 className="font-semibold">{r.label}</h3>
          <p>
            {r.state === "calculated"
              ? `${r.value?.toLocaleString("it-IT")} ${r.kind === "grant" ? "EUR" : "punti"}`
              : {
                  passed: "Soddisfatta",
                  failed: "Non soddisfatta / causa ostativa",
                  unknown: "Da verificare",
                  not_applicable: "Non applicabile",
                }[r.state]}
          </p>
          {r.citations.map((c, i) => (
            <blockquote className="mt-2 border-l-2 pl-2 text-xs text-muted-foreground" key={i}>
              {definition.sources.find((s) => s.id === c.documentId)?.name} · pagina {c.page}: «
              {c.quote}»
            </blockquote>
          ))}
        </section>
      ))}
      <h2 className="font-semibold">Risposte utilizzate</h2>
      {definition.questions
        .filter((q) => active.visible.has(q.id))
        .map((q) => (
          <p key={q.id} className="text-sm">
            {q.label}:{" "}
            {active.answers[q.id] === true
              ? "Sì"
              : active.answers[q.id] === false
                ? "No"
                : (active.answers[q.id] ?? "Da verificare / valore non valido")}
          </p>
        ))}
      <h2 className="font-semibold">Fonti</h2>
      {definition.sources.map((s) => (
        <p key={s.id} className="break-all text-xs">
          {s.name} · SHA-256 {s.sha256}
        </p>
      ))}
    </article>
  );
}
