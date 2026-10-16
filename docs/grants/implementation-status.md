# Configurable grant studio — development checkpoint, 16 October 2026

This is an unfinished development feature, not a production release or a replacement for the audited Lazio assessment. Production remains on merge 699b0fa077503b13f95eba62d0547003c3491b2e.

## Implemented

- Data-only, versioned definitions for questions, conditional visibility, eligibility/exclusion, documentary requirements, score and grant expressions. No eval, executable templates, provider tools, or raw HTML rendering.
- Strict schema validation, bounded nesting/size, reference/type checks, conservative unknown answers and numerical-error handling. Hidden stale answers are excluded. All requirements need exact, normalized page quotations that exist in the supplied source.
- Admin studio for local PDF extraction/OCR, explicit text submission to a generation endpoint, draft review, per-page and per-item confirmation, independent expected test scenarios, questionnaire/result preview, save and publication.
- Immutable activated versions; creation of a new version resets review. Assessment and report reference the activated version UUID. Database trigger prevents subsequent version changes, including through another editor.
- Staging-only grant_templates migration, admin-only writes, member access to activated versions, no customer/anonymous access. Existing assessment/client RLS remains in force.
- Same-origin generation gateway authenticates the user against Supabase Auth and queries actual admin roles. It accepts structured model output only, restores caller-supplied source/identity metadata, rejects hallucinated citations, and never publishes the output.
- Feature flag VITE_ENABLE_GRANT_STUDIO is off by default. Model calls require both an AI binding and server BANDO_GENERATOR_ENABLED=true. Neither has been enabled in production or staging.

## Verified so far

- 338 unit/component tests, including 53 new tests; TypeScript passes.
- 14 real staging SQL checks, transactionally rolled back: draft visibility, admin publication, immutable activated version, member assessment creation, immutable assessment version, outsider and anonymous denial. No synthetic rows persist.
- Staging security advisors remain empty after the migration.
- Main production-mode build succeeds. Browser CI uses real PDF.js and the real UI with a clearly labeled simulated model and isolated persistence; it does not certify real AI quality or production database integration.

## Release blockers — do not merge/deploy as a finished automatic generator

1. Real model connection and billing safeguards. Cloudflare subscriptions read returned authentication error; account settings reveal standard usage but do not prove a free account. No inference has been invoked and no paid service has been enabled. Workers AI offers a free allocation but paid accounts can incur overage; verify the account and enforce a reliable budget/rate cap before setting the enable flag.
2. Long-document semantic review: multipass now retains all text up to 180,000 characters, bounded chunks, original pages, deterministic remapping/deduplication and explicit conflict flags. Grant uploads accept 200 pages per PDF (company documents keep 45); OCR stays limited to eight pages. Cross-document legal implications still need expert review. The model has not been benchmarked on the complete Lazio source package.
3. Run real model generation against all Lazio reference documents and compare rule/question coverage, calculations and independent edge cases with the existing audited engine. A matching citation alone does not establish that its interpretation is correct or complete.
4. Authenticated draft UI checks are prepared for real staging save/reload, revision conflicts and disabled AI gateway role enforcement. Actual publication, per-client saves/reloads and printable reports remain covered at separate UI/SQL layers, not yet by a single fully authenticated end-to-end test. No activated test fixtures are left in staging.
5. Re-evaluate schema, migrations and generated-bundle behavior before any production rollout. Do not enable model bindings by copying unreviewed examples or expose provider keys in VITE variables.

## Staging operation

Migration 20261016131853_configurable_grant_templates.sql is applied to vknvadzsjuixcuwegxto only. To show the development UI, build the app with VITE_ENABLE_GRANT_STUDIO=true and the staging Supabase public configuration. Admin → Gestione bandi opens the studio; Clienti → Altri bandi starts an assessment from an activated version. The generation endpoint fails closed with 503 while the model is disabled. The Supabase session travels in X-Nomotecnia-Session, preserving the staging gate’s Basic Authorization header. The runtime binding is read from Nitro's request.runtime.cloudflare.env, with the native fetch env as fallback.

supabase/tests/configurable_grants.sql executes entirely in a transaction ending in rollback. It must be run in staging only. It uses invented grant terms and temporary users, not real customers. Three-browser workflow test-grant-studio.yml needs no application credentials and cannot send data to a real model/backend.

Documentation consulted: https://developers.cloudflare.com/workers-ai/platform/pricing/ ; https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/ ; https://developers.cloudflare.com/workers-ai/features/json-mode/ ; https://supabase.com/docs/guides/api/securing-your-api .
