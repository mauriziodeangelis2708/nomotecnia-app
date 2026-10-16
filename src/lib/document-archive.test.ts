import { describe, expect, it } from "vitest";
import { archiveObjectName, validateArchivePdf } from "./document-archive";

const assessment = "00000000-0000-4000-8000-000000000001";
const document = "00000000-0000-4000-8000-000000000002";
describe("Archivio PDF: limiti e percorsi", () => {
  it("non permette a un nome file di cambiare cartella o introdurre markup", () => {
    const name = archiveObjectName(assessment, "../../<script>cliente</script>.pdf", document);
    expect(name.split("/")).toHaveLength(2);
    expect(name).not.toMatch(/[<>]|\.\./);
  });
  it("rifiuta una pratica nuova o un identificativo non valido", () => {
    expect(() => archiveObjectName("new-example", "test.pdf", document)).toThrow();
    expect(() => archiveObjectName(assessment, "test.pdf", "../escape")).toThrow();
  });
  it("rifiuta file senza firma PDF e file oltre limite anche se chiamati .pdf", async () => {
    const fake = {
      size: 12,
      slice: () => ({ arrayBuffer: async () => new TextEncoder().encode("HTML!").buffer }),
    } as unknown as File;
    await expect(validateArchivePdf(fake)).rejects.toThrow("Firma PDF");
    await expect(validateArchivePdf({ size: 8388609 } as File)).rejects.toThrow("8 MB");
  });
});
