import { useMemo, useState } from "react";
import type { GrantDefinition, GrantSource } from "@/lib/grants/schema";
import { importGrantConfiguration, numericReviewPacket } from "@/lib/grants/numeric-import";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Declaration = {
  id: string;
  label: string;
  kind: "eligibility" | "exclusion" | "document";
  expected: boolean;
  spanIds: string[];
};

/** Explicit human declarations only: never infer a rule from a source sentence. */
export function RequirementEditor({
  sources,
  title,
  identity,
  disabled,
  onApply,
}: {
  sources: GrantSource[];
  title: string;
  identity?: { id: string; version: number } | undefined;
  disabled: boolean;
  onApply: (definition: GrantDefinition) => void;
}) {
  const packet = useMemo(() => {
    try {
      return { data: numericReviewPacket(sources), error: "" };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : "Fonti non disponibili." };
    }
  }, [sources]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [entries, setEntries] = useState<Declaration[]>([]);
  const [message, setMessage] = useState("");
  const spans = packet.data?.chunks[chunkIndex]?.spans ?? [];
  const update = (i: number, patch: Partial<Declaration>) =>
    setEntries((rows) => rows.map((row, n) => (n === i ? { ...row, ...patch } : row)));
  return (
    <details className="rounded-lg border p-4 space-y-3">
      <summary>Costruisci domande dai requisiti verificati</summary>
      <p className="text-sm">
        Leggi i passaggi e formula il requisito completo, comprese alternative e deroghe. Le
        risposte sono dichiarazioni del compilatore: il programma non verifica i documenti. Questa
        funzione crea una configurazione parziale e sostituisce l’anteprima corrente; non aggiunge
        requisiti a una configurazione esistente.
      </p>
      {packet.error && <p role="alert">{packet.error}</p>}
      <fieldset disabled={disabled || !packet.data} className="space-y-3 min-w-0">
        <label className="block">
          Sezione delle fonti
          <select
            className="block w-full rounded border p-2"
            aria-label="Sezione delle fonti"
            value={chunkIndex}
            disabled={entries.length > 0}
            onChange={(e) => setChunkIndex(Number(e.target.value))}
          >
            {packet.data?.chunks.map((c) => (
              <option key={c.chunkIndex} value={c.chunkIndex}>
                Sezione {c.chunkIndex + 1}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm">
          Per cambiare sezione rimuovi prima i requisiti inseriti. Ogni riferimento rimane legato al
          testo originale di questa sezione.
        </p>
        {entries.map((entry, i) => (
          <fieldset key={entry.id} className="space-y-2 rounded border p-3 min-w-0">
            <legend>Requisito {i + 1}</legend>
            <label className="block">
              Domanda completa
              <Textarea
                aria-label={`Domanda requisito ${i + 1}`}
                maxLength={2000}
                value={entry.label}
                onChange={(e) => update(i, { label: e.target.value })}
              />
            </label>
            <label className="block">
              Tipo di requisito
              <select
                className="block w-full rounded border p-2"
                aria-label={`Tipo requisito ${i + 1}`}
                value={entry.kind}
                onChange={(e) => update(i, { kind: e.target.value as Declaration["kind"] })}
              >
                <option value="eligibility">Ammissibilità</option>
                <option value="exclusion">Esclusione</option>
                <option value="document">Documento richiesto</option>
              </select>
            </label>
            <label className="block">
              {entry.kind === "exclusion"
                ? "Risposta che esclude"
                : "Risposta che soddisfa il requisito"}
              <select
                className="block w-full rounded border p-2"
                aria-label={`Risposta attesa requisito ${i + 1}`}
                value={String(entry.expected)}
                onChange={(e) => update(i, { expected: e.target.value === "true" })}
              >
                <option value="true">Sì</option>
                <option value="false">No</option>
              </select>
            </label>
            <fieldset>
              <legend>Passaggi che giustificano il requisito (almeno uno, massimo 20)</legend>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {spans.map((s) => (
                  <label key={s.id} className="block rounded border p-2 text-sm break-words">
                    <input
                      type="checkbox"
                      checked={entry.spanIds.includes(s.id)}
                      disabled={!entry.spanIds.includes(s.id) && entry.spanIds.length >= 20}
                      onChange={(e) =>
                        update(i, {
                          spanIds: e.target.checked
                            ? [...entry.spanIds, s.id]
                            : entry.spanIds.filter((id) => id !== s.id),
                        })
                      }
                    />{" "}
                    {s.name} · pagina {s.page} · {s.id}
                    <span className="block whitespace-pre-wrap">{s.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button
              variant="outline"
              onClick={() => setEntries((rows) => rows.filter((_, n) => n !== i))}
            >
              Rimuovi requisito {i + 1}
            </Button>
          </fieldset>
        ))}
        <Button
          variant="outline"
          disabled={entries.length >= 50}
          onClick={() =>
            setEntries((rows) => [
              ...rows,
              {
                id: `requisito_${crypto.randomUUID().replaceAll("-", "")}`,
                label: "",
                kind: "eligibility",
                expected: true,
                spanIds: [],
              },
            ])
          }
        >
          Aggiungi requisito verificato
        </Button>
        <Button
          className="block h-auto whitespace-normal"
          disabled={!entries.length || !title.trim()}
          onClick={() => {
            try {
              const d = importGrantConfiguration(
                {
                  kind: "requirement_specification",
                  id: identity?.id ?? `bando_${crypto.randomUUID().replaceAll("-", "")}`,
                  title,
                  version: identity?.version ?? 1,
                  sourceHashes: packet.data!.sourceHashes,
                  chunkIndex,
                  specification: {
                    inputs: [],
                    declarations: entries,
                    minimums: [],
                    shares: [],
                    fieldLimits: [],
                    awardCaps: [],
                    awards: [],
                    unresolved: [],
                  },
                },
                sources,
              );
              onApply(d);
              setMessage(
                "Anteprima parziale creata. Revisione precedente azzerata; attivazione bloccata fino alla verifica completa del bando.",
              );
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Verificare i requisiti inseriti.");
            }
          }}
        >
          Sostituisci anteprima con questi requisiti
        </Button>
      </fieldset>
      <p role="status" className="text-sm break-words">
        {message}
      </p>
    </details>
  );
}
