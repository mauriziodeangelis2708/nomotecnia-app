import { afterEach, describe, expect, it, vi } from "vitest";
import type { PDFPageProxy } from "pdfjs-dist";
import { createLocalOcr } from "./local-ocr";

const { recognize, terminate, createWorker } = vi.hoisted(() => ({
  recognize: vi.fn(),
  terminate: vi.fn(),
  createWorker: vi.fn(),
}));
vi.mock("tesseract.js", () => ({ OEM: { LSTM_ONLY: 1 }, createWorker }));
afterEach(() => vi.resetAllMocks());
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
});
