// Synthetic end-to-end PDF fixtures: no real client files.
// Node 24 strips TS types in the three local source modules.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { pdfItemsToLines } from "../src/lib/local-pdf-reader.ts";
import { previewDocumentPages } from "../src/lib/document-prefill-demo.ts";
import { mergeConfirmedDocumentFields } from "../src/lib/document-prefill-merge.ts";
import { mergeReviewedDocumentFields } from "../src/lib/document-prefill-review.ts";

function assert(condition, message) {
  if (!condition) throw new Error("Synthetic PDF test failed: " + message);
}
function escapePdf(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function makeFakePdf(pages) {
  const n = pages.length;
  const fontId = 3 + n * 2;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [" + pages.map((_, i) => String(i + 3) + " 0 R").join(" ") + "] /Count " + n + " >>",
    ...pages.map((_, i) => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 " + fontId + " 0 R >> >> /Contents " + (3 + n + i) + " 0 R >>"),
    ...pages.map((lines) => {
      const stream = "BT /F1 11 Tf 38 798 Td " +
        lines.map((line, i) => (i ? "0 -20 Td " : "") + "(" + escapePdf(line) + ") Tj").join(" ") + " ET";
      return "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
    }),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    out += (i + 1) + " 0 obj\n" + obj + "\nendobj\n";
  });
  const xref = out.length;
  out += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  offsets.slice(1).forEach((pos) => { out += String(pos).padStart(10, "0") + " 00000 n \n"; });
  out += "trailer\n<< /Size " + (objects.length + 1) +
    " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  return new TextEncoder().encode(out);
}
async function readPdf(fixturePages) {
  const task = getDocument({ data: makeFakePdf(fixturePages), useSystemFonts: true });
  try {
    const doc = await task.promise;
    assert(doc.numPages === fixturePages.length, "page count");
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const fragments = content.items.flatMap((entry) =>
        "str" in entry ? [{ str: entry.str, transform: entry.transform, hasEOL: entry.hasEOL }] : [],
      );
      pages.push({ page: n, text: pdfItemsToLines(fragments).join("\n") });
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
const scenarios = [
  {
    title: "Visura a due pagine", kind: "visura",
    pdf: [
      ["VISURA CAMERALE - FACSIMILE INVENTATO", "Pagina 1 di 2"],
      ["Denominazione: AZIENDA DEMO SRL", "Partita IVA: 00000000000", "ATECO prevalente: 62.10.00", "Sede legale: Via Fittizia 1, Viterbo"],
    ],
    expected: { ragione_sociale: "AZIENDA DEMO SRL", partita_iva: "00000000000", ateco_codice: "62.10.00", sede_legale_indirizzo: "Via Fittizia 1, Viterbo" },
    page: 2,
  },
  {
    title: "IVA a due pagine", kind: "iva",
    pdf: [
      ["DICHIARAZIONE IVA 2026 - FACSIMILE", "Periodo d'imposta 2025", "SEZIONE 1"],
      ["VE50: 500.000", "VF25: 100.000", "VE51: 900.000"],
    ],
    expected: { iva_ve50_2025: 500000, iva_vf25_2025: 100000 }, page: 2,
  },
  {
    title: "IVA 2026 facsimile con VF25 imponibile/imposta in colonne", kind: "iva",
    pdf: [
      ["MOD. IVA 2026 - FACSIMILE INVENTATO", "Periodo d imposta: 2025"],
      ["IMPONIBILE IMPOSTA", "VE50 Volume d affari 500.000,00", "VF25 Totale acquisti e importazioni 100.000,00 22.000,00"],
    ],
    expected: { iva_ve50_2025: 500000, iva_vf25_2025: 100000 }, page: 2,
  },
  {
    title: "INPS a due pagine", kind: "inps",
    pdf: [
      ["ATTESTAZIONE DELLA DENUNCIA CONTRIBUTIVA - FACSIMILE", "Luglio 2026"],
      ["Forza Aziendale: 8", "Addetti altra categoria: 30"],
    ],
    expected: { addetti_inps_luglio_2026: 8 }, page: 2,
  },
];
let count = 0;
for (const s of scenarios) {
  const sourcePages = await readPdf(s.pdf);
  const preview = previewDocumentPages(sourcePages, s.kind);
  assert(preview.proposals.length === Object.keys(s.expected).length, s.title + " proposal count " + JSON.stringify(preview));
  for (const p of preview.proposals) {
    assert(p.value === s.expected[p.field], s.title + " wrong " + p.field);
    assert(p.sourcePage === s.page && p.sourceLine >= 1, s.title + " wrong provenance");
  }
  const reviewed = mergeReviewedDocumentFields({}, s.kind, preview.proposals, sourcePages, true);
  assert(reviewed.applied.length === preview.proposals.length, s.title + " reviewed merge incomplete");
  const forged = { ...preview.proposals[0], value: 999999999 };
  const tampered = mergeReviewedDocumentFields({}, s.kind, [forged], sourcePages, true);
  assert(tampered.applied.length === 0, s.title + " accepted altered source value");
  const merged = mergeConfirmedDocumentFields({}, s.kind, preview.proposals);
  assert(merged.applied.length === preview.proposals.length, s.title + " merge incomplete");
  assert(JSON.stringify(merged.answers) === JSON.stringify(s.expected), s.title + " incorrect mapping");
  const already = Object.fromEntries(Object.keys(s.expected).map((k) => [k, "gia presente"]));
  const blocked = mergeConfirmedDocumentFields(already, s.kind, preview.proposals);
  assert(blocked.applied.length === 0, s.title + " overwrote existing fields");
  count += 1;
  process.stdout.write("PASS: " + s.title + "; " + preview.proposals.length + " fields\n");
}
const invalid = [
  { name: "INPS anno sbagliato", kind: "inps", pdf: [["ATTESTAZIONE DELLA DENUNCIA CONTRIBUTIVA", "Luglio 2025", "Forza Aziendale: 18"]] },
  { name: "INPS dati contraddittori", kind: "inps", pdf: [["ATTESTAZIONE DELLA DENUNCIA CONTRIBUTIVA", "Luglio 2026", "Forza Aziendale: 8"], ["Forza Aziendale: 12"]] },
  { name: "IVA senza periodo", kind: "iva", pdf: [["DICHIARAZIONE IVA 2026", "VE50: 100.000", "VF25: 20.000"]] },
  { name: "VF25 con due colonne prive di intestazione", kind: "iva", pdf: [["MOD. IVA 2026", "Periodo d imposta: 2025", "VF25 Totale acquisti e importazioni 100.000,00 22.000,00"]] },
  { name: "PDF vuoto", kind: "iva", pdf: [[]] },
];
for (const scenario of invalid) {
  const out = previewDocumentPages(await readPdf(scenario.pdf), scenario.kind);
  assert(out.proposals.length === 0, scenario.name + " wrongly accepted data");
  count += 1;
  process.stdout.write("PASS: " + scenario.name + "; blocked\n");
}
process.stdout.write("PDF.js full pipeline passed " + count + " invented-PDF scenarios.\n");
