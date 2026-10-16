/** Read-only published staging preflight. No credentials or synthetic data needed. */
import assert from "node:assert/strict";
const base = "https://nomotecnia-full-staging.maurizio-deangelis2708.workers.dev";
for (const path of ["/", "/auth", "/favicon.svg"]) {
  const response = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(20000) });
  console.log(JSON.stringify({path,status:response.status,ray:response.headers.get("cf-ray"),
    authentication:response.headers.get("www-authenticate"),cache:response.headers.get("cache-control")}));
  assert.equal(response.status,401,"Published staging must present its authentication gate; stop on any edge denial");
  assert.match(response.headers.get("www-authenticate")??"",/^Basic realm=/);
  assert.match(response.headers.get("cache-control")??"",/no-store/);
  assert.match(response.headers.get("x-robots-tag")??"",/noindex/);
  assert.equal(response.headers.get("x-frame-options"),"DENY");
  await response.body?.cancel();
}
console.log("PASS: published staging is reachable and rejects unauthenticated HTML and assets");
