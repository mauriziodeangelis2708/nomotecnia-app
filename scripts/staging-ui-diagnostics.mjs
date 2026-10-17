import { mkdir, writeFile } from "node:fs/promises";

/** Failure-only diagnostics; no cookies, tokens, headers, input values or query strings. */
export async function recordStagingFailure({accounts,nonce,stage,failures,redact}) {
  const states=[];
  await mkdir("ui-test-results",{recursive:true});
  for(const account of accounts) {
    if(!account.page) continue;
    let url="unknown";
    try { const parsed=new URL(account.page.url()); url=parsed.origin+parsed.pathname; } catch {}
    const state={account:account.name,url};
    try {
      state.headings=await account.page.getByRole("heading").allTextContents();
      state.buttons=await account.page.getByRole("button").allTextContents();
      state.alerts=await account.page.getByRole("alert").allTextContents();
      const main=await account.page.locator("main").innerText({timeout:2000});
      // Capture only screens visibly bearing this run's unique synthetic marker.
      if(main.includes(nonce)) await account.page.screenshot({path:`ui-test-results/failure-${account.name}.png`,fullPage:true,timeout:5000});
    } catch { state.observation="page unavailable during failure"; }
    states.push(state);
  }
  const diagnostic=redact(JSON.stringify({stage,states,network:failures},null,2));
  await writeFile("ui-test-results/failure-diagnostics.json",diagnostic);
  console.error("SYNTHETIC_STAGING_DIAGNOSTIC "+diagnostic.slice(0,14000));
}
