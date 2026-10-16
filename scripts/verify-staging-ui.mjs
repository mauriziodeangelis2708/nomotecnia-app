/**
 * Disposable UI smoke test: LOCAL Cloudflare runtime + isolated Supabase staging.
 * Does not access the deployed workers.dev site or change its security controls.
 * Never records passwords, sessions or privileged keys in test artifacts.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFile, rm, mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "/tmp/nomotecnia-ui/node_modules/playwright/index.mjs";

const URL = "https://vknvadzsjuixcuwegxto.supabase.co";
const base = "http://127.0.0.1:8787";
assert.equal(process.env.STAGING_SUPABASE_URL, URL, "Staging URL required");
const secret = process.env.STAGING_SUPABASE_SECRET_KEY;
const key = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
assert.ok(secret?.startsWith("sb_secret_") && key?.startsWith("sb_publishable_"),
  "Separate staging API keys required");
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(URL, secret, options);
const nonce = randomBytes(8).toString("hex");
const gate = randomBytes(32).toString("base64url");
const accounts = [];
const contexts = [];
let browser, server;
let stage = "initialization";
const blocked = [];
const consoleErrors = [];
function pass(message) { console.log("PASS: " + message); }
function must(result, description) {
  if (result.error) throw new Error(description);
  return result.data;
}
async function until(fn, description) {
  for (let i=0;i<240;i++) {
    if (await fn()) return;
    await new Promise(r=>setTimeout(r,250));
  }
  throw new Error(description);
}
try {
  stage = "local Cloudflare runtime";
  await writeFile(".output/server/.dev.vars", "STAGING_ACCESS_PASSWORD=" + gate + "\n", {mode:0o600});
  const safeEnv = Object.fromEntries(["PATH","HOME","CI"].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
  server = spawn("npx", ["--yes","wrangler@4","dev","--local","--ip","127.0.0.1","--port","8787",
    "--config",".output/server/wrangler.staging.json"], {env:safeEnv,stdio:["ignore","ignore","ignore"]});
  server.on("error",()=>{});
  await until(async()=>{try{return (await fetch(base)).status===401;}catch{return false;}}, "Local server did not start");
  assert.equal((await fetch(base,{headers:{Authorization:"Basic "+Buffer.from("nomotecnia:wrong").toString("base64")}})).status,401);
  pass("local staging gate denies anonymous and wrong-password requests");
  stage = "disposable staging identities";
  for (const [name,role] of [["ADMIN","admin"],["MEMBER_A","socio"],["MEMBER_B","socio"],["OUTSIDER",null]]) {
    const email = "nomotecnia-staging-ui-"+nonce+"-"+name.toLowerCase()+"@example.com";
    const password = randomBytes(24).toString("base64url")+"_Test";
    const data = must(await admin.auth.admin.createUser({email,password,email_confirm:true,
      user_metadata:{purpose:"nomotecnia_staging_synthetic_ui_test",access_requested:"socio"}}), "Create test identity");
    const account={name,role,id:data.user.id,email,password};
    accounts.push(account);
    if(role) must(await admin.from("user_roles").insert({user_id:account.id,role}), "Provision test role");
  }
  browser = await chromium.launch({headless:true,env:safeEnv});
  for(const account of accounts) {
    stage = "UI login "+account.name;
    const context=await browser.newContext({httpCredentials:{username:"nomotecnia",password:gate},
      viewport:{width:1365,height:900}});
    contexts.push(context);
    account.context=context;
    account.page=await context.newPage();
    await context.route("**/*",async route=>{
      const u=new globalThis.URL(route.request().url());
      if(["data:","blob:"].includes(u.protocol) || u.origin===base || u.origin===URL) return route.continue();
      blocked.push(u.hostname);
      return route.abort();
    });
    account.page.on("pageerror",error=>consoleErrors.push(error.name));
    await account.page.goto(base+"/auth");
    await account.page.getByLabel("Email",{exact:true}).fill(account.email);
    await account.page.getByLabel("Password",{exact:true}).fill(account.password);
    await account.page.getByRole("button",{name:"Accedi",exact:true}).click();
    if(account.role) await account.page.getByRole("heading",{name:"Clienti",exact:true}).waitFor();
    else await account.page.getByRole("heading",{name:"Accesso in attesa di autorizzazione",exact:true}).waitFor();
    pass("independent browser login "+account.name);
  }
  const [root,a,b,outsider]=accounts;
  for (const account of [a,b]) {
    stage="UI client create "+account.name;
    account.clientName="IMPRESA SINTETICA UI "+nonce+" "+account.name;
    await account.page.getByRole("button",{name:"Nuovo cliente",exact:true}).click();
    const dialog=account.page.getByRole("dialog");
    await dialog.getByRole("textbox").nth(0).fill(account.clientName);
    await dialog.getByRole("button",{name:"Salva",exact:true}).click();
    await account.page.getByRole("heading",{name:account.clientName,exact:true}).waitFor();
    pass("client created through UI "+account.name);
  }
  stage="UI dashboard isolation";
  await a.page.reload();
  await a.page.getByRole("heading",{name:a.clientName,exact:true}).waitFor();
  assert.equal(await a.page.getByRole("heading",{name:b.clientName,exact:true}).count(),0);
  await b.page.reload();
  await b.page.getByRole("heading",{name:b.clientName,exact:true}).waitFor();
  assert.equal(await b.page.getByRole("heading",{name:a.clientName,exact:true}).count(),0);
  await root.page.reload();
  await root.page.getByRole("heading",{name:a.clientName,exact:true}).waitFor();
  await root.page.getByRole("heading",{name:b.clientName,exact:true}).waitFor();
  assert.equal(await outsider.page.getByRole("button",{name:"Nuovo cliente",exact:true}).count(),0);
  pass("member isolation, admin visibility and outsider denial in UI");

  stage="UI assessment create and persistence";
  await a.page.getByRole("button",{name:"Voucher Lazio",exact:true}).click();
  await a.page.getByRole("tab",{name:"Questionario",exact:true}).waitFor();
  const title="COLLAUDO UI "+nonce;
  // The only text input in the assessment page header is its title.
  const titleInput=a.page.locator("main .no-print input").first();
  await titleInput.fill(title);
  await a.page.getByRole("button",{name:"Salva",exact:true}).click();
  await a.page.waitForURL(/\/assessment\/(?!new-)[0-9a-f-]+$/);
  await a.page.getByRole("button",{name:"Salvato",exact:true}).waitFor();
  const assessmentURL=a.page.url();
  const assessmentId=assessmentURL.split("/").pop();
  await a.page.reload();
  await a.page.getByRole("tab",{name:"Questionario",exact:true}).waitFor();
  await until(async()=>await titleInput.inputValue()===title,"Title not restored after reload");
  const own = createClient(URL,key,options);
  must(await own.auth.signInWithPassword({email:a.email,password:a.password}),"Owner API login");
  const saved=must(await own.from("assessments").select("id,title,answers,created_by").eq("id",assessmentId).single(),"Read saved assessment");
  assert.equal(saved.title,title);
  assert.equal(saved.created_by,a.id);
  assert.equal(saved.answers.ragione_sociale,a.clientName);
  pass("assessment created through UI and reloaded from staging database");
  stage="UI cross-account assessment isolation";
  await b.page.goto(assessmentURL);
  await b.page.getByText("Caricamento", {exact:false}).waitFor({state:"hidden"}).catch(()=>{});
  await until(async()=>!(await b.page.locator("main").innerText()).includes("Caricamento"),"Cross-account load did not finish");
  assert.equal(await b.page.locator("main input").evaluateAll((inputs,value)=>inputs.some(input=>input.value===value),title),false);
  assert.equal((await b.page.locator("main").innerText()).includes(a.clientName),false);
  const other=createClient(URL,key,options);
  must(await other.auth.signInWithPassword({email:b.email,password:b.password}),"Other member API login");
  const hidden=must(await other.from("assessments").select("id").eq("id",assessmentId),"Other member SELECT");
  assert.equal(hidden.length,0);
  pass("direct cross-member assessment URL does not expose owner data");
  await own.auth.signOut();
  await other.auth.signOut();
  stage="network and browser checks";
  assert.deepEqual(blocked,[],"Unexpected external origin requested");
  assert.deepEqual(consoleErrors,[],"Browser uncaught errors");
  pass("browser requests confined to localhost and staging Supabase");
  await mkdir("ui-test-results",{recursive:true});
  await a.page.screenshot({path:"ui-test-results/assessment-synthetic.png",fullPage:true});
  pass("local browser UI smoke completed; published edge-site UI remains separate");
} catch(error) {
  let message=String(error?.message??"Unknown error");
  for(const value of [secret,gate,...accounts.map(a=>a.password)]) if(value) message=message.replaceAll(value,"[REDACTED]");
  console.error("FAILED at: "+stage+" ("+(error?.name??"Error")+") "+message.slice(0,1500));
  process.exitCode=1;
} finally {
  await browser?.close().catch(()=>{});
  server?.kill("SIGTERM");
  await rm(".output/server/.dev.vars",{force:true});
  let cleanupFailed=false;
  const ids=accounts.map(a=>a.id);
  if(ids.length) {
    const deleted=await admin.from("clients").delete().in("created_by",ids);
    if(deleted.error) cleanupFailed=true;
  }
  for(const account of [...accounts].reverse()) {
    const result=await admin.auth.admin.deleteUser(account.id);
    if(result.error) cleanupFailed=true;
  }
  if(ids.length) {
    for(const table of ["clients","assessments"]) {
      const remaining=await admin.from(table).select("id",{count:"exact",head:true}).in("created_by",ids);
      if(remaining.error || remaining.count!==0) cleanupFailed=true;
    }
  }
  if(cleanupFailed) {console.error("FAILED: disposable staging fixture cleanup");process.exitCode=1;}
  else pass("disposable UI identities and owned clients/assessments removed");
}
