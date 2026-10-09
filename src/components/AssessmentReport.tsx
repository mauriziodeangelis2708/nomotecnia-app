import type { ReactNode } from "react";
import { evaluate, type Answers, type RuleMap } from "@/lib/engine";
import { STEPS } from "@/lib/questions";
import { CHECKLIST, DOC_STATUS, eur, dt } from "@/lib/checklist";
import {
  assessIperammortamento,
  calculateIperUplift,
  IPER_VERSION,
  type IperAnswers,
} from "@/lib/iperammortamento";
import { IPER_REPORT_FIELDS, IVV_FIELDS, FER_FIELDS } from "@/lib/iper-report-fields";
import { ResultView } from "./ResultView";
import { Disclaimer } from "./StatusBadge";
import { Brand } from "./Brand";

export function isIperAssessment(a: { answers: unknown; title: string }) {
  const marker = (a.answers as Answers | null)?.["_assessment_type"];
  return marker ? marker === "iperammortamento_2026" : a.title.startsWith("Iperammortamento 2026");
}
type Evidence = {
  id: string;
  title: string;
  kind: string;
  amount: number | null;
  description: string | null;
  reference: string | null;
  intervention: string | null;
  created_at: string;
};
type Note = { id: string; section: string | null; body: string; created_at: string };
export interface ReportData {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  answers: unknown;
  checklist: unknown;
  clients: {
    ragione_sociale: string;
    partita_iva: string | null;
    comune: string | null;
    referente: string | null;
  } | null;
}
export function displayAnswer(
  value: unknown,
  options?: readonly { value: string; label: string }[],
): string {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && !value.length)
  )
    return "Non compilato";
  if (Array.isArray(value)) return value.map((v) => displayAnswer(v, options)).join("; ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  const labels: Record<string, string> = {
    si: "Sì",
    no: "No",
    non_so: "Non so / da verificare",
    nonso: "Non so / da verificare",
  };
  return (
    options?.find((o) => o.value === String(value))?.label || labels[String(value)] || String(value)
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="report-section space-y-3">
      <h2 className="border-b pb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Answer({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="report-answer border-b py-2 text-sm">
      <dt className="font-medium">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{value}</dd>
    </div>
  );
}
function Items({ title, items }: { title: string; items: string[] }) {
  return items.length ? (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  ) : null;
}
function RowAnswers({
  value,
  fields,
}: {
  value: unknown;
  fields: readonly (readonly [string, string])[];
}) {
  let rows: unknown;
  try {
    rows = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return <p>Dati non interpretabili: {String(value)}</p>;
  }
  if (!Array.isArray(rows) || !rows.length) return <p>Non compilato</p>;
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i}>
          <h3 className="font-semibold">Scheda {i + 1}</h3>
          <dl>
            {fields.map(([key, label]) => (
              <Answer key={key} label={label} value={displayAnswer(row?.[key])} />
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
export function AssessmentReport({
  assessment: a,
  rules,
  evidences = [],
  notes = [],
}: {
  assessment: ReportData;
  rules: RuleMap;
  evidences?: Evidence[];
  notes?: Note[];
}) {
  const answers = (a.answers ?? {}) as Answers;
  const iper = isIperAssessment(a);
  const cl = (a.checklist ?? {}) as Record<string, { status: string; note?: string }>;
  const known = new Set<string>(["_assessment_type"]);
  const groups: { title: string; fields: { id: string; label: string; value: ReactNode }[] }[] = [];
  if (iper) {
    for (const q of IPER_REPORT_FIELDS) {
      if (!q.showIf(answers as IperAnswers)) continue;
      known.add(q.id);
      let group = groups.find((g) => g.title === q.section);
      if (!group) {
        group = { title: q.section, fields: [] };
        groups.push(group);
      }
      group.fields.push({
        id: q.id,
        label: q.label(answers as IperAnswers),
        value:
          q.id === "beni_ivv_json" || q.id === "impianti_fer_json" ? (
            <RowAnswers
              value={answers[q.id]}
              fields={q.id === "beni_ivv_json" ? IVV_FIELDS : FER_FIELDS}
            />
          ) : (
            displayAnswer(answers[q.id], q.options)
          ),
      });
    }
  } else {
    for (const step of STEPS) {
      const fields = step
        .questions(rules)
        .filter((q) => !q.showIf || q.showIf(answers))
        .map((q) => {
          known.add(q.id);
          return { id: q.id, label: q.label, value: displayAnswer(answers[q.id], q.options) };
        });
      groups.push({ title: step.title, fields });
    }
  }
  const extra = Object.entries(answers).filter(
    ([k, v]) => !known.has(k) && v !== null && v !== undefined && v !== "",
  );
  const result = iper ? assessIperammortamento(answers as IperAnswers) : null;
  const cost =
    typeof answers["costo_ammissibile"] === "number" &&
    Number.isFinite(answers["costo_ammissibile"])
      ? answers["costo_ammissibile"]
      : null;
  const uplift = cost !== null ? calculateIperUplift(cost) : null;
  return (
    <article className="print-page report-document space-y-7 rounded-lg border bg-card p-4 shadow-sm sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <Brand />
        <p className="text-xs text-muted-foreground">
          Report preliminare ·{" "}
          {iper ? "Iperammortamento 2026" : "Voucher Digitalizzazione PMI Lazio"}
          <br />
          Generato il {new Date().toLocaleDateString("it-IT")}
        </p>
      </header>
      <div>
        <h1 className="font-display text-2xl">{a.clients?.ragione_sociale || "Impresa"}</h1>
        <p>{a.title}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Valutazione {a.id}
          <br />
          Ultimo salvataggio: {dt(a.updated_at)} · Stato registrato: {a.status}
        </p>
      </div>
      <Disclaimer />
      <p className="text-sm">
        Il report include i dati salvati della singola valutazione. Campi non compilati e controlli
        da verificare non equivalgono a requisiti soddisfatti. L’esito è ricalcolato con le regole
        correnti e non costituisce concessione dell’agevolazione.
      </p>
      <Section title="Scheda cliente">
        <dl className="grid gap-x-5 sm:grid-cols-2">
          {[
            ["Ragione sociale", a.clients?.ragione_sociale],
            ["Partita IVA", a.clients?.partita_iva],
            ["Comune", a.clients?.comune],
            ["Referente", a.clients?.referente],
          ].map(([k, v]) => (
            <Answer key={k} label={k!} value={displayAnswer(v)} />
          ))}
        </dl>
      </Section>
      <Section title="Esito e motivazioni">
        {result ? (
          <>
            <h3 className="font-semibold">
              {result.status === "ostacolo"
                ? "Possibile ostacolo dichiarato: verifica necessaria"
                : result.status === "coerente"
                  ? "Nessun ostacolo dichiarato: ammissibilità da verificare"
                  : "Valutazione incompleta: servono verifiche o informazioni"}
            </h3>
            <p>{result.note}</p>
            <Items title="Possibili criteri ostativi dichiarati" items={result.blockers} />
            <Items title="Da verificare o completare" items={result.missing} />
            <Items title="Adempimenti e documenti da pianificare" items={result.checks} />
            <p>Costo agevolabile dichiarato per la singola annualità: {eur(cost)}.</p>
            <p>
              Maggiorazione teorica: {uplift ? eur(uplift.amount) : "Non determinabile"}. Non è un
              contributo, un credito F24 o il risparmio d’imposta.{" "}
              {uplift?.capped ? "Calcolo limitato a 20 milioni di euro per annualità." : ""} La
              stima non supera gli eventuali ostacoli indicati sopra.
            </p>
            <p className="text-xs">{IPER_VERSION}</p>
            <p className="text-sm">
              <a href="https://www.mimit.gov.it/it/incentivi/nuovo-piano-transizione-5-0-iperammortamento">
                Fonte: MIMIT
              </a>{" "}
              ·{" "}
              <a href="https://www.gse.it/servizi-per-te/imprese/nuovo-piano-transizione-5-0/come-accedere">
                Procedura GSE
              </a>
            </p>
          </>
        ) : (
          <ResultView
            r={evaluate(
              answers,
              rules,
              evidences.map((e) => ({ intervention: e.intervention, amount: e.amount })),
              cl,
            )}
            rules={rules}
            compact
          />
        )}
      </Section>
      {groups
        .filter((g) => g.fields.length)
        .map((g) => (
          <Section key={g.title} title={g.title}>
            <dl>
              {g.fields.map((q, i) => (
                <Answer key={`${q.id}-${i}`} label={q.label} value={q.value} />
              ))}
            </dl>
          </Section>
        ))}
      {extra.length > 0 && (
        <Section title="Altri dati salvati, inclusi eventuali campi non più applicabili">
          <p className="text-xs">
            Questi valori sono conservati per completezza; non implicano che la domanda sia ancora
            applicabile.
          </p>
          <dl>
            {extra.map(([k, v]) => (
              <Answer key={k} label={k.replaceAll("_", " ")} value={displayAnswer(v)} />
            ))}
          </dl>
        </Section>
      )}
      {!iper && (
        <Section title="Checklist documentale">
          <dl>
            {CHECKLIST.map((d) => (
              <Answer
                key={d.key}
                label={d.label}
                value={`${DOC_STATUS.find((s) => s.value === (cl[d.key]?.status ?? "mancante"))?.label ?? cl[d.key]?.status ?? "Mancante"}${cl[d.key]?.note ? ` — ${cl[d.key]?.note}` : ""}`}
              />
            ))}
          </dl>
        </Section>
      )}
      <Section title="Evidenze registrate">
        {evidences.length ? (
          evidences.map((e) => (
            <div key={e.id} className="report-answer space-y-1 border-b pb-3 text-sm">
              <h3 className="font-semibold">
                {e.title} · {e.kind}
              </h3>
              <p>{e.description || "Nessuna descrizione"}</p>
              <p>
                Riferimento: {e.reference || "Non indicato"} · Intervento:{" "}
                {e.intervention || "Non indicato"}
              </p>
              <p>
                Importo: {eur(e.amount)} · {dt(e.created_at)}
              </p>
            </div>
          ))
        ) : (
          <p>Nessuna evidenza registrata.</p>
        )}
      </Section>
      <Section title="Note registrate">
        {notes.length ? (
          notes.map((n) => (
            <div key={n.id} className="report-answer border-b pb-3 text-sm">
              <h3 className="font-semibold">
                {n.section || "Generale"} · {dt(n.created_at)}
              </h3>
              <p className="whitespace-pre-wrap">{n.body}</p>
            </div>
          ))
        ) : (
          <p>
            Nessuna nota separata registrata. Le eventuali note del questionario sono riportate
            nelle risposte.
          </p>
        )}
      </Section>
    </article>
  );
}
