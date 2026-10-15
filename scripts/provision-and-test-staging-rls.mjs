/**
 * NomotecnIA: disposable end-to-end RLS identities in the FREE STAGING project.
 *
 * Requires an explicit manual GitHub run and a staging-only sb_secret_ key.
 * NEVER uses or connects to production. Creates 4 test Auth users through
 * the official Supabase Admin API and deletes them in a finally block.
 * Auth sessions exercise the actual authenticated RLS policies.
 */
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const URL = "https://vknvadzsjuixcuwegxto.supabase.co";
const given = process.env.STAGING_SUPABASE_URL;
const secret = process.env.STAGING_SUPABASE_SECRET_KEY;
const publicKey = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
const authOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

if (given !== URL) throw new Error("DENIED: Supabase URL is not isolated NomotecnIA staging");
if (!secret?.startsWith("sb_secret_") || secret.length < 30) {
  throw new Error("DENIED: a staging-only sb_secret_ key is required for temporary Auth users");
}
if (!publicKey?.startsWith("sb_publishable_") || publicKey.length < 30) {
  throw new Error("DENIED: staging publishable key is required for independent user sessions");
}
if (secret === publicKey) throw new Error("DENIED: incorrect API key separation");

const admin = createClient(URL, secret, authOptions);
const nonce = randomBytes(8).toString("hex");
const fixture = [
  ["ADMIN", "admin"],
  ["MEMBER_A", "socio"],
  ["MEMBER_B", "socio"],
  ["OUTSIDER", null],
];
const accounts = [];

function refuse(error, description) {
  if (error) throw new Error(description + " (details intentionally omitted)");
}

async function run() {
  try {
    for (const [name, role] of fixture) {
      const email = "nomotecnia-staging-" + nonce + "-" + name.toLowerCase() + "@example.com";
      const password = randomBytes(24).toString("base64url") + "_Test";
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { purpose: "nomotecnia_staging_synthetic_rls_test" },
      });
      refuse(error, "Cannot create disposable staging Auth user " + name);
      if (!data?.user?.id) throw new Error("Supabase Auth did not return a test identity");
      accounts.push({ name, role, id: data.user.id, email, password });
      if (role) {
        const { error: roleError } = await admin
          .from("user_roles")
          .insert({ user_id: data.user.id, role });
        refuse(roleError, "Cannot provision test role " + name);
      }
    }
    console.log("Created four disposable staging-only Auth identities.");

    // Pass only the public API key and temporary account passwords to the child.
    // The privileged staging secret is NEVER passed to the RLS test process.
    const env = {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      STAGING_SUPABASE_URL: URL,
      STAGING_SUPABASE_PUBLISHABLE_KEY: publicKey,
    };
    for (const account of accounts) {
      env["STAGING_TEST_" + account.name + "_EMAIL"] = account.email;
      env["STAGING_TEST_" + account.name + "_PASSWORD"] = account.password;
    }

    const execution = spawnSync(process.execPath, ["scripts/verify-staging-rls.mjs"], {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      timeout: 120000,
    });
    if (execution.error || execution.status !== 0) {
      throw new Error("Live multi-account RLS checks failed. See PASS/FAILED output.");
    }
    console.log("PASS: live staging RLS checks across all four independent Auth sessions.");
  } finally {
    let failures = 0;
    for (const account of [...accounts].reverse()) {
      const { error } = await admin.auth.admin.deleteUser(account.id);
      if (error) failures++;
    }
    if (failures) {
      console.error("WARNING: some staging-only Auth test users need manual cleanup: " + failures);
      process.exitCode = 1;
    } else {
      console.log("Disposable staging Auth test accounts removed.");
    }
  }
}

try {
  await run();
} catch (e) {
  console.error(e instanceof Error ? e.message : "Unexpected staging RLS test error");
  process.exitCode = 1;
}
