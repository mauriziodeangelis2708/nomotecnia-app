import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Disclaimer } from "@/components/StatusBadge";
import { dt } from "@/lib/checklist";
import { Plus, FileText, Search, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Clienti — NomotecnIA" },
      {
        name: "description",
        content: "Dashboard clienti e assessment.",
      },
    ],
  }),
  component: Dashboard,
});

const clientSchema = z.object({
  ragione_sociale: z.string().trim().min(2, "Ragione sociale obbligatoria").max(200),
  partita_iva: z.string().trim().max(20).optional(),
  comune: z.string().trim().max(100).optional(),
  referente: z.string().trim().max(150).optional(),
});

function Dashboard() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, assessments(id, title, status, updated_at)")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  function newAssessment(clientId: string) {
    // Non crea nessuna bozza nel database.
    // L'assessment viene salvato solo premendo "Salva".
    nav({
      to: "/assessment/$id",
      params: { id: `new-${clientId}` },
    });
  }

  async function deleteAssessment(id: string) {
    if (!window.confirm("Vuoi eliminare definitivamente questa valutazione?")) {
      return;
    }

    const { error } = await supabase.from("assessments").delete().eq("id", id);

    if (error) {
      toast.error("Errore durante l'eliminazione: " + error.message);
      return;
    }

    toast.success("Valutazione eliminata");
    await qc.invalidateQueries({ queryKey: ["clients"] });
  }

  async function deleteClient(id: string, name: string) {
    const confirmed = window.confirm(
      `Vuoi eliminare definitivamente il cliente "${name}" e tutte le sue valutazioni? Questa operazione non può essere annullata.`,
    );

    if (!confirmed) return;

    const { data, error } = await supabase.from("clients").delete().eq("id", id).select("id");

    if (error) {
      toast.error("Errore durante l'eliminazione: " + error.message);
      return;
    }

    if (!data || data.length === 0) {
      toast.error("Cliente non eliminato. Verifica i permessi.");
      return;
    }

    toast.success("Cliente eliminato");
    await qc.invalidateQueries({ queryKey: ["clients"] });
  }

  const list = (clients.data ?? []).filter(
    (c) =>
      !q || `${c.ragione_sociale} ${c.partita_iva ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Clienti</h1>
          <p className="text-sm text-muted-foreground">
            Avvia una valutazione preliminare per la misura che ti interessa.
          </p>
        </div>

        <NewClient onCreated={() => qc.invalidateQueries({ queryKey: ["clients"] })} />
      </div>

      <Disclaimer />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cerca per ragione sociale o P.IVA"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {clients.isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : clients.error ? (
        <p className="text-sm text-destructive">Errore durante il caricamento dei clienti.</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          Nessun cliente. Crea il primo cliente per avviare un assessment.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{c.ragione_sociale}</h2>
                  <p className="text-xs text-muted-foreground">
                    {[c.partita_iva && `P.IVA ${c.partita_iva}`, c.comune, c.referente]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => newAssessment(c.id)}>
                    <Plus className="h-4 w-4" />
                    Voucher Lazio
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      nav({ to: "/iperammortamento/$id", params: { id: `new-${c.id}` } })
                    }
                  >
                    <Zap className="h-4 w-4" />
                    Iperammortamento 2026
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteClient(c.id, c.ragione_sociale)}
                  >
                    Elimina cliente
                  </Button>
                </div>
              </div>

              <ul className="mt-4 divide-y text-sm">
                {(c.assessments ?? []).length === 0 && (
                  <li className="py-2 text-muted-foreground">Nessun assessment.</li>
                )}

                {(c.assessments ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <Link
                      to={
                        a.title.startsWith("Iperammortamento 2026")
                          ? "/iperammortamento/$id"
                          : "/assessment/$id"
                      }
                      params={{ id: a.id } as never}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      {a.title}
                    </Link>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {a.status} · {dt(a.updated_at)}
                      </span>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteAssessment(a.id)}
                      >
                        Elimina
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewClient({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    ragione_sociale: "",
    partita_iva: "",
    comune: "",
    referente: "",
  });

  async function save() {
    const p = clientSchema.safeParse(f);

    if (!p.success) {
      toast.error(p.error.issues[0]?.message ?? "Dati non validi");
      return;
    }

    const { data: u } = await supabase.auth.getUser();

    if (!u.user) {
      toast.error("Utente non autenticato");
      return;
    }

    const { error } = await supabase.from("clients").insert({
      partita_iva: p.data.partita_iva ?? null,
      comune: p.data.comune ?? null,
      referente: p.data.referente ?? null,
      ragione_sociale: p.data.ragione_sociale,
      created_by: u.user.id,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Cliente creato");
    setOpen(false);
    setF({
      ragione_sociale: "",
      partita_iva: "",
      comune: "",
      referente: "",
    });
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nuovo cliente
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {(["ragione_sociale", "partita_iva", "comune", "referente"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label className="capitalize">{k.replace("_", " ")}</Label>
              <Input
                value={f[k]}
                onChange={(e) =>
                  setF({
                    ...f,
                    [k]: e.target.value,
                  })
                }
              />
            </div>
          ))}

          <Button onClick={save} className="w-full">
            Salva
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
