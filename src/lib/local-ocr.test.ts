import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PDFPageProxy } from "pdfjs-dist";
import { createLocalOcr } from "./local-ocr";

const { recognize, terminate, createWorker } = vi.hoisted(() => ({
  recognize: vi.fn(),
  terminate: vi.fn(),
  createWorker: vi.fn(),
}));
vi.mock("tesseract.js", () => ({ OEM: { LSTM_ONLY: 1 }, createWorker }));
beforeEach(() => {
  terminate.mockResolvedValue({});
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});
const page = {
  getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
  render: () => ({ promise: Promise.resolve() }),
} as unknown as PDFPageProxy;
describe("OCR locale", () => {
  it("usa solo risorse della stessa origine e distrugge il worker", async () => {
    recognize.mockResolvedValue({ data: { text: "FACSIMILE INVENTATO", confidence: 96 } });
    createWorker.mockResolvedValue({ recognize, terminate });
    const ocr = createLocalOcr({});
    expect(await ocr.read(page, 1)).toBe("FACSIMILE INVENTATO");
    const config = createWorker.mock.calls[0]![2];
    for (const property of ["workerPath", "corePath", "langPath"])
      expect(new URL(config[property]).origin).toBe(location.origin);
    expect(config.cacheMethod).toBe("none");
    await ocr.destroy();
    expect(terminate).toHaveBeenCalledOnce();
  });
  it("non propone un testo illeggibile come se fosse valido", async () => {
    recognize.mockResolvedValue({ data: { text: "123?", confidence: 20 } });
    createWorker.mockResolvedValue({ recognize, terminate });
    const ocr = createLocalOcr({});
    await expect(ocr.read(page, 1)).rejects.toThrow("poco leggibile");
    await ocr.destroy();
  });
  it("rimuove il gestore di annullamento anche se il rendering fallisce", async () => {
    createWorker.mockResolvedValue({ recognize, terminate });
    const controller = new AbortController();
    const ocr = createLocalOcr({ signal: controller.signal });
    const broken = {
      ...page,
      render: () => ({ promise: Promise.reject(new Error("pagina danneggiata")) }),
    } as unknown as PDFPageProxy;
    await expect(ocr.read(broken, 1)).rejects.toThrow("pagina danneggiata");
    controller.abort();
    await ocr.destroy();
    expect(recognize).not.toHaveBeenCalled();
  });
  it("annulla una lettura pendente e termina il worker", async () => {
    recognize.mockReturnValue(new Promise(() => {}));
    createWorker.mockResolvedValue({ recognize, terminate });
    const controller = new AbortController();
    const ocr = createLocalOcr({ signal: controller.signal });
    const pending = ocr.read(page, 1);
    await vi.waitFor(() => expect(recognize).toHaveBeenCalled());
    controller.abort();
    await expect(pending).rejects.toThrow("annullata");
    await ocr.destroy();
    expect(terminate).toHaveBeenCalledOnce();
  });
  it("annulla l’avvio pendente e chiude un worker arrivato in ritardo", async () => {
    let ready!: (worker: unknown) => void;
    createWorker.mockReturnValue(
      new Promise((resolve) => {
        ready = resolve;
      }),
    );
    const controller = new AbortController();
    const ocr = createLocalOcr({ signal: controller.signal });
    const result = ocr.read(page, 1);
    await vi.waitFor(() => expect(createWorker).toHaveBeenCalled());
    const rejection = expect(result).rejects.toThrow("annullata");
    controller.abort();
    await rejection;
    ready({ recognize, terminate });
    await vi.waitFor(() => expect(terminate).toHaveBeenCalledOnce());
    await ocr.destroy();
    expect(recognize).not.toHaveBeenCalled();
  });
  it("se il modello non si carica restituisce un errore recuperabile", async () => {
    createWorker.mockReturnValue(new Promise(() => {}));
    const ocr = createLocalOcr({});
    const result = ocr.read(page, 1);
    await vi.waitFor(() => expect(createWorker).toHaveBeenCalled());
    const rejection = expect(result).rejects.toThrow("Impossibile avviare");
    createWorker.mock.calls[0]![2].errorHandler(new Error("errore tecnico del modello"));
    await rejection;
    await ocr.destroy();
  });
  it("limita a 60 secondi l’avvio bloccato", async () => {
    vi.useFakeTimers();
    createWorker.mockReturnValue(new Promise(() => {}));
    const ocr = createLocalOcr({});
    const result = ocr.read(page, 1);
    const rejection = expect(result).rejects.toThrow("Avvio OCR troppo lento");
    await vi.advanceTimersByTimeAsync(60001);
    await rejection;
    await ocr.destroy();
  });
  it("limita a 60 secondi una pagina OCR bloccata", async () => {
    vi.useFakeTimers();
    recognize.mockReturnValue(new Promise(() => {}));
    createWorker.mockResolvedValue({ recognize, terminate });
    const ocr = createLocalOcr({});
    const result = ocr.read(page, 1);
    const rejection = expect(result).rejects.toThrow("OCR troppo lento");
    await vi.advanceTimersByTimeAsync(60001);
    await rejection;
    expect(terminate).toHaveBeenCalledOnce();
    await ocr.destroy();
  });
});
