-- Applied ONLY to nomotecnia-staging (vknvadzsjuixcuwegxto).
-- Migration: fix_staging_clients_insert_returning_visibility.
-- Documentation of the staging repair; deliberately outside supabase/migrations.
-- Never apply to production or run as an automatic deployment.
-- The SELECT policy must evaluate the candidate row directly. Looking it up
-- through can_access_client(id) cannot see INSERT ... RETURNING's new row.
-- Existing membership and owner/admin access semantics remain unchanged.
alter policy "staging clients select" on public.clients
using (
  public.is_member(auth.uid())
  and (created_by = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role))
);
