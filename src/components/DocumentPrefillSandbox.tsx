import { useEffect, useMemo, useRef, useState } from "react";
import {
  previewDocumentPages,
  SYNTHETIC_EXAMPLES,
  type DemoDocumentKind,
  type DocumentPage,
  type DocumentProposal,
} from "@/lib/document-prefill-demo";
import type { Answers } from "@/lib/engine";
import { Button } from "@/components/ui/button";

const PDF_LAB_ENABLED = import.meta.env['VITE_ENABLE_DOCUMENT_PDF_LAB'] === "true";

export function DocumentPrefillSandbox({
  answers,
  onApply,
}: {
  answers: Answers;
  onApply: (proposals: DocumentProposal[]) => void;
}) {
  const [kind, setKind] = useState<DemoDocumentKind>("visura");
  const [text, setText] = useState(SYNTHETIC_EXAMPLES.visura);
  const [pages, setPages] = useState<DocumentPage[] | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const generation = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { generation.current++; }, []);
  const preview = useMemo(
    () => previewDocumentPages(pages ?? [{ page: 1, text }], kind),
    [kind, pages, text],
  );
  const eligible = preview.proposals.filter(
    (candidate) => answers[candidate.field] === undefined ||
      answers[candidate.field] === null ||
      answers[candidate.field] === "",
  );

  function clearFile() {
    generation.current++;
    setPages(null);
    setPdfName("");
    setBusy(false);
    setError("");
    setSelected({});
    if (fileInput.current) fileInput.current.value = "";
  }
  function changeKind(value: DemoDocumentKind) {
    clearFile();
    setKind(value);
    setText(SYNTHETIC_EXAMPLES[value]);
  }
  async function inspectFile(file?: File) {
    if (!PDF_LAB_ENABLED || !file) return;
    const token = ++generation.current;
    setPages(null);
    setText(""); // Fail-closed: never show synthetic proposals after a PDF error.
    setSelected({});
    setPdfName("");
    setError("");
    setBusy(true);
    try {
      // No upload, network request, server-side storage or external AI call.
      const { extractLocalPdfText } = await import("@/lib/local-pdf-reader");
      const extracted = await extractLocalPdfText(file);
      if (generation.current !== token) return;
      setPages(extracted);
      setPdfName(file.name);
    } catch (e) {
      if (generation.current !== token) return;
      setError(e instanceof Error ? e.message : "Errore durante la lettura del PDF.");
    } finally {
      if (generation.current === token) setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function apply() {
    const approved = eligible.filter((item) => selected[item.field]);
    if (!approved.length) return;
    if (!window.confirm(
      "Confermi i valori selezionati? Verranno inseriti SOLO nei campi vuoti dell'assessment. " +
      "La pratica resterà da salvare e nessun documento sarà marcato verificato.",
    )) return;
    onApply(approved);
    setSelected({});
  }

  return (
    <section className="mb-5 rounded-lg border border-dashed bg-card p-4">
      <h2 className="font-semibold">Document Intelligence — laboratorio riservato</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Prototipo con controllo umano. Di base accetta solo esempi sintetici; non usa AI esterna,
        non invia dati fuori dal browser e non memorizza PDF. Non incollare dati reali nel laboratorio.
        Le proposte non attestano validità o autenticità dei documenti.
      </p>
      <div className="mt-4 space-y-2">
        <label htmlFor="sandbox-kind" className="block text-sm font-medium">
          Tipologia documento
        </label>
        <select
          id="sandbox-kind"
          className="w-full rounded-md border bg-background p-2 text-sm sm:max-w-sm"
          value={kind}
          onChange={(event) => changeKind(event.target.value as DemoDocumentKind)}
        >
          <option value="visura">Visura camerale</option>
          <option value="iva">Dichiarazione IVA 2026</option>
          <option value="inps">Attestazione INPS luglio 2026</option>
        </select>
        {PDF_LAB_ENABLED && (
          <div className="rounded-md border bg-muted/20 p-3">
            <label htmlFor="sandbox-file" className="block text-sm font-medium">
              PDF locale per collaudo tecnico (non caricare documenti reali dei clienti)
            </label>
            <input
              id="sandbox-file"
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="mt-2 block w-full text-sm"
              disabled={busy}
              onChange={(e) => void inspectFile(e.target.files?.[0])}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Solo sul dispositivo; massimo 8 MB, 45 pagine. OCR e PDF cifrati non supportati.
            </p>
            {pdfName && <p className="mt-2 text-sm">Analizzato localmente: {pdfName}</p>}
            <Button type="button" variant="outline" className="mt-2" onClick={clearFile}>
              Svuota PDF dalla memoria del laboratorio
            </Button>
          </div>
        )}
        {!pages && (
          <>
            <label htmlFor="sandbox-text" className="block text-sm font-medium">
              Testo di prova (solo nel browser)
            </label>
            <textarea
              id="sandbox-text"
              value={text}
              onChange={(event) => { setText(event.target.value); setSelected({}); }}
              className="min-h-40 w-full rounded-md border bg-background p-3 font-mono text-xs"
              maxLength={20000}
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { clearFile(); setText(SYNTHETIC_EXAMPLES[kind]); }}
              >
                Ripristina esempio
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { clearFile(); setText(""); }}
              >
                Svuota testo
              </Button>
            </div>
          </>
        )}
        {busy && <p role="status" className="text-sm">Lettura PDF locale in corso…</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold">
          Proposte da verificare ({preview.proposals.length})
        </h3>
        {preview.proposals.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessun campo univoco riconosciuto.</p>
        )}
        <ul className="space-y-2">
          {preview.proposals.map((candidate) => {
            const original = answers[candidate.field];
            const occupied = original !== undefined && original !== null && original !== "";
            const different = occupied && original !== candidate.value;
            return (
              <li key={candidate.field} className="rounded-md border bg-background p-3 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    aria-label={"Conferma " + candidate.label}
                    type="checkbox"
                    className="mt-1"
                    disabled={occupied || busy}
                    checked={!!selected[candidate.field] && !occupied}
                    onChange={(e) => setSelected((s) => ({ ...s, [candidate.field]: e.target.checked }))}
                  />
                  <span className="font-medium">{candidate.label}: {String(candidate.value)}</span>
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Campo {candidate.field} · pagina {candidate.sourcePage} · riga {candidate.sourceLine}
                </p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  Fonte locale: {candidate.sourceExcerpt}
                </p>
                {different && (
                  <p className="mt-1 text-xs text-destructive">
                    Campo già valorizzato: confronto obbligatorio, nessuna sovrascrittura automatica.
                  </p>
                )}
                {occupied && !different && (
                  <p className="mt-1 text-xs text-muted-foreground">Valore già presente nell'assessment.</p>
                )}
              </li>
            );
          })}
        </ul>
        {preview.warnings.map((warning, i) => (
          <p key={i} role="status" className="mt-2 text-sm text-destructive">{warning}</p>
        ))}
        <Button
          type="button"
          className="mt-3"
          disabled={busy || !eligible.some((p) => selected[p.field])}
          onClick={apply}
        >
          Conferma campi selezionati nella bozza
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          I dati restano da controllare sull'originale. Nessuna evidenza diventa “verificata”,
          e nessuna modifica viene salvata senza usare il comando Salva della pratica.
        </p>
      </div>
    </section>
  );
}
