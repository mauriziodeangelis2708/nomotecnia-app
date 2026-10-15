// Smoke test: genuine PDF.js parse of an invented PDF, no external files or real data.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

function makePdf() {
  const stream = "BT /F1 12 Tf 50 740 Td (DICHIARAZIONE IVA 2026) Tj " +
    "0 -20 Td (Periodo d'imposta 2025) Tj 0 -20 Td (VE50: 500.000) Tj " +
    "0 -20 Td (VF25: 100.000) Tj ET";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let n = 0; n < objs.length; n++) {
    offsets.push(pdf.length);
    pdf += (n + 1) + " 0 obj\n" + objs[n] + "\nendobj\n";
  }
  const xref = pdf.length;
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += String(offset).padStart(10, "0") + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  return new TextEncoder().encode(pdf);
}

const task = getDocument({ data: makePdf(), useSystemFonts: true });
try {
  const doc = await task.promise;
  if (doc.numPages !== 1) throw new Error("Synthetic PDF: wrong page count");
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const raw = content.items
    .filter((entry) => "str" in entry)
    .map((entry) => entry.str)
    .join(" ");
  if (!raw.includes("VE50: 500.000") || !raw.includes("VF25: 100.000")) {
    throw new Error("Synthetic PDF: VE50/VF25 not parsed: " + raw.slice(0, 350));
  }
  process.stdout.write("Synthetic PDF.js read succeeded: 1 page, VE50/VF25 found.\n");
} finally {
  await task.destroy();
}
