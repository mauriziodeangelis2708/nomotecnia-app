import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRules } from "@/hooks/use-rules";
import { evaluate, type Answers } from "@/lib/engine";
import { CHECKLIST, DOC_STATUS, eur } from "@/lib/checklist";
import { ResultView } from "@/components/ResultView";
import { Disclaimer } from "@/components/StatusBadge";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/report/$id")({
  head: () => ({
    meta: [
      { title: "Report cliente — NomotecnIA" },
      { name: "description", content: "Report preliminare esportabile in PDF." },
    ],
  }),
  component: Report,
});

function Report() {
  const { id } = Route.useParams();
  const rules = useRules();
  const q = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const [a, ev] = await Promise.all([
        supabase.from("assessments").select("*, clients(*)").eq("id", id).single(),
        supabase.from("evidences").select("*").eq("assessment_id", id),
      ]);
      if (a.error) throw a.error;
      if (ev.error) throw ev.error;
      return { a: a.data, ev: ev.data ?? [] };
    },
  });
  if (q.error || rules.error)
    return (
      <p role="alert" className="text-destructive">
        Impossibile caricare il report. Riprova: nessun esito disponibile.
      </p>
    );
  if (!q.data || !rules.data) return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  const { a, ev } = q.data;
  const r = evaluate(
    a.answers as Answers,
    rules.data.map,
    ev.map((e) => ({
      intervention: e.intervention,
      amount: e.amount === null ? null : Number(e.amount),
    })),
    (a.checklist ?? {}) as Record<string, { status: string }>,
  );
  const cl = (a.checklist ?? {}) as Record<string, { status: string; note?: string }>;
  const unvalidated = rules.data.list.filter((x) => x.status !== "validata").length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-4 flex justify-between">
        <Button variant="ghost" asChild>
          <Link to="/assessment/$id" params={{ id }}>
            <ArrowLeft className="h-4 w-4" /> Torna all'assessment
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Stampa / Salva PDF
        </Button>
      </div>
      <div className="print-page space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex items-start justify-between border-b pb-4">
          <Brand />
          <div className="text-right text-xs text-muted-foreground">
            Report preliminare
            <br />
            {new Date().toLocaleDateString("it-IT")}
          </div>
        </div>
        <div>
          <h1 className="font-display text-2xl">{a.clients?.ragione_sociale}</h1>
          <p className="text-sm text-muted-foreground">
            {a.title}
            {a.clients?.partita_iva ? ` · P.IVA ${a.clients.partita_iva}` : ""}
          </p>
        </div>
        <Disclaimer />
        <ResultView r={r} rules={rules.data.map} compact />
        <div>
          <h3 className="mb-2 font-semibold">Documenti</h3>
          <table className="w-full text-sm">
            <tbody>
              {CHECKLIST.map((d) => (
                <tr key={d.key} className="border-b">
                  <td className="py-1.5">{d.label}</td>
                  <td className="py-1.5 text-right text-muted-foreground">
                    {DOC_STATUS.find((s) => s.value === (cl[d.key]?.status ?? "mancante"))?.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ev.length > 0 && (
          <div>
            <h3 className="mb-2 font-semibold">Evidenze registrate</h3>
            <ul className="text-sm">
              {ev.map((e) => (
                <li key={e.id}>
                  · {e.title} ({e.kind}) {e.amount !== null && `— ${eur(Number(e.amount))}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="border-t pt-4 text-xs text-muted-foreground">
          Valori teorici calcolati sulle regole e sulla versione indicate nel report; non
          rappresentano contributo concesso o garantito.
          {` ${unvalidated} regole risultano ancora non validate rispetto al testo ufficiale dell'Avviso e delle appendici.`}
        </p>
      </div>
    </div>
  );
}
