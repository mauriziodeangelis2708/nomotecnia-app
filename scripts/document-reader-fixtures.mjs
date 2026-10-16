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

export function textPdf(lines, count = 1) { return Buffer.from(makeFakePdf(Array.from({length:count},()=>lines))); }
