import { createLocalOcr, type LocalReadOptions } from "./local-ocr.ts";
import type { DocumentPage } from "./document-prefill-demo";

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_PDF_PAGES = 45;
const MAX_PDF_TEXT = 240000;

export class LocalPdfError extends Error {}

export interface PdfTextItem {
  str: string;
  transform?: number[];
  hasEOL?: boolean;
}

/** Group positioned PDF text fragments conservatively into visual lines. */
export function pdfItemsToLines(items: readonly PdfTextItem[]): string[] {
  const lines: string[] = [];
  let line: { x: number; text: string }[] = [];
  let y: number | null = null;
  function flush() {
    if (!line.length) return;
    const built = line
      .sort((a, b) => a.x - b.x)
      .map((item) => item.text.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (built) lines.push(built);
    line = [];
  }
  for (const item of items) {
    const str = item.str?.trim();
    if (!str) {
      if (item.hasEOL) {
        flush();
        y = null;
      }
      continue;
    }
    const tx = item.transform;
    const x = tx && Number.isFinite(tx[4]) ? tx[4]! : line.length;
    const nextY = tx && Number.isFinite(tx[5]) ? tx[5]! : null;
    if (y !== null && nextY !== null && Math.abs(nextY - y) > 2) flush();
    if (nextY !== null) y = nextY;
    line.push({ x, text: str });
    if (item.hasEOL) {
      flush();
      y = null;
    }
  }
  flush();
  return lines;
}

function looksLikePdf(header: Uint8Array): boolean {
  return (
    header.length >= 5 &&
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  );
}

/**
 * Local PDF.js parsing, no network calls to a document-processing API.
 * Must only be invoked in client-side event handlers, never during SSR.
 * The PDF worker is bundled as a first-party asset (?url), not a CDN.
 */
export async function extractLocalPdfText(
  file: File,
  options: LocalReadOptions = {},
): Promise<DocumentPage[]> {
  if (typeof window === "undefined")
    throw new LocalPdfError("Funzione disponibile solo nel browser.");
  if (file.size < 5 || file.size > MAX_PDF_BYTES) {
    throw new LocalPdfError("PDF non valido o superiore a 8 MB.");
  }
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (!looksLikePdf(header)) throw new LocalPdfError("Firma PDF non riconosciuta.");
  // Dynamically load the library only after an explicit user action.
  const [pdfjs, workerModule] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  options.signal?.throwIfAborted();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    enableXfa: false,
    useSystemFonts: false,
  });
  const ocr = createLocalOcr(options);
  const abort = () => {
    void loadingTask.destroy();
  };
  options.signal?.addEventListener("abort", abort, { once: true });
  let ocrPages = 0;
  let pdf: Awaited<typeof loadingTask.promise> | undefined;
  try {
    pdf = await loadingTask.promise;
    if (pdf.numPages < 1 || pdf.numPages > MAX_PDF_PAGES) {
      throw new LocalPdfError("PDF con troppe pagine: massimo 45, seleziona un estratto.");
    }
    const pages: DocumentPage[] = [];
    let textLength = 0;
    for (let n = 1; n <= pdf.numPages; n++) {
      options.signal?.throwIfAborted();
      options.onProgress?.(`Lettura pagina ${n} di ${pdf.numPages}…`);
      const p = await pdf.getPage(n);
      const content = await p.getTextContent();
      const items = content.items
        .filter(
          (item): item is Extract<typeof item, { str: string }> =>
            "str" in item && typeof item.str === "string",
        )
        .map((item) => ({
          str: item.str,
          transform: item.transform,
          hasEOL: item.hasEOL,
        }));
      let text = pdfItemsToLines(items).join("\n");
      if (options.ocr && text.trim().length < 80) {
        if (++ocrPages > 8)
          throw new LocalPdfError("OCR limitato a 8 pagine per documento: seleziona un estratto.");
        try {
          text = await ocr.read(p, n);
        } catch (error) {
          throw new LocalPdfError(error instanceof Error ? error.message : "OCR non riuscito.");
        }
      }
      textLength += text.length;
      if (textLength > MAX_PDF_TEXT) {
        throw new LocalPdfError(
          "PDF troppo esteso: massimo 240.000 caratteri; seleziona un estratto.",
        );
      }
      pages.push({ page: n, text });
      p.cleanup();
    }
    if (!pages.some((p) => p.text.trim())) {
      throw new LocalPdfError(
        "PDF senza testo selezionabile: abilita la lettura OCR delle scansioni.",
      );
    }
    return pages;
  } catch (err) {
    if (err instanceof LocalPdfError) throw err;
    throw new LocalPdfError(
      "Impossibile leggere il PDF: potrebbe essere protetto da password, danneggiato o non supportato.",
    );
  } finally {
    options.signal?.removeEventListener("abort", abort);
    await ocr.destroy();
    await loadingTask.destroy();
  }
}
