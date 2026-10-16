-- Additive private archive. No changes to assessment answers or existing authorization rules.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('assessment-documents', 'assessment-documents', false, 8388608, array['application/pdf'])
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from storage.buckets where id='assessment-documents' and not public
    and file_size_limit=8388608 and allowed_mime_types=array['application/pdf']) then
    raise exception 'Unexpected archive bucket configuration';
  end if;
end $$;

create schema if not exists private;
grant usage on schema private to authenticated;

-- INVOKER: existing assessment RLS remains authoritative. Lock against concurrent
-- assessment deletion until the storage INSERT transaction has completed.
create or replace function private.can_insert_assessment_pdf(_assessment text)
returns boolean language plpgsql volatile security invoker set search_path='' as $$
begin
  if auth.uid() is null or not public.is_member(auth.uid()) then return false; end if;
  perform a.id from public.assessments a where a.id::text=_assessment for key share;
  return found;
end $$;
revoke all on function private.can_insert_assessment_pdf(text) from public, anon;
grant execute on function private.can_insert_assessment_pdf(text) to authenticated;

create policy "assessment pdf read" on storage.objects for select to authenticated
using (bucket_id='assessment-documents' and public.is_member(auth.uid()) and
  exists (select 1 from public.assessments a where a.id::text=(storage.foldername(name))[1]));

create policy "assessment pdf insert" on storage.objects for insert to authenticated
with check (bucket_id='assessment-documents' and
  name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}--[A-Za-z0-9_-]{1,80}[.]pdf$' and
  private.can_insert_assessment_pdf((storage.foldername(name))[1]));

create policy "assessment pdf delete" on storage.objects for delete to authenticated
using (bucket_id='assessment-documents' and public.is_member(auth.uid()) and
  exists (select 1 from public.assessments a where a.id::text=(storage.foldername(name))[1]));
-- Deliberately no UPDATE: no overwrite, rename or move to another practice.

-- Trigger-only integrity check, not an authorization helper. DEFINER is necessary
-- to see originals even during a parent's cascading deletion after its RLS row disappears.
-- It never deletes storage metadata/bytes: removal must use the Storage API first.
create or replace function private.guard_archived_assessment_delete()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists (select 1 from storage.objects o where o.bucket_id='assessment-documents'
    and split_part(o.name,'/',1)=old.id::text) then
    raise exception 'Rimuovi prima i PDF dall’archivio della pratica.' using errcode='23503';
  end if;
  return old;
end $$;
revoke all on function private.guard_archived_assessment_delete() from public, anon, authenticated;
create trigger guard_archived_assessment_delete before delete on public.assessments
for each row execute function private.guard_archived_assessment_delete();
