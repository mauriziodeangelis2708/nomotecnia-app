import { QuestionField } from "./QuestionField";
import { STEPS, type Question } from "@/lib/questions";
import { OFFICIAL_RULES } from "@/lib/bando";
import type { Answers } from "@/lib/engine";
import type { IperAnswers } from "@/lib/iperammortamento";
import { IPER_REPORT_FIELDS, IVV_FIELDS, FER_FIELDS } from "@/lib/iper-report-fields";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const TRI_FIELDS = new Set([
  "italia",
  "procedura_crisi",
  "sanzioni_231",
  "sicurezza_durc",
  "bene_nuovo",
  "dichiarazioni_gse",
  "termine",
  "esclusione_446",
  "categoria_allegato",
  "interconnessione",
  "requisiti_tecnici",
  "funzione_software",
  "autoconsumo",
  "impianto_ammesso",
  "dimensionamento",
  "calore_processo",
  "calore_non_cessibile",
  "fonte_termica_ammessa",
  "sito_pod",
  "accumulo",
  "altri_aiuti",
  "cumulo_verificato",
  "perizia",
  "certificazione_contabile",
  "conferma_20",
  "conferma_20",
  "completamento_tecnico",
  "completamento_invio",
  "periodica_gennaio",
  "periodica_giugno",
]);
const NUMBERS = new Set([
  "costo_ammissibile",
  "producibilita_kwh",
  "fabbisogno_kwh",
  "fabbisogno_termico_equivalente",
]);
export function customerSections(scheme: string, answers: Answers) {
  if (scheme === "lazio")
    return STEPS.map((s) => ({
      title: s.title,
      fields: s.questions(OFFICIAL_RULES).filter((q) => !q.showIf || q.showIf(answers)),
    }));
  const sections: { title: string; fields: Question[] }[] = [];
  for (const q of IPER_REPORT_FIELDS) {
    if (!q.showIf(answers as IperAnswers)) continue;
    let group = sections.find((s) => s.title === q.section);
    if (!group) {
      group = { title: q.section, fields: [] };
      sections.push(group);
    }
    group.fields.push({
      id: q.id,
      label: q.label(answers as IperAnswers),
      type: TRI_FIELDS.has(q.id)
        ? "select"
        : q.options.length
          ? "select"
          : NUMBERS.has(q.id)
            ? "number"
            : q.id === "note"
              ? "textarea"
              : "text",
      options: TRI_FIELDS.has(q.id)
        ? [
            { value: "si", label: "Sì" },
            { value: "no", label: "No" },
            { value: "non_so", label: "Non so" },
          ]
        : [...q.options],
    });
  }
  return sections;
}
function InvestmentRows({
  id,
  value,
  onChange,
}: {
  id: string;
  value: unknown;
  onChange: (value: string) => void;
}) {
  let rows: Record<string, string>[] = [];
  try {
    const parsed = JSON.parse(String(value || "[]"));
    if (Array.isArray(parsed)) rows = parsed;
  } catch {
    /* Empty editor for unsaved input. */
  }
  const fields = id === "beni_ivv_json" ? IVV_FIELDS : FER_FIELDS;
  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={index} className="space-y-3 rounded border p-3">
          <div className="flex flex-wrap justify-between gap-2">
            <h3>Scheda {index + 1}</h3>
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(JSON.stringify(rows.filter((_, i) => i !== index)))}
            >
              Rimuovi scheda {index + 1}
            </Button>
          </div>
          {fields.map(([key, label]) => (
            <label key={key} className="block space-y-1 text-sm">
              {label}
              <Input
                aria-label={`${label} · scheda ${index + 1}`}
                value={row[key] ?? ""}
                maxLength={2000}
                onChange={(e) =>
                  onChange(
                    JSON.stringify(
                      rows.map((r, i) => (i === index ? { ...r, [key]: e.target.value } : r)),
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(JSON.stringify([...rows, {}]))}
      >
        + Aggiungi scheda
      </Button>
    </div>
  );
}
export function CustomerQuestionnaire({
  scheme,
  answers,
  onChange,
}: {
  scheme: string;
  answers: Answers;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      {customerSections(scheme, answers).map((section, i) => (
        <details key={section.title} open={i === 0} className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer py-2 font-semibold">{section.title}</summary>
          <div className="mt-4 space-y-6">
            {section.fields.map((q) =>
              q.id === "beni_ivv_json" || q.id === "impianti_fer_json" ? (
                <div key={q.id}>
                  <h3 className="mb-3 font-medium">{q.label}</h3>
                  <InvestmentRows
                    id={q.id}
                    value={answers[q.id]}
                    onChange={(v) => onChange(q.id, v)}
                  />
                </div>
              ) : (
                <QuestionField
                  key={q.id}
                  q={q}
                  value={answers[q.id]}
                  onChange={(v) => onChange(q.id, v)}
                />
              ),
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
