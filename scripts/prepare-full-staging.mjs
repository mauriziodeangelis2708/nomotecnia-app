/**
 * GitHub CI guard: emit a DIFFERENT Worker config for the full app staging.
 * Never deploy with the default production wrangler config.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

const stagingRef = "vknvadzsjuixcuwegxto";
const stagingURL = "https://" + stagingRef + ".supabase.co";
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (process.env.VITE_NOMOTECNIA_STAGING !== "true") {
  throw new Error("STAGING MODE MUST BE EXPLICITLY ENABLED");
}
if (process.env.VITE_ENABLE_DOCUMENT_PDF_LAB !== "true") {
  throw new Error("PDF document lab must be enabled for the synthetic test build");
}
if (url !== stagingURL) {
  throw new Error("Wrong Supabase URL. Refusing to build/deploy against production.");
}
if (typeof key !== "string" || !key.startsWith("sb_publishable_") || key.length < 26) {
  throw new Error("Missing staging PUBLIC/publishable API key. Never use service-role keys.");
}

const buildDir = resolve(".output/server");
const manifestPath = join(buildDir, "wrangler.json");
if (!existsSync(manifestPath)) throw new Error("Nitro Cloudflare manifest is missing");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (typeof manifest.main !== "string" || !manifest.main.length) {
  throw new Error("Nitro Cloudflare entrypoint is missing");
}
if (!existsSync(resolve(buildDir, manifest.main))) {
  throw new Error("Nitro Cloudflare entrypoint not found: " + manifest.main);
}
if (manifest.assets?.directory && !existsSync(resolve(buildDir, manifest.assets.directory))) {
  throw new Error("Nitro output asset directory does not exist");
}
if (!manifest.assets?.directory) {
  throw new Error("Nitro asset config not detected; manual Cloudflare verification required");
}

// Fail closed on existing bindings or production routes; never copy them to staging.
for (const property of [
  "routes", "route", "kv_namespaces", "d1_databases", "r2_buckets",
  "services", "queues", "dispatch_namespaces", "durable_objects",
  "unsafe", "env", "vars",
]) {
  if (manifest[property] !== undefined) {
    throw new Error("Unexpected Cloudflare binding/config: " + property);
  }
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(file);
    } else if (/\.(?:js|mjs|html|json)$/.test(entry.name) && statSync(file).size < 3_000_000) {
      const body = readFileSync(file, "utf8");
      if (body.includes("bdwqobvkeposjvuddjav") ||
          body.includes("nomotecnia-app.maurizio-deangelis2708")) {
        throw new Error("Production identifier present in staging output");
      }
    }
  }
}
walk(resolve(".output/public"));
walk(buildDir);

manifest.name = "nomotecnia-full-staging";
manifest.workers_dev = true;
manifest.assets.run_worker_first = true;
const output = join(buildDir, "wrangler.staging.json");
writeFileSync(output, JSON.stringify(manifest, null, 2) + "\n");
console.log("Verified separate staging Cloudflare manifest: " + output);
