import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Answers } from "@/lib/engine";
import type { Json } from "@/integrations/supabase/types";
import { submissionAction, SUBMISSION_STATES } from "@/lib/customer-portal";
import { CustomerQuestionnaire } from "@/components/CustomerQuestionnaire";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dt } from "@/lib/checklist";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { access: "client" } });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Area clienti — NomotecnIA" }] }),
  component: CustomerPortal,
});
export function CustomerPortal() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [scheme, setScheme] = useState("lazio");
  const [answers, setAnswers] = useState<Answers>({});
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const list = useQuery({
    queryKey: ["my-submissions", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_submissions")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save(send = false) {
    if (busy) return;
    if (company.trim().length < 2) {
      toast.error("Inserisci la ragione sociale");
      return;
    }
    if (
      Object.values(answers).some((v) => typeof v === "number" && (!Number.isFinite(v) || v < 0))
    ) {
      toast.error("Controlla i valori numerici: non possono essere negativi");
      return;
    }
    if (
      send &&
      !window.confirm(
        "Inviare i dati a NomotecnIA? Dopo l’invio potrai richiedere correzioni, ma non modificare o eliminare la pratica.",
      )
    )
      return;
    setBusy(true);
    try {
      const saved = await submissionAction("save", id, {
        scheme,
        company: company.trim(),
        answers: answers as Json,
      });
      setId(saved);
      setDirty(false);
      if (send) {
        await submissionAction("submit", saved);
        setEditing(false);
        toast.success("Dati inviati correttamente a NomotecnIA");
      } else toast.success("Bozza salvata");
      await qc.invalidateQueries({ queryKey: ["my-submissions"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operazione non riuscita. Riprova.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(draftId: string) {
    if (busy || !window.confirm("Eliminare questa bozza?")) return;
    setBusy(true);
    try {
      await submissionAction("delete", draftId);
      await list.refetch();
    } catch {
      toast.error("Bozza non eliminata");
    } finally {
      setBusy(false);
    }
  }
  async function requestCorrection(submissionId: string) {
    const message = window.prompt(
      "Quali dati vuoi correggere? La richiesta sarà visibile ai soci nella piattaforma.",
    );
    if (!message?.trim()) return;
    setBusy(true);
    try {
      await submissionAction("correction", submissionId, { message });
      await list.refetch();
      toast.success("Richiesta registrata");
    } catch {
      toast.error("Richiesta non registrata");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Brand />
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link
              to="/"
              onClick={(e) => {
                if (dirty && !window.confirm("Uscire senza salvare?")) e.preventDefault();
              }}
            >
              Home
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              if (dirty && !window.confirm("Uscire senza salvare?")) return;
              await supabase.auth.signOut();
              qc.clear();
              window.location.assign("/auth?access=client");
            }}
          >
            Esci
          </Button>
        </div>
      </header>
      <h1 className="text-2xl font-semibold">Area clienti</h1>
      {!user.email_confirmed_at ? (
        <p>Conferma la tua email per compilare un assessment.</p>
      ) : editing ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (!dirty || window.confirm("Chiudere senza salvare le ultime modifiche?")) {
                  setEditing(false);
                  setDirty(false);
                }
              }}
            >
              Torna alle mie pratiche
            </Button>
            <Button disabled={busy} onClick={() => save()}>
              Salva bozza
            </Button>
            <Button disabled={busy} onClick={() => save(true)}>
              Invia a NomotecnIA
            </Button>
          </div>
          <p>
            Compila i dati che conosci. Puoi salvare una bozza e completarla più tardi. La
            valutazione sarà svolta da NomotecnIA.
          </p>
          <label className="block space-y-2">
            Misura
            <select
              className="block w-full rounded border bg-card p-3"
              aria-label="Misura"
              value={scheme}
              disabled={!!id || busy}
              onChange={(e) => {
                if (
                  Object.keys(answers).length &&
                  !window.confirm("Cambiare misura e svuotare i dati di questa nuova bozza?")
                )
                  return;
                setScheme(e.target.value);
                setAnswers({});
                setDirty(true);
              }}
            >
              <option value="lazio">Voucher Digitalizzazione PMI Lazio</option>
              <option value="iperammortamento">Iperammortamento 2026</option>
            </select>
          </label>
          <label className="block space-y-2">
            Ragione sociale
            <Input
              aria-label="Ragione sociale della pratica"
              value={company}
              maxLength={200}
              disabled={busy}
              onChange={(e) => {
                setCompany(e.target.value);
                setAnswers((a) => ({
                  ...a,
                  [scheme === "lazio" ? "ragione_sociale" : "denominazione"]: e.target.value,
                }));
                setDirty(true);
              }}
            />
          </label>
          <fieldset disabled={busy}>
            <CustomerQuestionnaire
              scheme={scheme}
              answers={answers}
              onChange={(key, value) => {
                setAnswers((a) => ({ ...a, [key]: value }));
                if (key === "ragione_sociale" || key === "denominazione")
                  setCompany(String(value ?? ""));
                setDirty(true);
              }}
            />
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => save()}>
              Salva bozza
            </Button>
            <Button disabled={busy} onClick={() => save(true)}>
              Invia a NomotecnIA
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p>
            Inserisci i dati della tua azienda e inviali a NomotecnIA. Qui trovi soltanto le tue
            pratiche e il loro stato.
          </p>
          <Button
            onClick={() => {
              setId(null);
              setAnswers({});
              setCompany("");
              setScheme("lazio");
              setDirty(false);
              setEditing(true);
            }}
          >
            + Nuovo assessment
          </Button>
          {list.isLoading ? (
            <p>Caricamento…</p>
          ) : list.error ? (
            <p role="alert">
              Impossibile caricare le pratiche.{" "}
              <button onClick={() => list.refetch()}>Riprova</button>
            </p>
          ) : !list.data?.length ? (
            <p>Non hai ancora creato assessment.</p>
          ) : (
            list.data.map((s) => (
              <section key={s.id} className="space-y-3 rounded-lg border bg-card p-4">
                <h2 className="break-words font-semibold">{s.company}</h2>
                <p>
                  {s.scheme === "lazio" ? "Voucher Lazio" : "Iperammortamento 2026"} ·{" "}
                  {SUBMISSION_STATES[s.state]}
                </p>
                {s.state === "draft" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setId(s.id);
                        setScheme(s.scheme);
                        setCompany(s.company);
                        setAnswers(s.answers as Answers);
                        setDirty(false);
                        setEditing(true);
                      }}
                    >
                      Completa / modifica
                    </Button>
                    <Button disabled={busy} variant="outline" onClick={() => remove(s.id)}>
                      Elimina bozza
                    </Button>
                  </div>
                ) : (
                  <>
                    <p>Dati inviati correttamente · {dt(s.submitted_at!)}</p>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => requestCorrection(s.id)}
                    >
                      Richiedi correzione
                    </Button>
                    {s.correction_requested_at && (
                      <p className="text-sm">
                        Richiesta di correzione registrata il {dt(s.correction_requested_at)}.
                      </p>
                    )}
                  </>
                )}
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
