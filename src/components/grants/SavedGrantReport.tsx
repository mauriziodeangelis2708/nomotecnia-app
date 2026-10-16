import { useQuery } from "@tanstack/react-query";
import { getTemplate, GRANT_STUDIO_ENABLED } from "@/lib/grants/repository";
import type { GrantAnswers } from "@/lib/grants/schema";
import { GrantResult } from "./GrantQuestionnaire";

export function SavedGrantReport({ answers, company }: { answers: unknown; company: string }) {
  const stored = answers as { _grant_version_id?: string; _grant_answers?: GrantAnswers };
  const template = useQuery({
    queryKey: ["grant-template", stored._grant_version_id],
    enabled: GRANT_STUDIO_ENABLED && !!stored._grant_version_id,
    queryFn: () => getTemplate(stored._grant_version_id!),
  });
  if (!GRANT_STUDIO_ENABLED || !stored._grant_version_id || template.error)
    return <p role="alert">Versione del bando non disponibile: impossibile produrre il report.</p>;
  if (!template.data) return <p>Caricamento della versione del bando…</p>;
  return (
    <GrantResult
      definition={template.data.parsed}
      answers={stored._grant_answers ?? {}}
      company={company}
    />
  );
}
