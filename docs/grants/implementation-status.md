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

1. Workers Free was verified from the user’s billing screenshot on 2026-10-16 (active Free, no stored payment method). Current Cloudflare docs confirm 10,000 neurons/day; exceeding the Free allocation fails requests rather than charging overage. A real synthetic inference succeeded through the connector. The deployed staging app still has no AI binding or enable flag; do not mistake this API smoke test for deployed feature availability.
2. Long-document semantic review: multipass now retains all text up to 180,000 characters, bounded chunks, original pages, deterministic remapping/deduplication and explicit conflict flags. Grant uploads accept 200 pages per PDF (company documents keep 45); OCR stays limited to eight pages. Cross-document legal implications still need expert review. The model has not been benchmarked on the complete Lazio source package.
3. Run real model generation against all Lazio reference documents and compare rule/question coverage, calculations and independent edge cases with the existing audited engine. A matching citation alone does not establish that its interpretation is correct or complete.
4. Authenticated draft UI checks PASSED for real staging save/reload, revision conflicts and disabled AI gateway role enforcement. Actual publication, per-client saves/reloads and printable reports remain covered at separate UI/SQL layers, not yet by a single fully authenticated end-to-end test. No activated test fixtures are left in staging.
5. Re-evaluate schema, migrations and generated-bundle behavior before any production rollout. Do not enable model bindings by copying unreviewed examples or expose provider keys in VITE variables.

## Staging operation

Migration 20261016131853_configurable_grant_templates.sql is applied to vknvadzsjuixcuwegxto only. To show the development UI, build the app with VITE_ENABLE_GRANT_STUDIO=true and the staging Supabase public configuration. Admin → Gestione bandi opens the studio; Clienti → Altri bandi starts an assessment from an activated version. The generation endpoint fails closed with 503 while the model is disabled. The Supabase session travels in X-Nomotecnia-Session, preserving the staging gate’s Basic Authorization header. The runtime binding is read from Nitro's request.runtime.cloudflare.env, with the native fetch env as fallback.

supabase/tests/configurable_grants.sql executes entirely in a transaction ending in rollback. It must be run in staging only. It uses invented grant terms and temporary users, not real customers. Three-browser workflow test-grant-studio.yml needs no application credentials and cannot send data to a real model/backend.

Documentation consulted: https://developers.cloudflare.com/workers-ai/platform/pricing/ ; https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/ ; https://developers.cloudflare.com/workers-ai/features/json-mode/ ; https://supabase.com/docs/guides/api/securing-your-api .

The protected staging-rls environment allows only feature/document-intelligence-sandbox-20261015. Authenticated tests run from that existing authorized development branch after promotion of the tested prototype. No environment protection is relaxed and no secrets are copied to the new branch. PR #12 remains a draft against main.

## Verified workflow evidence

- 338 tests plus three-browser multipass studio checks: https://github.com/mauriziodeangelis2708/nomotecnia-app/actions/runs/38918772736 (all three engines passed).
- Main app checks/build: https://github.com/mauriziodeangelis2708/nomotecnia-app/actions/runs/38918772568 (passed).
- Actual authenticated grant draft lifecycle and full existing operational regression: https://github.com/mauriziodeangelis2708/nomotecnia-app/actions/runs/38919070078 (passed; fixture cleanup passed).
- Existing reader regression: Firefox exercised the 60-second bounded initializer fallback after worker network abort; its harness originally waited only 30 seconds. The harness now accepts either immediate recoverable initialization error or the documented 60-second deadline (75-second observation limit), then still requires a subsequent text PDF to work. No production OCR timeout was shortened or disabled.

## Real Workers AI smoke test — 2026-10-16

One synthetic request to @cf/meta/llama-3.3-70b-instruct-fp8-fast, JSON mode, temperature 0, max_tokens 3500, succeeded (HTTP 200). Usage: 899 input + 701 output tokens, 167.54278564453125 neurons. No customer data or real grant text was transmitted. The source and exact response are preserved in src/lib/grants/workers-ai-observed.test-support.json.

The provider returned response as a parsed object, not a string. The gateway now accepts either form and applies the SAME strict schema/reference/citation validation. A regression replays the observed output through the authenticated gateway and checks contribution ceiling, exclusion and incomplete answers. Malformed structured citations are still rejected.

Semantic finding: the model omitted SME status although the source explicitly restricts eligibility to SMEs, and returned unresolved=[] despite that omission. It also set the spending question minimum to the eligibility threshold. The result is NOT approved or publishable as an audited assessment. This demonstrates that valid JSON and exact citations do not prove requirement completeness. The full Lazio benchmark, independent coverage checks and deployed integrated AI test remain outstanding. Production and deployed staging model settings remain unchanged.

## Coverage safeguards and second live probe — 2026-10-16

Generation now explicitly separates atomic eligibility requirements (SME status versus location) and keeps input bounds separate from grant thresholds. An independent advisory AI review compares the generated fragment with its original excerpt. Its strict JSON findings require exact citations within that excerpt; malformed audits fail the entire request. Generation plus audit share the existing 90-second deadline. Every generated fragment now contains a mandatory human completeness issue, even when the audit returns no findings; the existing publication gate blocks unresolved issues.

Live evidence: the auditor returned findings=[] for the known incomplete first draft (914 input/7 output tokens; 25.80788803100586 neurons). This is a failed detection, not a passed audit. A new generation with explicit atomic-requirement instructions included SME, Lazio location, liquidation exclusion, >=14000 spending and 50% contribution capped at 10000 (982 input/821 output; 194.33282470703125 neurons). Both responses are preserved in coverage-observed.test-support.json. Deterministic replay verifies each exclusion, the 13999 boundary, 14000 -> 7000, 20000 -> 10000 and unanswered status. This small synthetic result does not certify full grants. Three live calls together used approximately 387.69 neurons. No paid plan, real customer data, production change or deployed AI activation.
