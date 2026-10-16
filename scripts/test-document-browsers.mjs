import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import * as browsers from "/tmp/nomotecnia-local-browser/node_modules/playwright/index.mjs";
import { textPdf } from "./document-reader-fixtures.mjs";
import { scanPdf } from "./verify-document-extensions.mjs";

const engine = process.env.READER_BROWSER || "chromium";
assert.ok(["chromium", "firefox", "webkit"].includes(engine));
const root = resolve("dist/document-reader");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".gz": "application/gzip" };
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, "http://localhost").pathname;
    const file = resolve(root, "." + (path === "/" ? "/index.html" : decodeURIComponent(path)));
    if (!file.startsWith(root + sep)) throw new Error("Invalid path");
    response.setHeader("content-type", types[extname(file)] || "application/octet-stream");
    response.setHeader("cache-control", "no-store");
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await browsers[engine].launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
const blocked = [], errors = [];
await context.route("**/*", route => {
  const url = new URL(route.request().url());
  if (url.origin === base || ["blob:", "data:"].includes(url.protocol)) return route.continue();
  if (!["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname)) blocked.push(url.hostname);
  return route.abort();
});
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.name));
const pass = label => console.log(`PASS ${engine}: ${label}`);
const input = page.locator('input[type="file"]');
const alert = page.getByRole("alert");
const apply = page.getByRole("button", { name: "Conferma campi selezionati nella bozza", exact: true });
async function upload(buffer, name = "documento-inventato.pdf") {
  await input.setInputFiles({ name, mimeType: "application/pdf", buffer });
}
async function finished(name) {
  await page.getByText("Analizzato localmente: " + name, { exact: true }).or(alert).first().waitFor({ timeout: 90000 });
  assert.equal(await alert.count(), 0, (await alert.count()) ? await alert.first().innerText() : "");
}
async function until(condition, message) {
  const deadline = Date.now() + 15000;
  while (!(await condition())) {
    if (Date.now() > deadline) throw new Error(message);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
let stage = "initial";
try {
  await mkdir("reader-test-results", { recursive: true });
  await page.goto(base);
  await page.getByRole("heading", { name: "Leggi PDF e compila la pratica" }).waitFor();
  assert.equal(await alert.count(), 0);
  assert.equal(await page.getByText(/Testo assente/).count(), 0);
  assert.equal(page.workers().length, 0, "No document worker before file selection");
  pass("empty reader shows no error and starts no document processing");

  stage = "malformed and limits";
  await upload(Buffer.from("THIS IS NOT A PDF"));
  await alert.getByText("Firma PDF non riconosciuta.", { exact: true }).waitFor();
  assert.equal(await apply.isDisabled(), true);
  await upload(Buffer.alloc(8388609));
  await alert.getByText(/8 MB/).waitFor();
  await upload(textPdf(["FACSIMILE INVENTATO"], 46));
  await alert.getByText(/massimo 45/).waitFor();
  assert.equal(await apply.isDisabled(), true);
  pass("malformed, oversized and 46-page PDFs fail closed");

  stage = "text and confirmation";
  const valid = textPdf(["VISURA CAMERALE - FACSIMILE INVENTATO", "Partita IVA: 00000000000", "ATECO prevalente: 62.10.00"]);
  await upload(valid, "visura-inventata.pdf");
  await finished("visura-inventata.pdf");
  assert.equal(await apply.isDisabled(), true);
  await page.getByRole("checkbox", { name: "Conferma Codice ATECO", exact: true }).check();
  page.once("dialog", dialog => dialog.accept());
  await apply.click();
  assert.equal(JSON.parse(await page.locator("#reader-values").innerText()).ateco_codice, "62.10.00");
  await upload(textPdf(["VISURA CAMERALE", "Partita IVA: 11111111111", "ATECO prevalente: 01.11.00"]));
  await alert.getByText(/diversa/).waitFor();
  assert.equal(await apply.isDisabled(), true);
  pass("text extraction, human confirmation and wrong-company blocking");

  stage = "long mobile filename";
  await page.setViewportSize({ width: 320, height: 844 });
  const longName = "documento-" + "a".repeat(170) + ".pdf";
  await page.getByLabel("Tipologia documento").selectOption("visura");
  await upload(valid, longName);
  await finished(longName);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  pass("long document names fit a narrow mobile viewport");
  stage = "mobile scan";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Tipologia documento").selectOption("altro");
  const scan = await scanPdf(page);
  await upload(scan, "scansione-inventata.pdf");
  await alert.getByText(/abilita la lettura OCR/).waitFor();
  await page.getByRole("checkbox", { name: "Leggi scansioni con OCR sul dispositivo (massimo 8 pagine)" }).check();
  await upload(scan, "scansione-inventata.pdf");
  await finished("scansione-inventata.pdf");
  const text = await page.getByLabel("Testo letto dal documento (non salvato)").inputValue();
  assert.match(text, /FACSIMILE/i);
  assert.match(text, /12345/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await page.screenshot({ path: `reader-test-results/${engine}-mobile-ocr.png`, fullPage: true });
  pass("real scan OCR at mobile viewport, readable result and no horizontal overflow");

  stage = "cancel pending initialization";
  await page.getByRole("button", { name: "Rimuovi PDF dalla memoria" }).click();
  await upload(scan);
  await page.getByRole("status").getByText(/OCR locale/).waitFor();
  await page.getByRole("button", { name: "Rimuovi PDF dalla memoria" }).click();
  assert.equal(await input.isEnabled(), true);
  assert.equal(await page.getByLabel("Testo letto dal documento (non salvato)").count(), 0);
  await until(() => page.workers().every(worker => !worker.url().includes("/ocr/v7/worker.min.js")), "OCR worker survived cancellation");
  pass("cancellation removes output and terminates pending OCR worker");

  stage = "model unavailable and recovery";
  await context.route("**/ocr/v7/lang/ita.traineddata.gz", route => route.abort());
  await upload(scan);
  await alert.getByText(/Impossibile avviare l’OCR/).waitFor({ timeout: 30000 });
  assert.equal(await input.isEnabled(), true);
  await context.unroute("**/ocr/v7/lang/ita.traineddata.gz");
  await page.getByRole("checkbox", { name: "Leggi scansioni con OCR sul dispositivo (massimo 8 pagine)" }).uncheck();
  await page.getByLabel("Tipologia documento").selectOption("visura");
  await upload(valid, "recupero-inventato.pdf");
  await finished("recupero-inventato.pdf");
  pass("unavailable OCR model returns a recoverable error; subsequent text PDF works");
  assert.deepEqual(blocked, [], "No external document-processing origin");
  assert.deepEqual(errors, [], "No uncaught browser error");
} catch (error) {
  console.error(`FAILED ${engine} at ${stage}: ${error.message}`);
  await page.screenshot({ path: `reader-test-results/${engine}-failure.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
