import { parseDefinition, type GrantDefinition } from "../../src/lib/grants/schema";
import { publicationProblems, type GrantReview } from "../../src/lib/grants/lifecycle";
type Row = {
  id: string;
  scheme_key: string;
  version: number;
  definition: GrantDefinition;
  review: GrantReview;
  revision: number;
  published_at: string | null;
};
const key = "synthetic-grant-studio-only";
const get = (): Row[] => JSON.parse(localStorage.getItem(key) ?? "[]");
export const GRANT_STUDIO_ENABLED = true;
export async function listTemplates() {
  return get();
}
export async function saveTemplate(
  d: GrantDefinition,
  review: GrantReview,
  current?: { id: string; revision: number },
) {
  const rows = get(),
    existing = rows.find((r) => r.id === current?.id);
  if (existing && (existing.published_at || existing.revision !== current?.revision))
    throw new Error("Versione immutabile o bozza obsoleta.");
  const saved: Row = {
    id: existing?.id ?? crypto.randomUUID(),
    scheme_key: d.id,
    version: d.version,
    definition: parseDefinition(d),
    review,
    revision: (existing?.revision ?? 0) + 1,
    published_at: null,
  };
  localStorage.setItem(key, JSON.stringify([...rows.filter((r) => r.id !== saved.id), saved]));
  return saved;
}
export async function publishTemplate(
  d: GrantDefinition,
  review: GrantReview,
  current: { id: string; revision: number },
) {
  const problems = publicationProblems(d, review);
  if (problems.length) throw new Error(problems.join(" "));
  const row = await saveTemplate(d, review, current);
  row.published_at = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify([...get().filter((r) => r.id !== row.id), row]));
  return row;
}
