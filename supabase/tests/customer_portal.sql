-- Run in a transaction with ROLLBACK. All identities and records are synthetic.
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('11111111-1111-4111-8111-111111111111','portal-a@example.invalid',now(),false),
('22222222-2222-4222-8222-222222222222','portal-b@example.invalid',now(),false),
('33333333-3333-4333-8333-333333333333','portal-socio@example.invalid',now(),false),
('44444444-4444-4444-8444-444444444444','portal-unconfirmed@example.invalid',null,false);
insert into public.user_roles(user_id,role) values('33333333-3333-4333-8333-333333333333','socio');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select set_config('test.intake',public.customer_submission_action('save',null,'{"scheme":"iperammortamento","company":"TEST PORTAL A","answers":{"costo_ammissibile":80000,"partita_iva":"00000000011"}}')::text,true);
do $$ begin
 if (select count(*) from public.customer_submissions)<>1 then raise exception 'Own draft missing'; end if;
 if exists(select 1 from public.assessments) or exists(select 1 from public.clients) or exists(select 1 from public.rules) or exists(select 1 from public.evidences) or exists(select 1 from public.assessment_notes) or exists(select 1 from public.assessment_snapshots) then raise exception 'Customer can read staff data'; end if;
 begin
  update public.customer_submissions set state='completed'; raise exception 'Direct write allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.customer_submissions) then raise exception 'Cross customer leak'; end if;
 begin
  perform public.customer_submission_action('submit',current_setting('test.intake')::uuid); raise exception 'Cross customer submission allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
do $$ begin
 begin
  perform public.customer_submission_action('save',null,'{"scheme":"lazio","company":"TEST","answers":{}}'); raise exception 'Unconfirmed allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select public.customer_submission_action('submit',current_setting('test.intake')::uuid);
select public.customer_submission_action('submit',current_setting('test.intake')::uuid);
do $$ begin
 if exists(select 1 from public.assessments) or exists(select 1 from public.clients) then raise exception 'Customer can read imported assessment'; end if;
 begin
  perform public.customer_submission_action('save',current_setting('test.intake')::uuid,'{"scheme":"iperammortamento","company":"CHANGED","answers":{}}'); raise exception 'Original mutable';
 exception when insufficient_privilege then null; end;
 begin
  perform public.customer_submission_action('status',current_setting('test.intake')::uuid,'{"state":"completed"}'); raise exception 'Client can change staff status';
 exception when insufficient_privilege then null; end;
end $$;
select public.customer_submission_action('correction',current_setting('test.intake')::uuid,'{"message":"TEST correzione"}');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ declare aid uuid; begin
 if (select count(*) from public.customer_submissions)<>1 then raise exception 'Staff inbox missing'; end if;
 select assessment_id into aid from public.customer_submissions where id=current_setting('test.intake')::uuid;
 if not exists(select 1 from public.assessments where id=aid and answers->>'costo_ammissibile'='80000') then raise exception 'Staff assessment missing'; end if;
 update public.assessments set answers=answers||'{"costo_ammissibile":90000}'::jsonb where id=aid;
 if not found then raise exception 'Staff edit failed'; end if;
 insert into public.assessment_notes(assessment_id,body) values(aid,'TEST internal note');
 insert into public.evidences(assessment_id,title) values(aid,'TEST document');
 insert into public.assessment_snapshots(assessment_id,answers,result) values(aid,'{}','{}');
 if (select answers->>'costo_ammissibile' from public.customer_submissions where id=current_setting('test.intake')::uuid)<>'80000' then raise exception 'Original changed'; end if;
end $$;
select public.customer_submission_action('status',current_setting('test.intake')::uuid,'{"state":"completed"}');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if (select state from public.customer_submissions where id=current_setting('test.intake')::uuid)<>'completed' then raise exception 'Status missing'; end if;
 if exists(select 1 from public.assessment_notes) then raise exception 'Internal notes leaked'; end if;
end $$;
select set_config('test.draft',public.customer_submission_action('save',null,'{"scheme":"lazio","company":"TEST DELETE","answers":{}}')::text,true);
select public.customer_submission_action('delete',current_setting('test.draft')::uuid);
do $$ begin
 if exists(select 1 from public.customer_submissions where id=current_setting('test.draft')::uuid) then raise exception 'Draft not deleted'; end if;
end $$;
reset role;
select 'customer portal isolation and lifecycle checks passed' result;
