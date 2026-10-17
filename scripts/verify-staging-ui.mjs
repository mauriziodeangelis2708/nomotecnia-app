/**
 * Disposable UI smoke test: local runtime or the exact published STAGING site.
 * Public mode uses its existing Basic authentication; security controls stay enabled.
 * Never records passwords, sessions or privileged keys in test artifacts.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "/tmp/nomotecnia-ui/node_modules/playwright/index.mjs";

const localDocumentMode = process.env.STAGING_DOCUMENT_MODE === "local";
const documentHeading = localDocumentMode ? "Leggi PDF e compila la pratica" : "Document Intelligence — laboratorio riservato";
const URL = "https://vknvadzsjuixcuwegxto.supabase.co";
const publicMode = process.env.STAGING_UI_TARGET === "published";
assert.ok(!process.env.STAGING_UI_TARGET || publicMode, "Unknown UI target");
const base = publicMode
  ? "https://nomotecnia-full-staging.maurizio-deangelis2708.workers.dev"
  : "http://127.0.0.1:8787";
assert.equal(process.env.STAGING_SUPABASE_URL, URL, "Staging URL required");
const secret = process.env.STAGING_SUPABASE_SECRET_KEY;
const key = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
assert.ok(secret?.startsWith("sb_secret_") && key?.startsWith("sb_publishable_"),
  "Separate staging API keys required");
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(URL, secret, options);
const nonce = randomBytes(8).toString("hex");
const gate = publicMode ? process.env.STAGING_ACCESS_PASSWORD : randomBytes(32).toString("base64url");
assert.ok(gate?.length >= 18, "Protected environment secret STAGING_ACCESS_PASSWORD is required for published UI tests");
const accounts = [];
const contexts = [];
let browser, server;
let serverLog = "";
let stage = "initialization";
const blocked = [];
const consoleErrors = [];
const networkFailures = [];
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

function syntheticPdf(lines) {
  const escape=value=>value.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
  const stream="BT /F1 11 Tf 38 798 Td "+lines.map((line,i)=>(i?"0 -20 Td ":"")+"("+escape(line)+") Tj").join(" ")+" ET";
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    "<< /Length "+stream.length+" >>\nstream\n"+stream+"\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf="%PDF-1.4\n";const offsets=[0];
  objects.forEach((object,i)=>{offsets.push(pdf.length);pdf+=(i+1)+" 0 obj\n"+object+"\nendobj\n";});
  const xref=pdf.length;
  pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
  for(const offset of offsets.slice(1)) pdf+=String(offset).padStart(10,"0")+" 00000 n \n";
  pdf+="trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF";
  return Buffer.from(pdf,"ascii");
}

try {
  const safeEnv = Object.fromEntries(["PATH","HOME","CI"].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
  stage = publicMode ? "published staging gate" : "local Cloudflare runtime";
  if (!publicMode) {
  await writeFile(".output/server/.dev.vars", "STAGING_ACCESS_PASSWORD=" + gate + "\n", {mode:0o600});
  server = spawn("/tmp/nomotecnia-ui/node_modules/.bin/wrangler", ["dev","--local","--ip","127.0.0.1","--port","8787",
    "--config",".output/server/wrangler.staging.json"], {env:safeEnv,stdio:["ignore","pipe","pipe"]});
  server.on("error",e=>{serverLog+=e.message;});
  for(const stream of [server.stdout,server.stderr]) stream.on("data",chunk=>{serverLog=(serverLog+chunk.toString()).slice(-6000);});
  await until(async()=>{try{return (await fetch(base)).status===401;}catch{return false;}}, "Local server did not start");
  }
  assert.equal((await fetch(base,{signal:AbortSignal.timeout(20000)})).status,401,"Staging gate must deny anonymous traffic");
  assert.equal((await fetch(base,{signal:AbortSignal.timeout(20000),headers:{Authorization:"Basic "+Buffer.from("nomotecnia:wrong").toString("base64")}})).status,401);
  assert.equal((await fetch(base+"/favicon.svg",{signal:AbortSignal.timeout(20000)})).status,401);
  pass((publicMode ? "published" : "local")+" staging gate denies anonymous, wrong-password and static-asset requests");
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
    const context=await browser.newContext({httpCredentials:{origin:base,username:"nomotecnia",password:gate},
      viewport:{width:1365,height:900}});
    contexts.push(context);
    context.on("response",response=>{
      if(response.status()<400) return;
      try { const url=new globalThis.URL(response.url()); if([base,URL].includes(url.origin)) networkFailures.push({status:response.status(),method:response.request().method(),url:url.origin+url.pathname}); } catch {}
    });
    context.on("requestfailed",request=>{
      try { const url=new globalThis.URL(request.url()); if([base,URL].includes(url.origin)) networkFailures.push({error:request.failure()?.errorText,url:url.origin+url.pathname}); } catch {}
    });
    account.context=context;
    account.page=await context.newPage();
    await context.route("**/*",async route=>{
      const u=new globalThis.URL(route.request().url());
      if(["data:","blob:"].includes(u.protocol) || u.origin===base || u.origin===URL) return route.continue();
      if (["fonts.googleapis.com","fonts.gstatic.com"].includes(u.hostname)) return route.abort();
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
    if(account.name==="MEMBER_A") await dialog.getByRole("textbox").nth(3).fill("=1+1");
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
  let title="COLLAUDO UI "+nonce;
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
  const saved=must(await own.from("assessments").select("id,title,answers,checklist,created_by").eq("id",assessmentId).single(),"Read saved assessment");
  assert.equal(saved.title,title);
  assert.equal(saved.created_by,a.id);
  assert.equal(saved.answers.ragione_sociale,a.clientName);
  pass("assessment created through UI and reloaded from staging database");

  await mkdir("ui-test-results",{recursive:true});
  stage="UI notes and assessment history";
  const note="NOTA SINTETICA UI "+nonce;
  await a.page.getByRole("tab",{name:"Note",exact:true}).click();
  await a.page.getByPlaceholder("Nuova nota…",{exact:true}).fill(note);
  await a.page.getByRole("button",{name:"Aggiungi nota",exact:true}).click();
  await a.page.getByText(note,{exact:true}).waitFor();
  a.page.once("dialog",dialog=>dialog.accept("STORICO SINTETICO "+nonce));
  await a.page.getByRole("button",{name:"Registra valutazione",exact:true}).click();
  await a.page.getByRole("tab",{name:"Storico",exact:true}).click();
  await a.page.getByText("STORICO SINTETICO "+nonce,{exact:false}).waitFor();
  pass("note and historical snapshot saved through UI");

  stage="CSV owner export and formula neutralization";
  await a.page.goto(base+"/dashboard");
  await a.page.getByRole("heading",{name:a.clientName,exact:true}).waitFor();
  const pendingDownload=a.page.waitForEvent("download");
  await a.page.getByRole("button",{name:"Esporta CSV",exact:true}).click();
  const download=await pendingDownload;
  await download.saveAs("ui-test-results/owner-export.csv");
  const csv=await readFile("ui-test-results/owner-export.csv","utf8");
  assert.ok(csv.includes(a.clientName));
  assert.ok(csv.includes(title));
  assert.ok(csv.includes(note));
  assert.equal(csv.includes(b.clientName),false);
  assert.ok(csv.includes("'=1+1"),"CSV spreadsheet formula must be neutralized");
  pass("CSV contains owner data and notes, excludes other member and neutralizes formulas");

  stage="mobile dashboard and client dialog";
  await a.page.setViewportSize({width:390,height:844});
  const newClient=a.page.getByRole("button",{name:"Nuovo cliente",exact:true});
  await newClient.waitFor({state:"visible"});
  const rect=await newClient.boundingBox();
  assert.ok(rect && rect.x>=0 && rect.x+rect.width<=391,"Mobile new-client button outside viewport");
  assert.ok(await a.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),"Mobile dashboard horizontal overflow");
  await newClient.click();
  await a.page.getByRole("dialog").waitFor();
  await a.page.keyboard.press("Escape");
  await a.page.getByRole("dialog").waitFor({state:"hidden"});
  await a.page.screenshot({path:"ui-test-results/mobile-dashboard.png",fullPage:true,animations:"disabled"});
  pass("mobile dashboard has no horizontal overflow and new-client dialog opens");

  stage="mobile assessment editing and persistence";
  await a.page.goto(assessmentURL);
  await a.page.getByRole("tab",{name:"Questionario",exact:true}).waitFor();
  title += " mobile";
  await titleInput.fill(title);
  const mobileSave=a.page.getByRole("button",{name:"Salva",exact:true});
  await mobileSave.click();
  await a.page.getByRole("button",{name:"Salvato",exact:true}).waitFor();
  await a.page.reload();
  await a.page.getByRole("tab",{name:"Questionario",exact:true}).waitFor();
  await until(async()=>await titleInput.inputValue()===title,"Mobile change not restored");
  assert.ok(await a.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),"Mobile assessment horizontal overflow");
  pass("mobile assessment edit survives database save and reload without horizontal overflow");

  stage="mobile report and print controls";
  await a.page.goto(base+"/report/"+assessmentId);
  const report=a.page.locator(".report-document");
  await report.getByRole("heading",{name:a.clientName,exact:true}).waitFor();
  await report.getByText(note,{exact:true}).waitFor();
  assert.ok((await report.innerText()).includes(title));
  assert.ok(await a.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),"Mobile report horizontal overflow");
  await a.page.evaluate(()=>{window.__nomotecniaPrintCalled=false;window.print=()=>{window.__nomotecniaPrintCalled=true;};});
  await a.page.getByRole("button",{name:"Stampa / Salva PDF",exact:true}).click();
  assert.equal(await a.page.evaluate(()=>window.__nomotecniaPrintCalled),true);
  await a.page.screenshot({path:"ui-test-results/mobile-report.png",fullPage:true});
  pass("mobile report shows saved assessment and note; print button invokes browser print");

  stage="A4 PDF generation and content validation";
  await a.page.emulateMedia({media:"print"});
  assert.equal(await a.page.locator(".report-actions").isVisible(),false,"Print action toolbar must be hidden");
  const pdf=await a.page.pdf({path:"ui-test-results/assessment-synthetic.pdf",format:"A4",printBackground:true,preferCSSPageSize:true});
  assert.equal(pdf.subarray(0,5).toString(),"%PDF-");
  const {getDocument}=await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task=getDocument({data:new Uint8Array(pdf),useSystemFonts:true});
  try {
    const doc=await task.promise;
    assert.ok(doc.numPages>0 && doc.numPages<60,"Unexpected PDF page count");
    let text="";
    for(let pageNumber=1;pageNumber<=doc.numPages;pageNumber++) {
      const page=await doc.getPage(pageNumber);
      const data=await page.getTextContent();
      const viewport=page.getViewport({scale:1});
      assert.ok(Math.abs(viewport.width-595.28)<2 && Math.abs(viewport.height-841.89)<2,"PDF must use A4");
      text+=data.items.filter(item=>"str" in item).map(item=>item.str).join(" ")+" ";
    }
    assert.ok(text.includes(a.clientName),"PDF company identity missing");
    assert.ok(text.includes(title),"PDF saved title missing");
    assert.ok(text.includes(note),"PDF saved note missing");
    assert.ok(text.includes("Non compilato"),"Incomplete fields must remain explicit");
    assert.equal(text.includes(b.clientName),false);
    assert.equal(text.includes("Stampa / Salva PDF"),false);
    pass("A4 PDF validated: "+doc.numPages+" pages, owner identity/title/note, explicit incomplete fields, no foreign data or toolbar");
  } finally {await task.destroy();}
  await a.page.emulateMedia({media:"screen"});
  await a.page.setViewportSize({width:1365,height:900});

  stage="report isolation";
  await b.page.goto(base+"/report/"+assessmentId);
  await b.page.getByRole("alert").getByText("Impossibile caricare il report completo.",{exact:false}).waitFor();
  assert.equal(await b.page.locator(".report-document").count(),0);
  pass("cross-member report is denied without rendering owner document");


  stage="local PDF upload, human review and explicit save";
  await root.page.goto(assessmentURL);
  await root.page.getByRole("tab",{name:"Documenti",exact:true}).click();
  const lab=root.page.locator("section").filter({has:root.page.getByRole("heading",{name:documentHeading,exact:true})});
  await lab.getByRole("heading",{name:documentHeading,exact:true}).waitFor();
  const input=lab.locator('input[type="file"]');
  assert.equal(await input.isDisabled(),!localDocumentMode,"PDF input availability follows document mode");
  if(localDocumentMode) {
    assert.equal(await lab.locator("textarea").count(),0,"Operational mode must never preload synthetic text");
    assert.equal(await lab.getByRole("checkbox",{name:"Conferma Partita IVA",exact:true}).count(),0);
  }
  if(!localDocumentMode) await lab.getByRole("checkbox",{name:"Confermo che userò esclusivamente PDF inventati per test, senza dati reali di persone o aziende.",exact:true}).check();
  const fixture=syntheticPdf([
    "VISURA CAMERALE - FACSIMILE INVENTATO",
    "Denominazione: "+a.clientName,
    "Partita IVA: 00000000000",
    "ATECO prevalente: 62.10.00",
    "Sede legale: Via Fittizia 1, Viterbo",
  ]);
  const fileRequests=[];
  const watch=request=>{
    if(["POST","PUT","PATCH"].includes(request.method())) {
      const body=request.postData()??"";
      const type=request.headers()["content-type"]??"";
      if(type.includes("application/pdf") || type.includes("multipart/form-data") || body.includes("%PDF-")) fileRequests.push(request.url());
    }
  };
  root.page.on("request",watch);
  await input.setInputFiles({name:"visura-inventata.pdf",mimeType:"application/pdf",buffer:fixture});
  await lab.getByText("Analizzato localmente: visura-inventata.pdf",{exact:true}).waitFor();
  const iva=lab.getByRole("checkbox",{name:"Conferma Partita IVA",exact:true});
  assert.equal(await iva.isDisabled(),true,"Unverified identity must prevent selecting proposals");
  await lab.getByRole("checkbox",{name:"Confermo appartenenza documento alla impresa",exact:true}).check();
  assert.equal(await lab.getByRole("checkbox",{name:"Conferma Ragione sociale",exact:true}).isDisabled(),true,
    "Existing company name cannot be overwritten");
  await iva.check();
  await lab.getByRole("checkbox",{name:"Conferma Codice ATECO",exact:true}).check();
  await lab.getByRole("checkbox",{name:"Conferma Sede legale",exact:true}).check();
  const apply=lab.getByRole("button",{name:"Conferma campi selezionati nella bozza",exact:true});
  root.page.once("dialog",dialog=>dialog.dismiss());
  await apply.click();
  assert.equal(await iva.isChecked(),true,"Cancelling review must keep selection without applying it");
  root.page.once("dialog",dialog=>dialog.accept());
  await apply.click();
  await root.page.getByText("Modifiche non salvate: salva prima di aprire il report o registrare una valutazione.",{exact:true}).waitFor();
  const beforeSave=must(await own.from("assessments").select("answers").eq("id",assessmentId).single(),"Read before explicit PDF save");
  assert.ok(!beforeSave.answers.partita_iva,"Applying PDF proposals must not automatically save them");
  await root.page.getByRole("button",{name:"Salva",exact:true}).click();
  await root.page.getByRole("button",{name:"Salvato",exact:true}).waitFor();
  await root.page.reload();
  await root.page.getByRole("tab",{name:"Documenti",exact:true}).click();
  const afterSave=must(await own.from("assessments").select("answers,checklist").eq("id",assessmentId).single(),"Read confirmed PDF fields");
  assert.equal(afterSave.answers.partita_iva,"00000000000");
  assert.equal(afterSave.answers.ateco_codice,"62.10.00");
  assert.equal(afterSave.answers.sede_legale_indirizzo,"Via Fittizia 1, Viterbo");
  assert.equal(afterSave.answers.ragione_sociale,a.clientName);
  assert.deepEqual(afterSave.checklist,saved.checklist??{},"PDF import must not mark documents verified");
  pass("real local PDF parsed in browser, human consent/cancel/confirm checked; explicit save and reload preserve selected fields");

  stage="PDF wrong-company rejection and malformed-file fail-closed";
  if(!localDocumentMode) await lab.getByRole("checkbox",{name:"Confermo che userò esclusivamente PDF inventati per test, senza dati reali di persone o aziende.",exact:true}).check();
  const wrong=syntheticPdf([
    "VISURA CAMERALE - FACSIMILE INVENTATO",
    "Denominazione: IMPRESA DIVERSA INVENTATA",
    "Partita IVA: 11111111111",
    "ATECO prevalente: 01.11.00",
  ]);
  await input.setInputFiles({name:"impresa-diversa-inventata.pdf",mimeType:"application/pdf",buffer:wrong});
  await lab.getByText("Analizzato localmente: impresa-diversa-inventata.pdf",{exact:true}).waitFor();
  assert.equal(await apply.isDisabled(),true,"Wrong-company PDF must not be importable");
  assert.equal(await lab.getByRole("checkbox",{name:"Conferma Partita IVA",exact:true}).isDisabled(),true);
  await input.setInputFiles({name:"file-danneggiato.pdf",mimeType:"application/pdf",buffer:Buffer.from("FILE SINTETICO NON PDF")});
  await lab.getByRole("alert").waitFor();
  await lab.getByText("Nessun campo univoco riconosciuto.",{exact:true}).waitFor();
  assert.equal(await apply.isDisabled(),true,"Malformed PDF must not leave importable stale proposals");
  const finalData=must(await own.from("assessments").select("answers").eq("id",assessmentId).single(),"Read after rejected PDFs");
  assert.deepEqual(finalData.answers,afterSave.answers);
  assert.deepEqual(fileRequests,[],"Raw PDFs must never be sent over the network");
  root.page.off("request",watch);
  await root.page.screenshot({path:"ui-test-results/pdf-import-fail-closed.png",fullPage:true,animations:"disabled"});
  pass("wrong-company and malformed PDFs rejected without overwrites or stale proposals; no raw PDF upload");


  stage="IVA and INPS PDF import with fiscal-period validation";
  const periodFixtures=[
    {
      kind:"iva",name:"iva-2026-inventata.pdf",
      lines:["DICHIARAZIONE IVA 2026 - FACSIMILE INVENTATO","Periodo d'imposta 2025","Partita IVA: 00000000000","VE50: 500.000","VF25: 100.000"],
      labels:["Conferma VE50 volume d'affari 2025","Conferma VF25 imponibile acquisti 2025"],
      expected:{iva_ve50_2025:500000,iva_vf25_2025:100000},
      wrong:["DICHIARAZIONE IVA 2026 - FACSIMILE INVENTATO","Periodo d'imposta 2024","Partita IVA: 00000000000","VE50: 900.000","VF25: 800.000"],
    },
    {
      kind:"inps",name:"inps-luglio-2026-inventata.pdf",
      lines:["ATTESTAZIONE DELLA DENUNCIA CONTRIBUTIVA - FACSIMILE INVENTATO","Luglio 2026","Partita IVA: 00000000000","Forza Aziendale: 8"],
      labels:["Conferma Forza aziendale luglio 2026"],
      expected:{addetti_inps_luglio_2026:8},
      wrong:["ATTESTAZIONE DELLA DENUNCIA CONTRIBUTIVA - FACSIMILE INVENTATO","Luglio 2025","Partita IVA: 00000000000","Forza Aziendale: 88"],
    },
  ];
  for(const fixture of periodFixtures) {
    stage="PDF import "+fixture.kind;
    await lab.getByLabel("Tipologia documento",{exact:true}).selectOption(fixture.kind);
    if(!localDocumentMode) await lab.getByRole("checkbox",{name:"Confermo che userò esclusivamente PDF inventati per test, senza dati reali di persone o aziende.",exact:true}).check();
    await input.setInputFiles({name:fixture.name,mimeType:"application/pdf",buffer:syntheticPdf(fixture.lines)});
    await lab.getByText("Analizzato localmente: "+fixture.name,{exact:true}).waitFor();
    await lab.getByText("Partita IVA del documento coerente con quella della pratica. Verificare comunque il documento.",{exact:true}).waitFor();
    for(const label of fixture.labels) await lab.getByRole("checkbox",{name:label,exact:true}).check();
    const before=must(await own.from("assessments").select("answers,checklist").eq("id",assessmentId).single(),"Read before fiscal import");
    root.page.once("dialog",dialog=>dialog.accept());
    await apply.click();
    const draft=must(await own.from("assessments").select("answers").eq("id",assessmentId).single(),"Read draft before explicit save");
    assert.deepEqual(draft.answers,before.answers,"Fiscal import must not auto-save");
    await root.page.getByRole("button",{name:"Salva",exact:true}).click();
    await root.page.getByRole("button",{name:"Salvato",exact:true}).waitFor();
    await root.page.reload();
    await root.page.getByRole("tab",{name:"Documenti",exact:true}).click();
    const persisted=must(await own.from("assessments").select("answers,checklist").eq("id",assessmentId).single(),"Read saved fiscal fields");
    for(const [field,value] of Object.entries(fixture.expected)) assert.equal(persisted.answers[field],value);
    assert.equal(persisted.answers.partita_iva,"00000000000");
    assert.equal(persisted.answers.ragione_sociale,a.clientName);
    assert.deepEqual(persisted.checklist,before.checklist);
    pass(fixture.kind+" PDF parsed in browser; confirmed fields survive explicit save and reload without changing checklist");

    stage="wrong-period PDF rejection "+fixture.kind;
    await lab.getByLabel("Tipologia documento",{exact:true}).selectOption(fixture.kind);
    if(!localDocumentMode) await lab.getByRole("checkbox",{name:"Confermo che userò esclusivamente PDF inventati per test, senza dati reali di persone o aziende.",exact:true}).check();
    await input.setInputFiles({name:"periodo-errato-"+fixture.name,mimeType:"application/pdf",buffer:syntheticPdf(fixture.wrong)});
    await lab.getByText("Analizzato localmente: periodo-errato-"+fixture.name,{exact:true}).waitFor();
    await lab.getByText("Nessun campo univoco riconosciuto.",{exact:true}).waitFor();
    assert.equal(await apply.isDisabled(),true);
    const unchanged=must(await own.from("assessments").select("answers").eq("id",assessmentId).single(),"Read after wrong-period PDF");
    assert.deepEqual(unchanged.answers,persisted.answers);
    pass(fixture.kind+" PDF with wrong period rejected; saved values unchanged");
  }

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
  if (localDocumentMode && process.env.STAGING_DOCUMENT_EXTENSIONS === "true") {
    stage="OCR and private document archive";
    const {verifyDocumentExtensions}=await import("./verify-document-extensions.mjs");
    await verifyDocumentExtensions({root,own,other,admin,assessmentId,base,fixture,createClient,key,outsider:accounts.find(account=>account.name==="OUTSIDER")});
  }
  if (process.env.STAGING_GRANT_STUDIO === "true") {
    stage="authenticated grant studio drafts and role gateway";
    const {verifyGrantStudioStaging}=await import("./verify-grant-studio-staging.mjs");
    await verifyGrantStudioStaging({accounts,admin,base,nonce,createClient,key,options});
  }
  await own.auth.signOut();
  await other.auth.signOut();
  stage="network and browser checks";
  assert.deepEqual(blocked,[],"Unexpected external origin requested");
  assert.deepEqual(consoleErrors,[],"Browser uncaught errors");
  pass("backend requests confined to the selected staging origin and staging Supabase; external fonts disabled");
  await mkdir("ui-test-results",{recursive:true});
  await a.page.screenshot({path:"ui-test-results/assessment-synthetic.png",fullPage:true});
  pass(publicMode ? "published staging browser UI smoke completed" : "local browser UI smoke completed; published edge-site UI remains separate");
} catch(error) {
  try {
    const {recordStagingFailure}=await import("./staging-ui-diagnostics.mjs");
    const redact=text=>[secret,gate,...accounts.map(a=>a.password)].filter(Boolean).reduce((value,sensitive)=>value.replaceAll(sensitive,"[REDACTED]"),text).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,"[REDACTED_JWT]");
    await recordStagingFailure({accounts,nonce,stage,failures:networkFailures.slice(-80),redact});
  } catch { console.error("Failure diagnostic unavailable; fixture cleanup will still run"); }
  let message=String(error?.message??"Unknown error")+(stage==="local Cloudflare runtime" ? "\\n"+serverLog : "");
  for(const value of [secret,gate,...accounts.map(a=>a.password)]) if(value) message=message.replaceAll(value,"[REDACTED]");
  console.error("FAILED at: "+stage+" ("+(error?.name??"Error")+") "+message.slice(0,1500));
  process.exitCode=1;
} finally {
  await browser?.close().catch(()=>{});
  server?.kill("SIGTERM");
  if (!publicMode) await rm(".output/server/.dev.vars",{force:true});
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

