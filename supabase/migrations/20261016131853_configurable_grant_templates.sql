-- Development-only rollout. No changes to existing Lazio/iper rules or customer access.
create table public.grant_templates (
 id uuid primary key default gen_random_uuid(),
 scheme_key text not null check(scheme_key ~ '^[a-z][a-z0-9_]{0,63}$'),
 version integer not null check(version between 1 and 100000),
 definition jsonb not null check(jsonb_typeof(definition)='object' and octet_length(definition::text)<=1500000),
 review jsonb not null default '{}' check(jsonb_typeof(review)='object' and octet_length(review::text)<=250000),
 revision integer not null default 1,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 published_at timestamptz,
 unique(scheme_key,version),
 check((definition->>'id'=scheme_key and (definition->>'version')::integer=version and (definition->>'schemaVersion')::integer=1) is true),
 check((jsonb_typeof(definition->'questions')='array' and jsonb_array_length(definition->'questions') between 1 and 150) is true),
 check((jsonb_typeof(definition->'rules')='array' and jsonb_array_length(definition->'rules') between 1 and 250) is true),
 check((jsonb_typeof(definition->'sources')='array' and jsonb_array_length(definition->'sources') between 1 and 12) is true),
 check((jsonb_typeof(definition->'unresolved')='array') is true)
);
create index grant_templates_creator on public.grant_templates(created_by);
alter table public.grant_templates enable row level security;
revoke all on public.grant_templates from public,anon,authenticated;
grant select,insert,update,delete on public.grant_templates to authenticated;
grant all on public.grant_templates to service_role;
create policy "admin drafts and staff published grants" on public.grant_templates for select to authenticated
 using(public.has_role(auth.uid(),'admin') or (published_at is not null and public.is_member(auth.uid())));
create policy "admin creates draft grant" on public.grant_templates for insert to authenticated
 with check(public.has_role(auth.uid(),'admin') and created_by=auth.uid() and published_at is null);
create policy "admin updates draft grant" on public.grant_templates for update to authenticated
 using(public.has_role(auth.uid(),'admin') and published_at is null)
 with check(public.has_role(auth.uid(),'admin'));
create policy "admin deletes draft grant" on public.grant_templates for delete to authenticated
 using(public.has_role(auth.uid(),'admin') and published_at is null);

create function private.guard_grant_template_version() returns trigger language plpgsql security invoker set search_path='' as $$
declare s jsonb; p jsonb; item jsonb;
begin
 if tg_op='DELETE' then
   if old.published_at is not null then raise exception 'Una versione attivata è immutabile'; end if;
   return old;
 end if;
 if tg_op='INSERT' then
   if new.published_at is not null or new.revision<>1 then raise exception 'Creare prima una bozza'; end if;
 else
   if old.published_at is not null then raise exception 'Una versione attivata è immutabile'; end if;
   if new.id<>old.id or new.scheme_key<>old.scheme_key or new.version<>old.version or new.created_by<>old.created_by or new.created_at<>old.created_at then raise exception 'Identità della versione immutabile'; end if;
   new.revision:=old.revision+1;
 end if;
 if new.published_at is not null then
   if jsonb_array_length(new.definition->'unresolved')<>0 then raise exception 'Questioni irrisolte'; end if;
   if jsonb_typeof(new.review->'sources') is distinct from 'array' or jsonb_typeof(new.review->'items') is distinct from 'array' or jsonb_typeof(new.review->'scenarios') is distinct from 'array' then raise exception 'Revisione incompleta'; end if;
   for s in select * from jsonb_array_elements(new.definition->'sources') loop
     for p in select * from jsonb_array_elements(s->'pages') loop
       if not (new.review->'sources') ? ((s->>'id')||':'||(p->>'page')) then raise exception 'Pagina non revisionata'; end if;
     end loop;
   end loop;
   for item in select * from jsonb_array_elements(new.definition->'questions') loop
     if not (new.review->'items') ? ('question:'||(item->>'id')) then raise exception 'Domanda non revisionata'; end if;
   end loop;
   for item in select * from jsonb_array_elements(new.definition->'rules') loop
     if not (new.review->'items') ? ('rule:'||(item->>'id')) then raise exception 'Regola non revisionata'; end if;
   end loop;
   if not (new.review->'scenarios' @> '[{"expected":"pre_eligible"}]' and new.review->'scenarios' @> '[{"expected":"not_eligible"}]' and new.review->'scenarios' @> '[{"expected":"incomplete"}]') then raise exception 'Collaudo incompleto'; end if;
   new.published_at:=now();
 end if;
 return new;
end $$;
revoke all on function private.guard_grant_template_version() from public,anon,authenticated;
create trigger guard_grant_template_version before insert or update or delete on public.grant_templates
 for each row execute function private.guard_grant_template_version();

-- Preserve the selected immutable version even when a different editor calls the API.
create function private.guard_configurable_grant_assessment() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and old.answers->>'_assessment_type'='configurable_grant_v1' then
   if new.answers->>'_assessment_type' is distinct from old.answers->>'_assessment_type' or new.answers->>'_grant_version_id' is distinct from old.answers->>'_grant_version_id' then
     raise exception 'La versione del bando di questa valutazione è immutabile';
   end if;
 end if;
 if new.answers->>'_assessment_type'='configurable_grant_v1' then
   if not public.is_member(auth.uid()) or jsonb_typeof(new.answers->'_grant_answers') is distinct from 'object' or octet_length((new.answers->'_grant_answers')::text)>250000 then raise exception 'Risposte non valide'; end if;
   if not exists(select 1 from public.grant_templates where id::text=new.answers->>'_grant_version_id' and published_at is not null) then raise exception 'Versione del bando non disponibile'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_configurable_grant_assessment() from public,anon,authenticated;
create trigger guard_configurable_grant_assessment before insert or update on public.assessments
 for each row execute function private.guard_configurable_grant_assessment();
