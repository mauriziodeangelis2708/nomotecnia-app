import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRules } from "@/hooks/use-rules";
import { AssessmentReport, isIperAssessment } from "@/components/AssessmentReport";
import { SavedGrantReport } from "@/components/grants/SavedGrantReport";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
export const Route = createFileRoute("/_authenticated/report/$id")({
  head: () => ({
    meta: [
      { title: "Report valutazione — NomotecnIA" },
      {
        name: "description",
        content: "Report completo della singola valutazione, stampabile in PDF.",
      },
    ],
  }),
  component: Report,
});
function Report() {
  const { id } = Route.useParams();
  const rules = useRules();
  const q = useQuery({
    queryKey: ["report", id],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const [a, ev, notes] = await Promise.all([
        supabase.from("assessments").select("*, clients(*)").eq("id", id).single(),
        supabase.from("evidences").select("*").eq("assessment_id", id).order("created_at"),
        supabase.from("assessment_notes").select("*").eq("assessment_id", id).order("created_at"),
      ]);
      if (a.error) throw a.error;
      if (ev.error) throw ev.error;
      if (notes.error) throw notes.error;
      return { a: a.data, ev: ev.data ?? [], notes: notes.data ?? [] };
    },
  });
  const grant =
    (q.data?.a.answers as Record<string, unknown>)?.["_assessment_type"] ===
    "configurable_grant_v1";
  const iper = q.data ? isIperAssessment(q.data.a) : false;
  if (q.error || (!iper && !grant && rules.error))
    return (
      <p role="alert">
        Impossibile caricare il report completo. Riprova: nessun esito disponibile.
      </p>
    );
  if (!q.data || (!iper && !grant && !rules.data)) return <p>Caricamento report…</p>;
  return (
    <div className="mx-auto min-w-0 max-w-4xl">
      <div className="report-actions no-print mb-4 flex flex-wrap gap-2 sm:justify-between">
        <Button variant="outline" asChild>
          <Link
            to={grant ? "/grant/$id" : iper ? "/iperammortamento/$id" : "/assessment/$id"}
            params={{ id }}
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alla valutazione
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Stampa / Salva PDF
        </Button>
      </div>
      {grant ? (
        <SavedGrantReport
          answers={q.data.a.answers}
          company={q.data.a.clients?.ragione_sociale ?? ""}
        />
      ) : (
        <AssessmentReport
          assessment={q.data.a}
          rules={rules.data?.map ?? {}}
          evidences={q.data.ev}
          notes={q.data.notes}
        />
      )}
    </div>
  );
}
