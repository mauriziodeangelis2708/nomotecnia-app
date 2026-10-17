import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getTemplate, GRANT_STUDIO_ENABLED, listTemplates } from "@/lib/grants/repository";
import type { GrantAnswers } from "@/lib/grants/schema";
import { evaluateGrant } from "@/lib/grants/engine";
import { GrantQuestionnaire, GrantResult } from "@/components/grants/GrantQuestionnaire";
import { GRANT_STATUS } from "@/lib/grants/status";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/grant/$id")({ component: GrantAssessment });
const MARKER = "configurable_grant_v1";
function GrantAssessment() {
  const { id } = Route.useParams(),
    nav = useNavigate(),
    qc = useQueryClient();
  const fresh = id.startsWith("new-"),
    clientId = fresh ? id.slice(4) : null;
  const [templateId, setTemplateId] = useState("");
  const [answers, setAnswers] = useState<GrantAnswers>({});
  const [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  const savingRef = useRef(false);
  const [loadedId, setLoadedId] = useState("");
  const row = useQuery({
    queryKey: ["grant-assessment", id],
    enabled: !fresh && GRANT_STUDIO_ENABLED,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, clients(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      const dataAnswers = data.answers as Record<string, Json>;
      if (
        dataAnswers["_assessment_type"] !== MARKER ||
        typeof dataAnswers["_grant_version_id"] !== "string"
      )
        throw new Error("Tipo di assessment non valido.");
      return {
        ...data,
        grantVersionId: dataAnswers["_grant_version_id"],
        values: (dataAnswers["_grant_answers"] ?? {}) as GrantAnswers,
      };
    },
  });
  const company = useQuery({
    queryKey: ["grant-client", clientId],
    enabled: fresh && GRANT_STUDIO_ENABLED,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const choices = useQuery({
    queryKey: ["grant-templates"],
    enabled: fresh && GRANT_STUDIO_ENABLED,
    queryFn: () => listTemplates(),
  });
  const selectedId = fresh ? templateId : row.data?.grantVersionId;
  const template = useQuery({
    queryKey: ["grant-template", selectedId],
    enabled: !!selectedId && GRANT_STUDIO_ENABLED,
    queryFn: () => getTemplate(selectedId!),
  });
  useEffect(() => {
    if (row.data && loadedId !== row.data.id) {
      setAnswers(row.data.values);
      setLoadedId(row.data.id);
    }
  }, [row.data, loadedId]);
  async function save() {
    if (savingRef.current || !template.data || (!fresh && loadedId !== id)) return;
    savingRef.current = true;
    setSaving(true);
    setMessage("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sessione non valida.");
      const definition = template.data.parsed;
      const state = evaluateGrant(definition, answers);
      const payload = {
        answers: {
          _assessment_type: MARKER,
          _grant_version_id: template.data.id,
          _grant_answers: answers,
        } as unknown as Json,
        status: GRANT_STATUS[state.status],
      };
      const query = fresh
        ? supabase.from("assessments").insert({
            ...payload,
            title: `${definition.title} · ${company.data!.ragione_sociale}`,
            client_id: clientId!,
            created_by: auth.user.id,
            checklist: {},
          })
        : supabase.from("assessments").update(payload).eq("id", id);
      const { data, error } = await query.select("id").single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["clients"] });
      await qc.invalidateQueries({ queryKey: ["grant-assessment", data.id] });
      setMessage("Assessment salvato.");
      if (fresh) await nav({ to: "/grant/$id", params: { id: data.id }, replace: true });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Salvataggio non riuscito.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  if (!GRANT_STUDIO_ENABLED) return <p>Funzione in sviluppo, non attiva in questo ambiente.</p>;
  if (row.error || company.error || template.error || choices.error)
    return (
      <p role="alert">
        Impossibile caricare cliente, assessment o versione del bando. Nessun esito disponibile.
      </p>
    );
  const name = fresh ? company.data?.ragione_sociale : row.data?.clients?.ragione_sociale;
  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-5">
      <div className="no-print flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/dashboard">Torna ai clienti</Link>
        </Button>
        {!fresh && (
          <Button asChild variant="outline">
            <Link to="/report/$id" params={{ id }}>
              Report della versione salvata
            </Link>
          </Button>
        )}
      </div>
      <h1 className="break-words text-2xl">Nuovo assessment · {name ?? "Caricamento…"}</h1>
      {fresh && (
        <label className="block space-y-2 text-sm">
          Bando attivato
          <select
            className="block w-full min-w-0 rounded border bg-background p-2"
            value={templateId}
            disabled={saving}
            onChange={(e) => {
              setTemplateId(e.target.value);
              setAnswers({});
            }}
          >
            <option value="">Seleziona un bando</option>
            {choices.data?.map((t) => (
              <option value={t.id} key={t.id}>
                {(t.definition as { title?: string }).title} · v{t.version}
              </option>
            ))}
          </select>
        </label>
      )}
      {fresh && choices.data?.length === 0 && (
        <p>Nessun nuovo bando attivato. Un amministratore deve prima completarne la revisione.</p>
      )}
      <p role="status" className="text-sm">
        {message}
      </p>
      {template.data && (
        <>
          <p className="text-sm">
            {template.data.parsed.title} · versione {template.data.version}. Questa versione resta
            associata alla valutazione.
          </p>
          <GrantQuestionnaire
            definition={template.data.parsed}
            answers={answers}
            onChange={setAnswers}
          />
          <details>
            <summary>Anteprima esito corrente</summary>
            <GrantResult definition={template.data.parsed} answers={answers} company={name} />
          </details>
          <Button disabled={saving || !name || (!fresh && loadedId !== id)} onClick={save}>
            {saving ? "Salvataggio…" : "Salva assessment"}
          </Button>
        </>
      )}
    </div>
  );
}
