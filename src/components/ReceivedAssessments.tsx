import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submissionAction, SUBMISSION_STATES } from "@/lib/customer-portal";
import { customerSections } from "./CustomerQuestionnaire";
import { displayAnswer } from "./AssessmentReport";
import type { Answers } from "@/lib/engine";
import { dt } from "@/lib/checklist";
import { Button } from "./ui/button";
export function ReceivedAssessments() {
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["received-assessments"],
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_submissions")
        .select("*")
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function update(id: string, state: string) {
    setBusy(id);
    try {
      await submissionAction("status", id, { state });
      await q.refetch();
    } catch {
      toast.error("Stato non aggiornato");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          Assessment ricevuti {q.data ? `(${q.data.length})` : ""}
        </h2>
        <Button variant="outline" onClick={() => q.refetch()}>
          Aggiorna ricevuti
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Pratiche inviate dai clienti. Apri la valutazione per usare tutte le funzioni abituali. I
        dati originali restano conservati separatamente dalle modifiche dei soci.
      </p>
      {q.isLoading ? (
        <p>Caricamento…</p>
      ) : q.error ? (
        <p role="alert">Impossibile caricare gli assessment ricevuti.</p>
      ) : !q.data?.length ? (
        <p>Nessun assessment ricevuto.</p>
      ) : (
        q.data.map((s) => (
          <div key={s.id} className="space-y-3 rounded border p-4">
            <h3 className="break-words font-semibold">
              {s.company} · {s.scheme === "lazio" ? "Voucher Lazio" : "Iperammortamento 2026"}
            </h3>
            <p className="break-words text-sm">
              Inviato da {s.sender_email} il {dt(s.submitted_at!)}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {s.assessment_id ? (
                <Button asChild>
                  <Link
                    to={s.scheme === "lazio" ? "/assessment/$id" : "/iperammortamento/$id"}
                    params={{ id: s.assessment_id }}
                  >
                    Apri valutazione
                  </Link>
                </Button>
              ) : (
                <p>Valutazione eliminata: dati originali conservati.</p>
              )}
              <label className="flex flex-wrap items-center gap-2 text-sm">
                Stato pratica
                <select
                  aria-label={`Stato pratica ${s.company}`}
                  className="rounded border bg-card p-2"
                  disabled={busy === s.id}
                  value={s.state}
                  onChange={(e) => update(s.id, e.target.value)}
                >
                  {Object.entries(SUBMISSION_STATES)
                    .filter(([k]) => k !== "draft")
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {s.correction_requested_at && (
              <div className="rounded border border-amber-400 p-3 text-sm">
                <strong>Richiesta di correzione · {dt(s.correction_requested_at)}</strong>
                <p className="whitespace-pre-wrap break-words">{s.correction_request}</p>
              </div>
            )}
            <details>
              <summary className="cursor-pointer py-2 font-medium">
                Dati originali inviati dal cliente
              </summary>
              <p className="mb-3 text-sm">
                Copia dell’invio, non modificabile. Le integrazioni dei soci sono nella valutazione.
              </p>
              {customerSections(s.scheme, s.answers as Answers).map((section) => (
                <div key={section.title} className="mb-4">
                  <h4 className="font-semibold">{section.title}</h4>
                  <dl>
                    {section.fields.map((f) => (
                      <div key={f.id} className="border-b py-2 text-sm">
                        <dt>{f.label}</dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                          {displayAnswer((s.answers as Answers)[f.id], f.options)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </details>
          </div>
        ))
      )}
    </section>
  );
}
