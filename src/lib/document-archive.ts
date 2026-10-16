export const DOCUMENT_BUCKET = "assessment-documents";
export const MAX_ARCHIVE_BYTES = 8 * 1024 * 1024;

export async function validateArchivePdf(file: File): Promise<void> {
  if (file.size < 5 || file.size > MAX_ARCHIVE_BYTES)
    throw new Error("Seleziona un PDF fino a 8 MB.");
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...header) !== "%PDF-") throw new Error("Firma PDF non riconosciuta.");
}

export function archiveObjectName(assessmentId: string, fileName: string, id: string): string {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(assessmentId) || !uuid.test(id)) throw new Error("Salva prima la pratica.");
  const label =
    fileName
      .replace(/\.pdf$/i, "")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "documento";
  return `${assessmentId}/${id}--${label}.pdf`;
}

export function archiveDisplayName(name: string): string {
  return name.replace(/^[0-9a-f-]{36}--/i, "");
}
