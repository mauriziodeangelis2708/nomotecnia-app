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
  let stopInitializing: (() => void) | undefined;
  const stop = () => {
    stopped = true;
    stopInitializing?.();
    if (worker) void worker.terminate().catch(() => {});
  };
  options.signal?.addEventListener("abort", stop, { once: true });
  return {
    async read(page: PDFPageProxy, number: number): Promise<string> {
      options.signal?.throwIfAborted();
      if (stopped) throw new Error("Lettura annullata.");
      options.onProgress?.(`OCR locale: pagina ${number}…`);
      if (!worker) {
        let abandoned = false;
        let rejectInitialization: (reason: Error) => void = () => {};
        const initializationFailed = new Promise<never>((_, reject) => {
          rejectInitialization = reject;
        });
        stopInitializing = () => {
          abandoned = true;
          rejectInitialization(new Error("Lettura annullata."));
        };
        const timeout = setTimeout(() => {
          abandoned = true;
          rejectInitialization(
            new Error("Avvio OCR troppo lento: controlla la connessione e riprova."),
          );
        }, 60000);
        const initializing = (async () => {
          const { createWorker, OEM } = await import("tesseract.js");
          if (abandoned || stopped || options.signal?.aborted)
            throw new Error("Lettura annullata.");
          const ready = await createWorker("ita", OEM.LSTM_ONLY, {
            workerPath: new URL("/ocr/v7/worker.min.js", location.origin).href,
            corePath: new URL("/ocr/v7/core", location.origin).href,
            langPath: new URL("/ocr/v7/lang", location.origin).href,
            workerBlobURL: false,
            cacheMethod: "none",
            gzip: true,
            // Some model-loading errors do not settle Tesseract's initialization promise.
            errorHandler: () => {
              abandoned = true;
              rejectInitialization(
                new Error("Impossibile avviare l’OCR: controlla la connessione e riprova."),
              );
            },
          });
          if (abandoned || stopped || options.signal?.aborted) {
            await ready.terminate();
            throw new Error("Lettura annullata.");
          }
          return ready;
        })();
        try {
          worker = await Promise.race([initializing, initializationFailed]);
        } finally {
          clearTimeout(timeout);
          stopInitializing = undefined;
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
      const deadline = setTimeout(() => {
        stop();
        rejectAbort(
          new Error("OCR troppo lento: usa un estratto più breve o compila manualmente."),
        );
      }, 60000);
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
        clearTimeout(deadline);
        options.signal?.removeEventListener("abort", onAbort);
        canvas.width = 0;
        canvas.height = 0;
      }
    },
    async destroy() {
      options.signal?.removeEventListener("abort", stop);
      stopInitializing?.();
      if (!stopped && worker) await worker.terminate();
      worker = undefined;
      stopped = true;
    },
  };
}
