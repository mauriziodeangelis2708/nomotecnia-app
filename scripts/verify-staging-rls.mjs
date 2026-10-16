/**
 * Live E2E RLS checks against staging Supabase, using four separately authenticated
 * disposable accounts. No admin/service role credentials, no real customer data.
 *
 * Configure these four verified test accounts IN STAGING AUTH (not production)
 * before running the script. Their roles must already be:
 * admin, socio A, socio B, and unauthorised (no role).
 */
import { createClient } from "@supabase/supabase-js";

const expectedUrl = "https://vknvadzsjuixcuwegxto.supabase.co";
const url = process.env.STAGING_SUPABASE_URL;
const key = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
if (url !== expectedUrl) throw new Error("REFUSED: not staging Supabase");
if (!key?.startsWith("sb_publishable_")) throw new Error("Missing publishable-only staging key");
const accountNames = ["ADMIN", "MEMBER_A", "MEMBER_B", "OUTSIDER"];
const participants = {};

function assert(condition, message) {
  if (!condition) throw new Error("STAGING RLS TEST FAILED: " + message);
}

for (const name of accountNames) {
  const email = process.env[`STAGING_TEST_${name}_EMAIL`];
  const password = process.env[`STAGING_TEST_${name}_PASSWORD`];
  if (!email || !password) throw new Error("Missing staging test account: " + name);
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert(!error && data.user, name + " cannot sign in");
  participants[name] = { client, user: data.user };
}

const { ADMIN: admin, MEMBER_A: a, MEMBER_B: b, OUTSIDER: outsider } = participants;
for (const [participant, expectedRole] of [
  [admin, "admin"], [a, "socio"], [b, "socio"], [outsider, null],
]) {
  const { data, error } = await participant.client.from("user_roles")
    .select("role").eq("user_id", participant.user.id);
  assert(!error, "cannot read own role");
  const roles = (data ?? []).map((r) => r.role);
  assert(expectedRole ? roles.includes(expectedRole) : roles.length === 0, "roles not prepared");
}
console.log("PASS: all four independent staging logins and roles");

const cleanup = [];
try {
  const addClient = async (who, name) => {
    const { data, error } = await who.client.from("clients").insert({
      ragione_sociale: "TEST SINTETICO NOMOTECNIA " + name,
      partita_iva: "00000000000",
      created_by: who.user.id,
    }).select("id").single();
    assert(!error && data?.id, "cannot create " + name);
    cleanup.push(data.id);
    return data.id;
  };

  const clientA = await addClient(a, "SOCIETA A");
  const clientB = await addClient(b, "SOCIETA B");

  const { data: assessment, error: insertError } = await a.client
    .from("assessments")
    .insert({ client_id: clientA, title: "PDF sintetici", created_by: a.user.id })
    .select("id").single();
  assert(!insertError && assessment?.id, "cannot create own assessment");

  const visible = async (who, table, id) => {
    const { data, error } = await who.client.from(table).select("id").eq("id", id);
    assert(!error, "select " + table + " errored");
    return data?.length ?? 0;
  };
  assert(await visible(a, "clients", clientA) === 1, "member A cannot see own client");
  assert(await visible(b, "clients", clientA) === 0, "member B can see member A client");
  assert(await visible(outsider, "clients", clientA) === 0, "outsider sees client");
  assert(await visible(admin, "clients", clientA) === 1, "admin cannot see member A client");
  assert(await visible(admin, "clients", clientB) === 1, "admin cannot see member B client");
  assert(await visible(b, "assessments", assessment.id) === 0, "cross-member assessment access");
  assert(await visible(outsider, "assessments", assessment.id) === 0, "outsider assessment");
  assert(await visible(admin, "assessments", assessment.id) === 1, "admin cannot see member assessment");
  assert(await visible(b, "profiles", a.user.id) === 0, "member B can read member A profile");
  assert(await visible(outsider, "profiles", a.user.id) === 0, "outsider can read member A profile");
  assert(await visible(admin, "profiles", a.user.id) === 1, "admin cannot read profiles");
  console.log("PASS: cross-member, outsider, and admin SELECT isolation");

  const forbiddenOwner = await a.client.from("clients")
    .update({ created_by: b.user.id }).eq("id", clientA);
  assert(!!forbiddenOwner.error, "changing client owner was accepted");

  const forbiddenReparent = await a.client.from("assessments")
    .update({ client_id: clientB }).eq("id", assessment.id);
  assert(!!forbiddenReparent.error, "reparenting assessment was accepted");

  // A filtered PostgREST UPDATE/DELETE can succeed with zero rows if RLS
  // excludes the target. Always inspect returned IDs and re-check ownership.
  const illegalUpdate = await b.client.from("clients")
    .update({ ragione_sociale: "TEST SINTETICO VIOLAZIONE" })
    .eq("id", clientA).select("id");
  assert(
    !!illegalUpdate.error || illegalUpdate.data?.length === 0,
    "member B modified member A's company",
  );
  const illegalDelete = await b.client.from("clients")
    .delete().eq("id", clientA).select("id");
  assert(
    !!illegalDelete.error || illegalDelete.data?.length === 0,
    "member B deleted member A's company",
  );
  assert(await visible(a, "clients", clientA) === 1, "owner's client was corrupted/deleted");

  const illegalAssessmentInsert = await b.client.from("assessments")
    .insert({ client_id: clientA, created_by: b.user.id, title: "ACCESSO VIETATO" });
  assert(!!illegalAssessmentInsert.error, "member B created assessment under member A");

  const escalation = await outsider.client.from("user_roles")
    .insert({ user_id: outsider.user.id, role: "admin" });
  assert(!!escalation.error, "outsider privilege escalation was accepted");

  const outsiderInsert = await outsider.client.from("clients")
    .insert({ ragione_sociale: "TEST SINTETICO NON AUTORIZZATO", created_by: outsider.user.id });
  assert(!!outsiderInsert.error, "outsider client creation was accepted");
  console.log("PASS: ownership, reparenting, privilege escalation and outsider writes denied");

  const { error: updateError } = await a.client.from("assessments")
    .update({ title: "PDF sintetici - aggiornato", answers: { ateco_codice: "62.10.00" } })
    .eq("id", assessment.id);
  assert(!updateError, "own assessment updates were rejected");
  const { data: updated } = await a.client.from("assessments")
    .select("title,answers").eq("id", assessment.id).single();
  assert(updated?.answers?.ateco_codice === "62.10.00", "assessment save/reload mismatch");
  console.log("PASS: own assessment write and reload");

  const { data: note, error: noteError } = await a.client.from("assessment_notes")
    .insert({ assessment_id: assessment.id, author_id: a.user.id, body: "Nota sintetica" })
    .select("id").single();
  assert(!noteError && note?.id, "member A cannot add own assessment note");

  const { data: evidence, error: evidenceError } = await a.client.from("evidences")
    .insert({ assessment_id: assessment.id, author_id: a.user.id, title: "PDF fittizio" })
    .select("id").single();
  assert(!evidenceError && evidence?.id, "member A cannot create own evidence");

  const { data: snapshot, error: snapshotError } = await a.client.from("assessment_snapshots")
    .insert({
      assessment_id: assessment.id,
      author_id: a.user.id,
      answers: { ateco_codice: "62.10.00" },
      result: {},
    }).select("id").single();
  assert(!snapshotError && snapshot?.id, "member A cannot create snapshot");

  for (const [table, id] of [
    ["assessment_notes", note.id],
    ["evidences", evidence.id],
    ["assessment_snapshots", snapshot.id],
  ]) {
    assert(await visible(b, table, id) === 0, "member B read another member's " + table);
    assert(await visible(outsider, table, id) === 0, "outsider read " + table);
    assert(await visible(admin, table, id) === 1, "admin cannot read " + table);
  }
  const unauthorizedNote = await b.client.from("assessment_notes")
    .insert({ assessment_id: assessment.id, author_id: b.user.id, body: "Intrusione" });
  assert(!!unauthorizedNote.error, "member B wrote to another member's assessment");
  console.log("PASS: cross-account notes, evidence and snapshots isolation");
} finally {
  for (const id of cleanup) {
    const { error } = await admin.client.from("clients").delete().eq("id", id);
    if (error) {
      console.error("Cleanup required for a staging-only fixture");
      process.exitCode = 1;
    }
  }
  for (const person of Object.values(participants)) {
    await person.client.auth.signOut();
  }
}
