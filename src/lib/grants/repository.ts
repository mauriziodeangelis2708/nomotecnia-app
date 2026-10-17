import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { definitionHash, publicationProblems, type GrantReview } from "./lifecycle";
import { parseDefinition, type GrantDefinition } from "./schema";

export const GRANT_STUDIO_ENABLED = import.meta.env["VITE_ENABLE_GRANT_STUDIO"] === "true";
export type TemplateRow = {
  id: string;
  scheme_key: string;
  version: number;
  definition: Json;
  review: Json;
  revision: number;
  created_by: string;
  created_at: string;
  published_at: string | null;
};
type GrantDB = {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      grant_templates: {
        Row: TemplateRow;
        Insert: { scheme_key: string; version: number; definition: Json; review?: Json };
        Update: { definition?: Json; review?: Json; published_at?: string };
        Relationships: [];
      };
    };
  };
};
const db = supabase as unknown as SupabaseClient<GrantDB>;
export async function listTemplates(includeDrafts = false) {
  let query = db.from("grant_templates").select("*").order("created_at", { ascending: false });
  if (!includeDrafts) query = query.not("published_at", "is", null);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
export async function getTemplate(id: string, publishedOnly = true) {
  let query = db.from("grant_templates").select("*").eq("id", id);
  if (publishedOnly) query = query.not("published_at", "is", null);
  const { data, error } = await query.single();
  if (error) throw error;
  return { ...data, parsed: parseDefinition(data.definition) };
}
export async function saveTemplate(
  definition: GrantDefinition,
  review: GrantReview,
  current?: Pick<TemplateRow, "id" | "revision">,
) {
  const d = parseDefinition(definition);
  const payload = {
    definition: d as unknown as Json,
    review: { ...review, definitionHash: await definitionHash(d) } as unknown as Json,
  };
  const query = current
    ? db
        .from("grant_templates")
        .update(payload)
        .eq("id", current.id)
        .eq("revision", current.revision)
        .is("published_at", null)
    : db.from("grant_templates").insert({ ...payload, scheme_key: d.id, version: d.version });
  const { data, error } = await query.select("*").single();
  if (error)
    throw new Error(
      error.code === "PGRST116"
        ? "Bozza modificata altrove: ricaricare prima di salvare."
        : error.message,
    );
  return data;
}
export async function publishTemplate(
  definition: GrantDefinition,
  review: GrantReview,
  current: Pick<TemplateRow, "id" | "revision">,
) {
  const problems = publicationProblems(definition, review);
  if (problems.length) throw new Error(problems.join(" "));
  // Save precisely the reviewed contents first, then publish under a revision lease.
  const saved = await saveTemplate(definition, review, current);
  const { data, error } = await db
    .from("grant_templates")
    .update({ published_at: new Date().toISOString() })
    .eq("id", saved.id)
    .eq("revision", saved.revision)
    .is("published_at", null)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
