-- Additive staging-development guard for optional requirement inventories.
-- Existing definitions without an inventory keep their current behavior.
create function private.guard_grant_requirement_inventory() returns trigger
language plpgsql security invoker set search_path='' as $$
declare r jsonb; link jsonb; seen text[] := array[]::text[];
begin
 if new.published_at is null or not (new.definition ? 'requirements') then return new; end if;
 if jsonb_typeof(new.definition->'requirements') is distinct from 'array' then raise exception 'Inventario non valido'; end if;
 if jsonb_array_length(new.definition->'requirements')>500 then raise exception 'Inventario troppo esteso'; end if;
 for r in select * from jsonb_array_elements(new.definition->'requirements') loop
   if jsonb_typeof(r) is distinct from 'object' or coalesce(r->>'id','') !~ '^[a-z][a-z0-9_]{0,63}$' or (r->>'id')=any(seen) then raise exception 'Identificatore inventario non valido'; end if;
   seen:=array_append(seen,r->>'id');
   if r ? 'gap' then raise exception 'Lacuna inventario irrisolta'; end if;
   if jsonb_typeof(r->'questionIds') is distinct from 'array' or jsonb_typeof(r->'ruleIds') is distinct from 'array' then raise exception 'Collegamenti inventario non validi'; end if;
   if jsonb_array_length(r->'questionIds')=0 or jsonb_array_length(r->'ruleIds')=0 then raise exception 'Copertura inventario incompleta'; end if;
   for link in select * from jsonb_array_elements(r->'questionIds') loop
     if jsonb_typeof(link) is distinct from 'string' or not exists(select 1 from jsonb_array_elements(new.definition->'questions') q where q->'id'=link) then raise exception 'Domanda inventario inesistente'; end if;
   end loop;
   for link in select * from jsonb_array_elements(r->'ruleIds') loop
     if jsonb_typeof(link) is distinct from 'string' or not exists(select 1 from jsonb_array_elements(new.definition->'rules') q where q->'id'=link) then raise exception 'Regola inventario inesistente'; end if;
   end loop;
   if jsonb_typeof(new.review->'items') is distinct from 'array' or not ((new.review->'items') ? ('requirement:'||(r->>'id'))) then raise exception 'Requisito inventario non revisionato'; end if;
 end loop;
 return new;
end $$;
revoke all on function private.guard_grant_requirement_inventory() from public,anon,authenticated;
create trigger guard_grant_requirement_inventory before insert or update on public.grant_templates
for each row execute function private.guard_grant_requirement_inventory();
