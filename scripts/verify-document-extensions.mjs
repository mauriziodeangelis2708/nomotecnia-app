import assert from "node:assert/strict";

async function scanPdf(page) {
  const jpeg = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600; canvas.height = 1800;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, 1600, 1800);
    ctx.fillStyle = "black"; ctx.font = "48px Arial";
    ["FACSIMILE INVENTATO", "DOCUMENTO SINTETICO DI COLLAUDO", "Nessun dato reale di persone o imprese.", "Importo di prova: 12345 euro."].forEach((line, i) => ctx.fillText(line, 70, 200 + i * 120));
    return canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
  });
  const image = Buffer.from(jpeg, "base64");
  const stream = Buffer.from("q 595 0 0 670 0 172 cm /Im1 Do Q");
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>"),
    Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`), stream, Buffer.from("\nendstream")]),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1600 /Height 1800 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`), image, Buffer.from("\nendstream")]),
  ];
  const parts = [Buffer.from("%PDF-1.4\n")], offsets = [0];
  let length = parts[0].length;
  objects.forEach((body, i) => { offsets.push(length); const object = Buffer.concat([Buffer.from(`${i+1} 0 obj\n`), body, Buffer.from("\nendobj\n")]); parts.push(object); length += object.length; });
  const xref = length;
  parts.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10,"0")+" 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return Buffer.concat(parts);
}

export async function verifyDocumentExtensions({ root, own, other, admin, assessmentId, base, fixture, createClient, key, outsider }) {
  assert.equal(process.env.STAGING_SUPABASE_URL, "https://vknvadzsjuixcuwegxto.supabase.co");
  const page = root.page;
  const lab = page.locator("section").filter({ has: page.getByRole("heading", { name: "Leggi PDF e compila la pratica", exact: true }) });
  const archive = page.locator("section").filter({ has: page.getByRole("heading", { name: "Archivio PDF della pratica", exact: true }) });
  const paths = [];
  const bucket = own.storage.from("assessment-documents");
  const requests = [];
  const watch = (request) => { if (["POST","PUT","PATCH"].includes(request.method())) requests.push(request.url()); };
  try {
    await lab.getByLabel("Tipologia documento").selectOption("altro");
    await lab.getByRole("checkbox", { name: "Leggi scansioni con OCR sul dispositivo (massimo 8 pagine)" }).check();
    const scan = await scanPdf(page);
    page.on("request", watch);
    await lab.locator('input[type="file"]').setInputFiles({ name: "scansione-inventata.pdf", mimeType: "application/pdf", buffer: scan });
    await lab.getByText("Analizzato localmente: scansione-inventata.pdf", { exact: true }).waitFor({ timeout: 150000 });
    const text = await lab.getByLabel("Testo letto dal documento (non salvato)").inputValue();
    assert.match(text, /FACSIMILE/i);
    assert.match(text, /12345/);
    assert.deepEqual(requests, [], "OCR must never POST document content");
    page.off("request", watch);
    await page.screenshot({ path: "ui-test-results/local-ocr-synthetic.png", fullPage: true });
    console.log("PASS: real scanned PDF recognized locally in Italian without external OCR, uploads or auto-import");

    await archive.getByText("Nessun PDF archiviato.", { exact: true }).waitFor();
    await archive.getByLabel("PDF da archiviare (massimo 8 MB)").setInputFiles({ name: "allegato-sintetico.pdf", mimeType: "application/pdf", buffer: fixture });
    assert.deepEqual((await bucket.list(assessmentId)).data, []);
    page.once("dialog", dialog => dialog.dismiss());
    await archive.getByRole("button", { name: "Archivia PDF nella pratica", exact: true }).click();
    assert.deepEqual((await bucket.list(assessmentId)).data, []);
    page.once("dialog", dialog => dialog.accept());
    await archive.getByRole("button", { name: "Archivia PDF nella pratica", exact: true }).click();
    await archive.getByText("allegato-sintetico.pdf", { exact: true }).waitFor();
    const listed = await bucket.list(assessmentId);
    assert.equal(listed.error, null); assert.equal(listed.data.length, 1);
    const name = listed.data[0].name;
    const path = `${assessmentId}/${name}`;
    paths.push(path);
    const downloaded = await bucket.download(path);
    assert.equal(downloaded.error, null);
    assert.deepEqual(Buffer.from(await downloaded.data.arrayBuffer()), fixture);
    const downloadPromise = page.waitForEvent("download");
    await archive.getByRole("button", { name: "Scarica PDF", exact: true }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "allegato-sintetico.pdf");
    const restrictedDelete = await own.from("assessments").delete().eq("id", assessmentId);
    assert.ok(restrictedDelete.error, "Assessment deletion must not orphan archived originals");
    assert.equal(restrictedDelete.error.code, "23503");
    const parent = await own.from("assessments").select("client_id").eq("id", assessmentId).single();
    assert.equal(parent.error, null);
    const restrictedClientDelete = await own.from("clients").delete().eq("id", parent.data.client_id);
    assert.ok(restrictedClientDelete.error, "Client cascading deletion must not orphan originals");
    assert.equal(restrictedClientDelete.error.code, "23503");

    const anonymous = createClient("https://vknvadzsjuixcuwegxto.supabase.co", key, { auth: { persistSession: false } });
    const outsiderApi = createClient("https://vknvadzsjuixcuwegxto.supabase.co", key, { auth: { persistSession: false } });
    assert.equal((await outsiderApi.auth.signInWithPassword({ email: outsider.email, password: outsider.password })).error, null);
    for (const client of [other, anonymous, outsiderApi]) {
      const storage = client.storage.from("assessment-documents");
      assert.ok((await storage.download(path)).error, "Foreign and anonymous downloads must be denied");
      const hidden = await storage.list(assessmentId);
      assert.equal(hidden.data?.length ?? 0, 0);
      const forbidden = `${assessmentId}/${crypto.randomUUID()}--foreign.pdf`;
      assert.ok((await storage.upload(forbidden, fixture, { contentType: "application/pdf" })).error, "Foreign upload must be denied");
      await storage.remove([path]);
      assert.equal((await bucket.download(path)).error, null, "Foreign removal must not remove owner original");
    }
    assert.ok((await bucket.update(path, fixture, { contentType: "application/pdf" })).error, "Overwrites must be denied");
    assert.ok((await bucket.upload(`${assessmentId}/bad.pdf`, fixture, { contentType: "application/pdf" })).error, "Unscoped object names must be denied");
    assert.ok((await bucket.upload(`${assessmentId}/${crypto.randomUUID()}--bad.pdf`, fixture, { contentType: "text/plain" })).error, "Wrong MIME type must be denied");
    const tooLarge = Buffer.alloc(8388609);
    fixture.copy(tooLarge, 0, 0, Math.min(fixture.length, tooLarge.length));
    assert.ok((await bucket.upload(`${assessmentId}/${crypto.randomUUID()}--oversized.pdf`, tooLarge, { contentType: "application/pdf" })).error, "Storage must enforce 8 MB limit server-side");
    const publicURL = bucket.getPublicUrl(path).data.publicUrl;
    assert.notEqual((await fetch(publicURL)).status, 200, "Bucket must never serve public originals");
    await outsiderApi.auth.signOut();
    await page.reload();
    await page.getByRole("tab", { name: "Documenti", exact: true }).click();
    await archive.getByText("allegato-sintetico.pdf", { exact: true }).waitFor();
    await page.screenshot({ path: "ui-test-results/private-archive-synthetic.png", fullPage: true });
    page.once("dialog", dialog => dialog.accept());
    await archive.getByRole("button", { name: "Elimina PDF", exact: true }).click();
    await archive.getByText("Nessun PDF archiviato.", { exact: true }).waitFor();
    assert.ok((await bucket.download(path)).error);
    console.log("PASS: private archive UI upload/cancel/download/reload/delete; foreign/anonymous/outsider access, overwrite, public URL and malformed paths denied; deletion guard prevents orphan originals");
  } finally {
    page.off("request", watch);
    if (paths.length) {
      const removed = await admin.storage.from("assessment-documents").remove(paths);
      assert.equal(removed.error, null, "Synthetic originals cleanup must succeed");
    }
  }
}
