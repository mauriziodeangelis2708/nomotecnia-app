import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  archiveDisplayName,
  archiveObjectName,
  DOCUMENT_BUCKET,
  validateArchivePdf,
} from "@/lib/document-archive";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DocumentArchive({ assessmentId }: { assessmentId: string }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const bucket = supabase.storage.from(DOCUMENT_BUCKET);
  const queryKey = ["assessment-documents", assessmentId, page];
  const documents = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await bucket.list(assessmentId, {
        limit: 100,
        offset: page * 100,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw new Error("Impossibile caricare l’archivio. Riprova o verifica i permessi.");
      return (data ?? []).filter((item) => item.id);
    },
  });
  async function upload() {
    if (!file || busy) return;
    if (
      !window.confirm(
        "Archiviare questo PDF nella pratica? L’originale sarà salvato nell’archivio privato e accessibile agli operatori autorizzati sulla pratica. Non verrà marcato come verificato.",
      )
    )
      return;
    setBusy(true);
    try {
      await validateArchivePdf(file);
      const name = archiveObjectName(assessmentId, file.name, crypto.randomUUID());
      const { error } = await bucket.upload(name, file, {
        contentType: "application/pdf",
        cacheControl: "0",
        upsert: false,
      });
      if (error)
        throw new Error(
          "Archiviazione non riuscita. Verifica permessi, spazio disponibile e dimensione del file.",
        );
      setFile(null);
      if (input.current) input.current.value = "";
      await qc.invalidateQueries({ queryKey: ["assessment-documents", assessmentId] });
      toast.success("PDF archiviato nella pratica");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archiviazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }
  async function download(name: string) {
    setBusy(true);
    try {
      const { data, error } = await bucket.download(`${assessmentId}/${name}`);
      if (error || !data) throw new Error("Download non riuscito o accesso negato.");
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = archiveDisplayName(name);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Download non riuscito o accesso negato.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(name: string) {
    if (
      !window.confirm(
        `Eliminare definitivamente ${archiveDisplayName(name)} dall’archivio della pratica?`,
      )
    )
      return;
    setBusy(true);
    try {
      const { error } = await bucket.remove([`${assessmentId}/${name}`]);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["assessment-documents", assessmentId] });
      toast.success("PDF rimosso dall’archivio");
    } catch {
      toast.error("Eliminazione non riuscita. Riprova o verifica i permessi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mb-5 space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Archivio PDF della pratica</h2>
      <p className="text-sm text-muted-foreground">
        Qui puoi conservare visure, bilanci, DURC, certificazioni e altri allegati PDF.
        L’archiviazione salva l’originale nel servizio privato della pratica; non ne certifica
        validità o autenticità. La sola lettura nel riquadro sopra non archivia il file.
      </p>
      <label htmlFor="archive-pdf" className="block text-sm font-medium">
        PDF da archiviare (massimo 8 MB)
      </label>
      <input
        ref={input}
        id="archive-pdf"
        type="file"
        accept="application/pdf,.pdf"
        disabled={busy}
        className="block w-full text-sm"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <Button type="button" disabled={!file || busy} onClick={() => void upload()}>
        Archivia PDF nella pratica
      </Button>
      {busy && (
        <p role="status" className="text-sm">
          Operazione in corso…
        </p>
      )}
      {documents.isLoading && <p role="status">Caricamento archivio…</p>}
      {documents.error && (
        <p role="alert" className="text-sm text-destructive">
          {documents.error.message}
        </p>
      )}
      {!documents.isLoading && !documents.error && documents.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun PDF archiviato.</p>
      )}
      <ul className="space-y-2">
        {documents.data?.map((document) => (
          <li
            key={document.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
          >
            <span className="min-w-0 break-all text-sm">{archiveDisplayName(document.name)}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void download(document.name)}
              >
                Scarica PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void remove(document.name)}
              >
                Elimina PDF
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {(page > 0 || documents.data?.length === 100) && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={page === 0 || busy}
            onClick={() => setPage(page - 1)}
          >
            Precedenti
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={documents.data?.length !== 100 || busy}
            onClick={() => setPage(page + 1)}
          >
            Successivi
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Conserva solo gli allegati necessari. Puoi eliminarli qui; prima di cancellare la pratica o
        il cliente devi rimuovere i relativi originali archiviati. Non è presente una scansione
        antivirus automatica.
      </p>
    </section>
  );
}
