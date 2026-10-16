import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { generationRequest, prepareGrantSource } from "@/lib/grants/generation";
import {
  parseDefinition,
  type GrantAnswers,
  type GrantDefinition,
  type GrantSource,
} from "@/lib/grants/schema";
import {
  publicationProblems,
  runScenarios,
  scenarioSchema,
  sourceReviewKey,
  type GrantReview,
} from "@/lib/grants/lifecycle";
import {
  listTemplates,
  publishTemplate,
  saveTemplate,
  type TemplateRow,
} from "@/lib/grants/repository";
import { GrantQuestionnaire, GrantResult } from "./GrantQuestionnaire";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_REVIEW: GrantReview = { sources: [], items: [], scenarios: [] };
const err = (e: unknown) => (e instanceof Error ? e.message : "Operazione non riuscita.");
export function GrantStudio() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [sources, setSources] = useState<GrantSource[]>([]);
  const [ocr, setOcr] = useState(false);
  const [definition, setDefinition] = useState<GrantDefinition | null>(null);
  const [review, setReview] = useState<GrantReview>(EMPTY_REVIEW);
  const [row, setRow] = useState<TemplateRow | null>(null);
  const [answers, setAnswers] = useState<GrantAnswers>({});
  const [json, setJson] = useState("");
  const [scenarios, setScenarios] = useState("[]");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const abort = useRef<AbortController | null>(null);
  const library = useQuery({
    queryKey: ["grant-templates", "admin"],
    queryFn: () => listTemplates(true),
  });
  useEffect(() => () => abort.current?.abort(), []);
  function resetReview(d: GrantDefinition) {
    setDefinition(d);
    setJson(JSON.stringify(d, null, 2));
    setReview(EMPTY_REVIEW);
    setScenarios("[]");
    setAnswers({});
  }
  async function read(files: FileList | null) {
    if (!files?.length) return;
    if (files.length > 12) {
      setMessage("Massimo 12 documenti.");
      return;
    }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const next: GrantSource[] = [];
      for (const [i, file] of Array.from(files).entries())
        next.push(await prepareGrantSource(file, i, controller.signal, setMessage, ocr));
      controller.signal.throwIfAborted();
      setSources(next);
      setDefinition(null);
      setRow(null);
      setReview(EMPTY_REVIEW);
      setMessage(
        "Documenti letti localmente. La generazione invierà il testo al modello configurato.",
      );
    } catch (e) {
      if (!controller.signal.aborted) setMessage(err(e));
      else setMessage("Lettura annullata.");
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setMessage("");
    const controller = new AbortController();
    abort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 110000);
    try {
      const input = generationRequest.parse({
        title,
        id: `bando_${crypto.randomUUID().replaceAll("-", "")}`,
        version: 1,
        sources,
      });
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Accedi nuovamente.");
      const response = await fetch("/api/grants/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const output = (await response.json()) as { definition?: unknown; error?: string };
      if (!response.ok) throw new Error(output.error || "Generazione non riuscita.");
      resetReview(parseDefinition(output.definition));
      setRow(null);
      setMessage(
        "Bozza generata. Revisionare fonti, regole e casi di prova prima dell'attivazione.",
      );
    } catch (e) {
      setMessage(controller.signal.aborted ? "Generazione annullata o tempo scaduto." : err(e));
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  async function save(publish: boolean) {
    if (!definition || row?.published_at) return;
    setBusy(true);
    setMessage("");
    try {
      const saved =
        publish && row
          ? await publishTemplate(definition, review, row)
          : await saveTemplate(definition, review, row ?? undefined);
      setRow(saved);
      await qc.invalidateQueries({ queryKey: ["grant-templates"] });
      setMessage(
        publish
          ? "Versione attivata e immutabile. Disponibile per nuovi assessment."
          : "Bozza salvata.",
      );
    } catch (e) {
      setMessage(err(e));
    } finally {
      setBusy(false);
    }
  }
  function load(item: TemplateRow) {
    try {
      const d = parseDefinition(item.definition);
      resetReview(d);
      setSources(d.sources);
      setTitle(d.title);
      setRow(item);
      const stored = item.review as unknown as Partial<GrantReview>;
      if (stored.sources && stored.items && stored.scenarios) {
        setReview(stored as GrantReview);
        setScenarios(JSON.stringify(stored.scenarios, null, 2));
      }
      setMessage(
        item.published_at
          ? "Versione pubblicata: consultabile. Crea una nuova versione per modificarla."
          : "Bozza caricata.",
      );
    } catch (e) {
      setMessage(err(e));
    }
  }
  const problems = definition ? publicationProblems(definition, review) : [];
  const locked = busy || !!row?.published_at;
  function mark(group: "sources" | "items", id: string, checked: boolean) {
    setReview((r) => ({
      ...r,
      [group]: checked ? [...new Set([...r[group], id])] : r[group].filter((v) => v !== id),
    }));
  }
  return (
    <div className="min-w-0 space-y-6">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-xl font-semibold">Gestione bandi · laboratorio in sviluppo</h2>
        <p className="text-sm">
          Carica avviso e allegati, genera una bozza e verifica ogni fonte. Le versioni attivate
          restano immutabili; gli assessment precedenti mantengono la loro versione.
        </p>
        <p className="text-sm text-muted-foreground">
          Il generatore AI richiede un collegamento server attivo. Nessun servizio viene attivato da
          questa schermata. Attuale limite di generazione: 24.000 caratteri complessivi, senza
          troncamento.
        </p>
        <label className="block text-sm">
          Nome del nuovo bando
          <Input
            value={title}
            maxLength={200}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ocr}
            disabled={busy}
            onChange={(e) => setOcr(e.target.checked)}
          />
          Usa OCR locale per le scansioni (massimo 8 pagine per PDF)
        </label>
        <label className="block space-y-1 text-sm">
          Avviso e allegati PDF (massimo 12 file, 8 MB e 45 pagine ciascuno)
          <Input
            type="file"
            accept="application/pdf,.pdf"
            multiple
            disabled={busy}
            onChange={(e) => {
              void read(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        {sources.map((s) => (
          <p className="break-all text-sm" key={s.id}>
            {s.name} · {s.pages.length} pagine
          </p>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || title.trim().length < 2 || !sources.length} onClick={generate}>
            Genera assessment dai documenti
          </Button>
          {busy && (
            <Button variant="outline" onClick={() => abort.current?.abort()}>
              Annulla lettura / generazione
            </Button>
          )}
        </div>
      </section>
      <p role="status" className="break-words text-sm">
        {message}
      </p>
      <section className="space-y-2">
        <h2 className="font-semibold">Bandi salvati</h2>
        {library.error && (
          <p role="alert">
            Archivio bandi non disponibile: verificare la migrazione dell'ambiente di sviluppo.
          </p>
        )}
        {library.data?.map((item) => (
          <Button
            className="mr-2 mb-2 h-auto max-w-full whitespace-normal break-words"
            variant="outline"
            disabled={busy}
            key={item.id}
            onClick={() => load(item)}
          >
            {(item.definition as unknown as GrantDefinition).title} · v{item.version} ·{" "}
            {item.published_at ? "Attivo" : "Bozza"}
          </Button>
        ))}
      </section>
      <details className="rounded-lg border p-4">
        <summary>Importa o correggi una configurazione strutturata</summary>
        <p className="my-2 text-sm">
          Ogni modifica azzera la revisione precedente. L'importazione non attiva il bando.
        </p>
        <Textarea
          aria-label="Configurazione del bando"
          rows={10}
          value={json}
          disabled={locked}
          onChange={(e) => setJson(e.target.value)}
        />
        <Button
          className="mt-2"
          disabled={locked || !json.trim()}
          onClick={() => {
            try {
              const d = parseDefinition(JSON.parse(json));
              if (row && (d.id !== row.scheme_key || d.version !== row.version))
                throw new Error("Per cambiare identità o versione crea prima una nuova versione.");
              resetReview(d);
              setSources(d.sources);
            } catch (e) {
              setMessage(err(e));
            }
          }}
        >
          Valida e applica la configurazione
        </Button>
      </details>
      {definition && (
        <>
          <h2 className="text-xl font-semibold">
            {definition.title} · v{definition.version}
          </h2>
          {row?.published_at && (
            <Button
              disabled={busy}
              onClick={() => {
                resetReview({ ...definition, version: definition.version + 1 });
                setRow(null);
                setMessage("Nuova versione in bozza: richiede una revisione completa.");
              }}
            >
              Crea nuova versione
            </Button>
          )}
          <section className="space-y-3">
            <h3 className="font-semibold">1. Revisione integrale delle fonti</h3>
            {definition.sources.map((s) => (
              <details key={s.id} className="rounded border p-3">
                <summary className="break-all">{s.name}</summary>
                {s.pages.map((p) => (
                  <div className="mt-3 space-y-2" key={p.page}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        disabled={locked}
                        checked={review.sources.includes(sourceReviewKey(s.id, p.page))}
                        onChange={(e) =>
                          mark("sources", sourceReviewKey(s.id, p.page), e.target.checked)
                        }
                      />
                      Pagina {p.page} verificata: nessun requisito omesso o conflitto irrisolto
                    </label>
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs">
                      {p.text}
                    </pre>
                  </div>
                ))}
              </details>
            ))}
          </section>
          <section className="space-y-3">
            <h3 className="font-semibold">2. Revisione delle domande e delle regole</h3>
            {[
              ...definition.questions.map((q) => ({ ...q, key: `question:${q.id}`, kind: q.type })),
              ...definition.rules.map((r) => ({ ...r, key: `rule:${r.id}` })),
            ].map((item) => (
              <details className="rounded border p-3" key={item.key}>
                <summary className="break-words">
                  {item.label} · {item.kind}
                </summary>
                <pre className="my-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">
                  {JSON.stringify(item, null, 2)}
                </pre>
                {item.citations.map((c, i) => (
                  <blockquote className="my-2 text-sm" key={i}>
                    {c.documentId}, p. {c.page}: «{c.quote}»
                  </blockquote>
                ))}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={review.items.includes(item.key)}
                    onChange={(e) => mark("items", item.key, e.target.checked)}
                  />
                  Logica, soglie e riferimenti verificati sull'originale
                </label>
              </details>
            ))}
          </section>
          <section className="space-y-3">
            <h3 className="font-semibold">3. Casi di collaudo con esiti attesi</h3>
            <p className="text-sm">
              Inserire scenari indipendenti: name, answers, expected (pre_eligible, not_eligible,
              incomplete), score e grants per le formule. I risultati attesi devono derivare dal
              bando.
            </p>
            <Textarea
              aria-label="Scenari di collaudo"
              rows={8}
              value={scenarios}
              disabled={locked}
              onChange={(e) => setScenarios(e.target.value)}
            />
            <Button
              disabled={locked}
              onClick={() => {
                try {
                  const cases = z.array(scenarioSchema).max(50).parse(JSON.parse(scenarios));
                  setReview((r) => ({ ...r, scenarios: cases }));
                  setMessage("Scenari caricati ed eseguiti.");
                } catch (e) {
                  setMessage(err(e));
                }
              }}
            >
              Esegui collaudo
            </Button>
            {runScenarios(definition, review.scenarios).map((s, i) => (
              <p key={i} className="text-sm">
                {s.passed ? "PASS" : "ERRORE"}: {s.name} · {s.actual.status}
              </p>
            ))}
          </section>
          <section className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">4. Anteprima assessment e report</h3>
            <GrantQuestionnaire definition={definition} answers={answers} onChange={setAnswers} />
            <details>
              <summary>Mostra esito e report</summary>
              <GrantResult definition={definition} answers={answers} />
            </details>
          </section>
          {problems.length > 0 && (
            <div className="space-y-1 rounded border p-3 text-sm">
              <strong>Attivazione bloccata:</strong>
              {problems.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button disabled={locked} variant="outline" onClick={() => save(false)}>
              Salva bozza
            </Button>
            <Button disabled={locked || !row || problems.length > 0} onClick={() => save(true)}>
              Approva e attiva questa versione
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
