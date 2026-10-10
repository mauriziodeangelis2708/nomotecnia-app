-- Separate customer intake from staff-only assessments. Existing rows are unchanged.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table public.customer_submissions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 scheme text not null check(scheme in ('lazio','iperammortamento')),
 company text not null check(length(company) between 2 and 200),
 answers jsonb not null default '{}' check(jsonb_typeof(answers)='object'),
 sender_email text not null,
 state text not null default 'draft' check(state in ('draft','submitted','in_progress','completed')),
 submitted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 client_id uuid references public.clients(id) on delete set null,
 assessment_id uuid unique references public.assessments(id) on delete set null,
 correction_request text,
 correction_requested_at timestamptz,
 check((state='draft' and submitted_at is null) or (state<>'draft' and submitted_at is not null))
);
create index customer_submissions_owner on public.customer_submissions(owner_id);
create index customer_submissions_client on public.customer_submissions(client_id);
alter table public.customer_submissions enable row level security;
revoke all on public.customer_submissions from anon, authenticated;
grant select on public.customer_submissions to authenticated;
grant all on public.customer_submissions to service_role;
create function private.confirmed_customer() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and not is_anonymous);
$$;
revoke all on function private.confirmed_customer() from public, anon;
grant execute on function private.confirmed_customer() to authenticated;
create policy "customer own intake or submitted staff inbox" on public.customer_submissions for select to authenticated
 using(private.confirmed_customer() and (owner_id=auth.uid() or (submitted_at is not null and public.is_member(auth.uid()))));

-- Narrow privileged gateway: clients can write only their intake, never staff tables.
create function private.customer_submission_action(_action text, _id uuid, _payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.customer_submissions; actor uuid:=auth.uid(); email_address text; new_client uuid; new_assessment uuid; a jsonb; company_name text;
begin
 if not private.confirmed_customer() then raise exception 'Conferma la tua email e accedi per continuare' using errcode='42501'; end if;
 select email into email_address from auth.users where id=actor;
 if _action='save' then
   if jsonb_typeof(_payload->'answers') is distinct from 'object' or octet_length((_payload->'answers')::text)>250000 then raise exception 'Dati non validi o troppo estesi'; end if;
   company_name:=trim(_payload->>'company');
   if company_name is null or length(company_name)<2 or length(company_name)>200 or coalesce(_payload->>'scheme','') not in ('lazio','iperammortamento') then raise exception 'Azienda o misura non valida'; end if;
   a:=(_payload->'answers') - '_assessment_type';
   if _payload->>'scheme'='iperammortamento' then a:=a||jsonb_build_object('_assessment_type','iperammortamento_2026','denominazione',company_name);
   else a:=a||jsonb_build_object('ragione_sociale',company_name); end if;
   if _id is null then
     insert into public.customer_submissions(owner_id,scheme,company,answers,sender_email) values(actor,_payload->>'scheme',company_name,a,email_address) returning id into _id;
   else
     select * into s from public.customer_submissions where id=_id and owner_id=actor for update;
     if not found or s.state<>'draft' then raise exception 'Bozza non disponibile' using errcode='42501'; end if;
     if s.scheme<>_payload->>'scheme' then raise exception 'Non puoi cambiare la misura della bozza'; end if;
     update public.customer_submissions set company=company_name,answers=a,updated_at=now() where id=_id;
   end if;
   return _id;
 end if;
 select * into s from public.customer_submissions where id=_id for update;
 if not found then raise exception 'Pratica non disponibile' using errcode='42501'; end if;
 if _action='status' then
   if not public.is_member(actor) or s.submitted_at is null then raise exception 'Accesso riservato ai soci' using errcode='42501'; end if;
   if coalesce(_payload->>'state','') not in ('submitted','in_progress','completed') then raise exception 'Stato non valido'; end if;
   update public.customer_submissions set state=_payload->>'state',updated_at=now() where id=_id;
   return _id;
 end if;
 if s.owner_id<>actor then raise exception 'Pratica non disponibile' using errcode='42501'; end if;
 if _action='delete' then
   if s.state<>'draft' then raise exception 'Una pratica inviata non può essere eliminata dal cliente'; end if;
   delete from public.customer_submissions where id=_id; return _id;
 elsif _action='correction' then
   if s.submitted_at is null or length(trim(coalesce(_payload->>'message','')))=0 or length(_payload->>'message')>4000 then raise exception 'Inserisci la correzione richiesta (massimo 4000 caratteri)'; end if;
   update public.customer_submissions set correction_request=_payload->>'message',correction_requested_at=now(),updated_at=now() where id=_id; return _id;
 elsif _action='submit' then
   -- Retrying a successful submission never creates a duplicate assessment.
   if s.submitted_at is not null then return _id; end if;
   insert into public.clients(ragione_sociale,partita_iva,comune,referente,created_by)
   values(s.company,s.answers->>'partita_iva',coalesce(s.answers->>'sede_legale_comune',s.answers->>'comune_sede'),coalesce(s.answers->>'referente_nome',s.answers->>'gecoweb_referente_nome'),actor) returning id into new_client;
   insert into public.assessments(client_id,title,answers,created_by,status)
   values(new_client,(case when s.scheme='iperammortamento' then 'Iperammortamento 2026' else 'Voucher Lazio' end)||' · '||s.company,s.answers,actor,'da esaminare') returning id into new_assessment;
   update public.customer_submissions set client_id=new_client,assessment_id=new_assessment,state='submitted',submitted_at=now(),updated_at=now() where id=_id;
   return _id;
 end if;
 raise exception 'Operazione non valida';
end $$;
revoke all on function private.customer_submission_action(text,uuid,jsonb) from public,anon;
grant execute on function private.customer_submission_action(text,uuid,jsonb) to authenticated;
create function public.customer_submission_action(_action text,_id uuid default null,_payload jsonb default '{}')
returns uuid language sql security invoker set search_path='' as $$
 select private.customer_submission_action(_action,_id,_payload);
$$;
revoke all on function public.customer_submission_action(text,uuid,jsonb) from public,anon;
grant execute on function public.customer_submission_action(text,uuid,jsonb) to authenticated;

create or replace function public.can_access_client(_client_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.is_member(auth.uid()) and exists(
 select 1 from public.clients c where c.id=_client_id and
 (c.created_by=auth.uid() or public.has_role(auth.uid(),'admin') or exists(
 select 1 from public.customer_submissions s where s.client_id=c.id and s.submitted_at is not null)));
$$;
-- Keep the original ownership/admin rules for all pre-existing clients.
drop policy "clients select" on public.clients;
create policy "clients select" on public.clients for select to authenticated using(public.can_access_client(id));
drop policy "clients update" on public.clients;
create policy "clients update" on public.clients for update to authenticated using(public.can_access_client(id)) with check(public.can_access_client(id));
drop policy "clients delete" on public.clients;
create policy "clients delete" on public.clients for delete to authenticated using(public.can_access_client(id));
