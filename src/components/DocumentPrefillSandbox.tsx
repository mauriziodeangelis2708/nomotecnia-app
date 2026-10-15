import { useMemo, useState } from "react";
import {
  previewSyntheticDocument,
  SYNTHETIC_EXAMPLES,
  type DemoDocumentKind,
} from "@/lib/document-prefill-demo";
import { Button } from "@/components/ui/button";

/**
 * Demo privacy by design, visibile solo nel contesto admin protetto.
 * Non acquisisce file né memorizza o applica dati agli assessment.
 */
export function DocumentPrefillSandbox() {
  const [kind, setKind] = useState<DemoDocumentKind>("visura");
  const [text, setText] = useState(SYNTHETIC_EXAMPLES.visura);
  const preview = useMemo(() => previewSyntheticDocument(text, kind), [text, kind]);

  function changeKind(value: DemoDocumentKind) {
    setKind(value);
    setText(SYNTHETIC_EXAMPLES[value]);
  }

  return (
    <section className="mb-5 rounded-lg border border-dashed bg-card p-4">
      <h2 className="font-semibold">AI Document Intelligence — laboratorio riservato</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Fase 1, solo testo e dati fittizi. Questa prova NON legge PDF reali,
        NON usa un modello AI e NON carica o salva documenti. Non incollare dati dei clienti.
        L&apos;eventuale precompilazione richiederà verifica e conferma prima del salvataggio.
      </p>
      <div className="mt-4 space-y-2">
        <label htmlFor="sandbox-kind" className="block text-sm font-medium">
          Documento sintetico
        </label>
        <select
          id="sandbox-kind"
          className="w-full rounded-md border bg-background p-2 text-sm sm:max-w-sm"
          value={kind}
          onChange={(event) => changeKind(event.target.value as DemoDocumentKind)}
        >
          <option value="visura">Visura camerale di prova</option>
          <option value="iva">Dichiarazione IVA di prova</option>
          <option value="inps">Attestazione INPS di prova</option>
        </select>
        <label htmlFor="sandbox-text" className="block text-sm font-medium">
          Testo sintetico (solo nel browser)
        </label>
        <textarea
          id="sandbox-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="min-h-40 w-full rounded-md border bg-background p-3 font-mono text-xs"
          maxLength={20000}
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => setText(SYNTHETIC_EXAMPLES[kind])}>
            Ripristina esempio
          </Button>
          <Button type="button" variant="ghost" onClick={() => setText("")}>
            Svuota testo
          </Button>
          <span className="text-xs text-muted-foreground">Nessun invio a server o servizi AI.</span>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold">
          Dati proposti per la verifica ({preview.proposals.length})
        </h3>
        {preview.proposals.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessuna proposta verificabile.</p>
        )}
        <ul className="space-y-2">
          {preview.proposals.map((candidate) => (
            <li key={candidate.field} className="rounded-md border bg-background p-3 text-sm">
              <div className="font-medium">{candidate.label}: {String(candidate.value)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Campo: {candidate.field} · Riga {candidate.sourceLine}
              </div>
              <div className="mt-1 break-words text-xs text-muted-foreground">
                Fonte di prova: {candidate.sourceExcerpt}
              </div>
            </li>
          ))}
        </ul>
        {preview.warnings.map((warning, i) => (
          <p key={i} role="status" className="mt-2 text-sm text-destructive">{warning}</p>
        ))}
        <p className="mt-3 text-xs text-muted-foreground">
          Le proposte non modificano l&apos;assessment o la checklist. Per i PDF veri servono
          estrazione affidabile, controllo accessi, verifica dei fornitori e policy di conservazione.
        </p>
      </div>
    </section>
  );
}
