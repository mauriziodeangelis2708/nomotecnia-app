import { useState } from "react";
import { DocumentPrefillSandbox } from "@/components/DocumentPrefillSandbox";
import { Button } from "@/components/ui/button";
import { mergeReviewedDocumentFields } from "@/lib/document-prefill-review";
import { IMPORTABLE_FIELDS } from "@/lib/document-prefill-merge";
import type { Answers } from "@/lib/engine";

const STORAGE_KEY = "nomotecnia_pdf_lab_synthetic_draft_v1";
const FIELDS = new Set(Object.values(IMPORTABLE_FIELDS).flat());

function sanitizeDraft(value: unknown): Answers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const data = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(data).filter(
      ([key, field]) =>
        FIELDS.has(key) &&
        ((typeof field === "string" && field.length <= 200) ||
          (typeof field === "number" && Number.isFinite(field) && field >= 0)),
    ),
  );
}

function loadDraft(): Answers {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? sanitizeDraft(JSON.parse(stored) as unknown) : {};
  } catch {
    return {};
  }
}

export function PdfLabApp() {
  const [answers, setAnswers] = useState<Answers>(loadDraft);
  const [status, setStatus] = useState("Bozza sintetica pronta per il collaudo.");
  const [dirty, setDirty] = useState(false);

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeDraft(answers)));
      setDirty(false);
      setStatus("Bozza fittizia salvata nel browser. Non è stato contattato alcun database.");
    } catch {
      setStatus("Impossibile salvare: memoria locale del browser non disponibile.");
    }
  }

  function restore() {
    setAnswers(loadDraft());
    setDirty(false);
    setStatus("Bozza fittizia riletta dalla memoria locale del browser.");
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    setAnswers({});
    setDirty(false);
    setStatus("Bozza sintetica cancellata. Nessun dato è stato inviato a un server.");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card px-5 py-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            NomotecnIA · Document Intelligence
          </span>
          <h1 className="text-2xl font-semibold">Staging Cloudflare · prova documentale</h1>
          <p className="text-sm text-muted-foreground">
            Laboratorio isolato: esclusivamente PDF sintetici. Nessun accesso a Supabase,
            nessuna registrazione in produzione, nessun servizio AI esterno.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-5 p-5">
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <strong>Ambiente di test, non è l'app operativa.</strong> Non usare documenti
          aziendali veri, dati personali o credenziali di clienti. Il pulsante Salva
          conserva solo i valori fittizi nella memoria di questo browser.
        </div>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Pratica fittizia · Impresa Demo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Utilizza i sette PDF sintetici. Carica una visura, conferma i valori e ripeti
            per IVA e INPS. I dati accettati appariranno nella bozza sottostante.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={save}>Salva bozza nel browser</Button>
            <Button type="button" variant="outline" onClick={restore}>
              Ricarica bozza salvata
            </Button>
            <Button type="button" variant="destructive" onClick={clear}>
              Cancella dati di prova
            </Button>
          </div>
          <p aria-live="polite" role="status" className="mt-3 text-sm">
            {status} {dirty ? "· Modifiche non ancora salvate" : ""}
          </p>
        </section>

        <DocumentPrefillSandbox
          answers={answers}
          onApply={(kind, proposals, pages, ownershipConfirmed) => {
            const result = mergeReviewedDocumentFields(
              answers,
              kind,
              proposals,
              pages,
              ownershipConfirmed,
            );
            if (!result.applied.length) {
              setStatus("Importazione rifiutata: campo, documento o identità non verificabili.");
              return;
            }
            setAnswers((previous) =>
              mergeReviewedDocumentFields(
                previous,
                kind,
                proposals,
                pages,
                ownershipConfirmed,
              ).answers,
            );
            setDirty(true);
            setStatus(
              result.applied.length +
                " campi sintetici importati nella bozza. " +
                result.blocked.length +
                " campi lasciati invariati.",
            );
          }}
        />

        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Anteprima dei campi dell'assessment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sono gli identificativi reali del questionario, applicati soltanto a dati
            inventati. Qui non viene eseguito alcun calcolo di ammissibilità del bando.
          </p>
          {Object.keys(answers).length ? (
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(answers).map(([key, value]) => (
                <div key={key} className="rounded border p-3">
                  <dt className="break-all font-mono text-xs text-muted-foreground">{key}</dt>
                  <dd className="mt-1 break-words text-sm font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Nessun campo ancora importato.</p>
          )}
        </section>
      </main>
    </div>
  );
}
