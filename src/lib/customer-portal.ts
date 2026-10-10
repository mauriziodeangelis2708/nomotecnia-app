import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
export const SUBMISSION_STATES: Record<string, string> = {
  draft: "Bozza",
  submitted: "Da esaminare",
  in_progress: "In lavorazione",
  completed: "Completato",
};
export async function submissionAction(action: string, id: string | null, payload: Json = {}) {
  const { data, error } = await supabase.rpc("customer_submission_action", {
    _action: action,
    ...(id ? { _id: id } : {}),
    _payload: payload,
  });
  if (error) throw error;
  return data;
}
