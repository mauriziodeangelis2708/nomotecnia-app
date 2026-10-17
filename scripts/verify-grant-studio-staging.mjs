import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import { syntheticGrant } from "../src/lib/grants/fixtures.test-support.ts";

/** Actual staging UI + RLS. Never calls a model or activates a persistent test version. */
export async function verifyGrantStudioStaging({ accounts, admin, base, nonce, createClient, key, options }) {
  assert.equal(process.env.STAGING_SUPABASE_URL,"https://vknvadzsjuixcuwegxto.supabase.co");
  const root=accounts.find(a=>a.name==="ADMIN"), member=accounts.find(a=>a.name==="MEMBER_A"), outsider=accounts.find(a=>a.name==="OUTSIDER");
  const schemeKey="bando_qa_"+nonce, title="BANDO SINTETICO STAGING "+nonce;
  const actor=createClient(process.env.STAGING_SUPABASE_URL,key,options);
  let templateId;
  try {
    for (const [account,expected] of [[root,503],[member,403],[outsider,403]]) {
      const client=createClient(process.env.STAGING_SUPABASE_URL,key,options);
      const auth=await client.auth.signInWithPassword({email:account.email,password:account.password});
      assert.equal(auth.error,null); assert.ok(auth.data.session);
      // The staging Basic gate remains enabled; user authorization uses a separate header.
      const status=await account.page.evaluate(async ({token}) => {
        const r=await fetch("/api/grants/generate",{method:"POST",headers:{"Content-Type":"application/json","X-Nomotecnia-Session":"Bearer "+token},body:"{}"});
        return r.status;
      },{token:auth.data.session.access_token});
      assert.equal(status,expected,"Generation gateway role enforcement: "+account.name);
      await client.auth.signOut({scope:"local"});
    }
    console.log("PASS: real staging gateway preserves Basic protection, denies non-admin roles and leaves inference disabled");
    const login=await actor.auth.signInWithPassword({email:root.email,password:root.password}); assert.equal(login.error,null);
    await root.page.goto(base+"/admin");
    await root.page.getByRole("tab",{name:"Gestione bandi",exact:true}).click();
    await root.page.getByRole("heading",{name:/Gestione bandi/}).waitFor();
    const d=syntheticGrant(); d.id=schemeKey; d.title=title;
    await root.page.getByText("Importa o correggi una configurazione strutturata",{exact:true}).click();
    await root.page.getByLabel("Configurazione del bando",{exact:true}).fill(JSON.stringify(d));
    await root.page.getByRole("button",{name:"Valida e applica la configurazione",exact:true}).click();
    await root.page.getByRole("heading",{name:title+" · v1",exact:true}).waitFor();
    const downloading=root.page.waitForEvent("download");
    await root.page.getByRole("button",{name:"Esporta fonti per la revisione dei requisiti",exact:true}).click();
    const download=await downloading;
    const packet=JSON.parse(await readFile(await download.path(),"utf8"));
    assert.deepEqual(packet.sourceHashes,d.sources.map(s=>s.sha256));
    assert.equal(packet.chunks[0].spans[0].text,d.sources[0].pages[0].text);
    const specification={inputs:[{id:"budget",label:"Spesa ammissibile già verificata",unit:"EUR",spanId:"span_1"}],declarations:[{id:"active",label:"Impresa attiva verificata?",kind:"eligibility",expected:true,spanIds:["span_1"]},{id:"insolvent",label:"Procedura concorsuale presente?",kind:"exclusion",expected:true,spanIds:["span_1"]}],minimums:[{sumOf:["budget"],value:14000,spanId:"span_1"}],shares:[],fieldLimits:[],awardCaps:[],awards:[{id:"award",calculation:{method:"percentage",ratePercent:50,baseFields:["budget"],capAmount:10000},spanIds:["span_1"]}],unresolved:["Punteggio della certificazione e altri requisiti da verificare."]};
    const reviewed={kind:"requirement_specification",id:schemeKey,title,version:1,sourceHashes:packet.sourceHashes,chunkIndex:0,specification};
    await root.page.getByLabel("Configurazione del bando",{exact:true}).fill(JSON.stringify({...reviewed,sourceHashes:["b".repeat(64)]}));
    await root.page.getByRole("button",{name:"Valida e applica la configurazione",exact:true}).click();
    await root.page.getByRole("status").filter({hasText:"Le fonti caricate non corrispondono"}).waitFor();
    await root.page.getByLabel("Configurazione del bando",{exact:true}).fill(JSON.stringify(reviewed));
    await root.page.getByRole("button",{name:"Valida e applica la configurazione",exact:true}).click();
    await root.page.getByRole("status").filter({hasText:"Configurazione applicata in anteprima"}).waitFor();
    const compiled=JSON.parse(await root.page.getByLabel("Configurazione del bando",{exact:true}).inputValue());
    assert.equal(compiled.rules.find(r=>r.id==="award").formula.op,"min");
    assert.ok(compiled.unresolved.some(s=>s.startsWith("Specifica di requisiti parziale")));
    assert.equal(compiled.questions.length,3);
    console.log("PASS: local source export, reviewed-requirement import and foreign-source rejection; partial assessment remains blocked");
    assert.equal(await root.page.getByRole("button",{name:"Approva e attiva questa versione",exact:true}).isDisabled(),true);
    await root.page.getByRole("button",{name:"Salva bozza",exact:true}).click();
    await root.page.getByRole("status").filter({hasText:"Bozza salvata."}).waitFor();
    const saved=await admin.from("grant_templates").select("*").eq("scheme_key",schemeKey).eq("created_by",root.id).single();
    assert.equal(saved.error,null); templateId=saved.data.id; assert.equal(saved.data.published_at,null);
    await root.page.reload();
    await root.page.getByRole("tab",{name:"Gestione bandi",exact:true}).click();
    await root.page.getByRole("button",{name:title+" · v1 · Bozza",exact:true}).click();
    await root.page.getByRole("heading",{name:title+" · v1",exact:true}).waitFor();
    const changed={...saved.data.definition,description:"Modifica sintetica concorrente "+nonce};
    const update=await actor.from("grant_templates").update({definition:changed}).eq("id",templateId).eq("revision",saved.data.revision).select("revision").single();
    assert.equal(update.error,null); assert.equal(update.data.revision,saved.data.revision+1);
    await root.page.getByRole("button",{name:"Salva bozza",exact:true}).click();
    await root.page.getByRole("status").filter({hasText:"Bozza modificata altrove"}).waitFor();
    const intact=await actor.from("grant_templates").select("definition").eq("id",templateId).single();
    assert.equal(intact.error,null); assert.equal(intact.data.definition.description,changed.description);
    console.log("PASS: actual admin draft save/reload and optimistic revision conflict preserve concurrent edits");
    await member.page.goto(base+"/admin");
    await member.page.getByText("Sezione riservata agli amministratori.",{exact:true}).waitFor();
    assert.equal(await member.page.getByRole("tab",{name:"Gestione bandi",exact:true}).count(),0);
    console.log("PASS: member UI cannot open grant administration");
  } finally {
    await actor.auth.signOut({scope:"local"});
    const removed=await admin.from("grant_templates").delete().eq("scheme_key",schemeKey).eq("created_by",root.id).is("published_at",null);
    assert.equal(removed.error,null,"Cleanup of isolated draft");
    const remaining=await admin.from("grant_templates").select("id",{count:"exact",head:true}).eq("scheme_key",schemeKey).eq("created_by",root.id);
    assert.equal(remaining.error,null); assert.equal(remaining.count,0);
    console.log("PASS: synthetic grant draft removed; no persistent activated fixtures");
  }
}
