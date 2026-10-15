# NomotecnIA – Supabase staging security and integration checkpoint

**15 ottobre 2026 — staging only; production unchanged.**

## Environment confirmed

- Supabase project: `nomotecnia-staging`.
- Project ref: `vknvadzsjuixcuwegxto`, region `eu-west-1`.
- Staging URL: `https://vknvadzsjuixcuwegxto.supabase.co`.
- Production ref: `bdwqobvkeposjvuddjav` — forbidden in staging bundles, env vars and cloud deployments.
- Supabase creation cost confirmed as $0/month (within Free plan limits).
- Eight public tables: `clients`, `assessments`, `profiles`, `user_roles`, `rules`, `evidences`, `assessment_notes`, `assessment_snapshots`.
- All eight tables empty at checkpoint; RLS enabled.
- Migrations actually applied to staging:
  `staging_base_deny_by_default`, `staging_management_schema_and_rls`, `staging_private_rls_permission_helpers`.
- After the last migration Supabase Security Advisors returned **no lints**.

## Security hardening actually applied

The four earlier advisor warnings concerned publicly exposed `SECURITY DEFINER`
functions. The actual permission checks now reside in `private.staging_*`
functions; the same public function signatures remain compatible with the app,
but are `SECURITY INVOKER`. The role helpers also require
`_user_id = auth.uid()` instead of permitting a caller to inspect arbitrary
identities.

**A clean security advisor result is not a passing penetration or RLS user test.**
Do not treat this as production security approval.

## Critical steps before any browser test against staging database

1. Create disposable, confirmed **staging-only** auth accounts for one admin,
   two members and one non-member; never reuse customer credentials.
2. Bootstrap the staging admin role explicitly through a trusted operator
   from Supabase dashboard, not from the client or an anonymous SQL endpoint.
   No such staging user has been created by this work.
3. Verify RLS for each authenticated identity through the browser/API, including:
   anonymous denial; non-member denial; member own-client CRUD; member denial
   on other member's clients; admin access; authorization for notes, evidence,
   snapshots and rules; prohibited role grant by non-admin; forbidden changing
   `created_by` / `client_id` to steal another owner's record.
4. Add the missing customer-portal structures **only when needed** for the
   customer flow; the existing migration depends on pre-existing tables and
   functions. Never run its DDL blindly against an incomplete schema.
5. Deploy a **separate Cloudflare staging application**, with build-time
   `VITE_SUPABASE_URL=https://vknvadzsjuixcuwegxto.supabase.co` and only
   its corresponding **staging publishable key**. Never use service-role
   credentials in client JavaScript. Block any fallback to production and
   fail the build when staging URL/ID is missing or does not match.
6. Staging Worker name must be distinct from `nomotecnia-app`; do not attach
   production routes/domains, D1/KV/R2 bindings, or production authentication
   provider credentials. Keep deployment opt-in.
7. Test PDF upload locally in browser with **fictitious PDFs only**;
   verify extraction, source matching, confirmation, save to `assessments`,
   reload and separation from production. Then run cross-account denial tests.
8. Review OAuth redirect allowlist for the staging origin before enabling
   Google sign-in; password auth is sufficient for initial synthetic tests.

## Deployment status

The standalone Cloudflare synthetic PDF lab from
`docs/cloudflare-pdf-staging.md` uses browser storage and **is not wired**
to Supabase. The true NomotecnIA full-app staging with persistent Supabase
storage has **not** been deployed or verified end-to-end.
Do not claim otherwise.

Project secrets, login passwords, or API keys must not be added to the
GitHub repository, the documentation, or conversations.
