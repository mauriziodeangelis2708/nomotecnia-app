import type { PDFPageProxy } from "pdfjs-dist";
import type { Worker } from "tesseract.js";

export interface LocalReadOptions {
  ocr?: boolean;
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
}

/** One bounded OCR worker per document, destroyed on cancellation and completion. */
export function createLocalOcr(options: LocalReadOptions) {
  let worker: Worker | undefined;
  let stopped = false;
  const stop = () => {
    stopped = true;
    if (worker) void worker.terminate().catch(() => {});
  };
  options.signal?.addEventListener("abort", stop, { once: true });
  return {
    async read(page: PDFPageProxy, number: number): Promise<string> {
      options.signal?.throwIfAborted();
      if (stopped) throw new Error("Lettura annullata.");
      options.onProgress?.(`OCR locale: pagina ${number}…`);
      if (!worker) {
        const { createWorker, OEM } = await import("tesseract.js");
        worker = await createWorker("ita", OEM.LSTM_ONLY, {
          workerPath: new URL("/ocr/v7/worker.min.js", location.origin).href,
          corePath: new URL("/ocr/v7/core", location.origin).href,
          langPath: new URL("/ocr/v7/lang", location.origin).href,
          workerBlobURL: false,
          cacheMethod: "none",
          gzip: true,
          // Never log OCR text or document names.
          errorHandler: () => {},
        });
        if (stopped || options.signal?.aborted) {
          await worker.terminate();
          throw new Error("Lettura annullata.");
        }
      }
      const natural = page.getViewport({ scale: 1 });
      const scale = Math.min(2.5, 2200 / Math.max(natural.width, natural.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      let rejectAbort: (reason: Error) => void = () => {};
      const onAbort = () => rejectAbort(new Error("Lettura annullata."));
      const abort = new Promise<never>((_, reject) => {
        rejectAbort = reject;
      });
      options.signal?.addEventListener("abort", onAbort, { once: true });
      try {
        const reading = (async () => {
          options.signal?.throwIfAborted();
          await page.render({ canvas, viewport }).promise;
          options.signal?.throwIfAborted();
          return worker!.recognize(canvas);
        })();
        const result = await Promise.race([reading, abort]);
        if (!result.data.text.trim() || result.data.confidence < 60) {
          throw new Error(
            "Scansione poco leggibile: usa un originale più nitido o compila manualmente.",
          );
        }
        return result.data.text;
      } finally {
        options.signal?.removeEventListener("abort", onAbort);
        canvas.width = 0;
        canvas.height = 0;
      }
    },
    async destroy() {
      options.signal?.removeEventListener("abort", stop);
      if (!stopped && worker) await worker.terminate();
      worker = undefined;
      stopped = true;
    },
  };
}
