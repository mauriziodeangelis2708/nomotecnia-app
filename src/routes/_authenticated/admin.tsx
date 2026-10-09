import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useRules } from "@/hooks/use-rules";
import type { Rule } from "@/lib/engine";
import { RuleStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin regole — NomotecnIA" },
      { name: "description", content: "Configurazione e revisione delle regole normative." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const me = useMe();
  const rules = useRules();
  if (me.isLoading || rules.isLoading) return <p>Caricamento…</p>;
  if (me.error || rules.error) return <p role="alert">Impossibile verificare accesso o regole.</p>;
  if (!me.data?.isAdmin)
    return <p className="text-sm text-muted-foreground">Sezione riservata agli amministratori.</p>;
  const list = rules.data?.list ?? [];
  const pending = list.filter((r) => r.status !== "validata");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Amministrazione</h1>
        <p className="text-sm text-muted-foreground">
          Configurazione e revisione delle regole. Baseline ufficiale 2026 versionata nel codice. Le
          modifiche al database sono verificate prima di generare importi; valori divergenti
          bloccano il calcolo.
        </p>
      </div>
      <div className="flex gap-3 rounded-lg border border-warn/30 bg-warn-soft p-4 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 text-warn" />
        <div>
          <strong>
            {pending.length} di {list.length} regole
          </strong>{" "}
          richiedono confronto con il testo ufficiale dell'Avviso e delle appendici. La baseline è
          consultabile; gli override salvati nel database richiedono verifica documentale. Impostare
          "Validata" solo dopo verifica documentale, indicando articolo/appendice nel riferimento.
          Particolare attenzione: durata minima Workplace, denominazione delle 5 categorie,
          esclusioni ATECO, massimale de minimis, formula punteggio.
        </div>
      </div>
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Regole</TabsTrigger>
          <TabsTrigger value="users">Soci</TabsTrigger>
          <TabsTrigger value="arch">Architettura</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4 space-y-3">
          {list.map((r) => (
            <RuleEditor key={r.key} rule={r} stored={rules.data!.storedKeys.includes(r.key)} />
          ))}
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <Users />
        </TabsContent>
        <TabsContent value="arch" className="mt-4">
          <div className="space-y-2 rounded-lg border bg-card p-5 text-sm">
            <p>
              <strong>Persistenza:</strong> Supabase per database, autenticazione e policy di
              accesso per record.
            </p>
            <p>
              <strong>Codice:</strong> repository GitHub nomotecnia-app; valutazione in modulo puro
              con baseline ufficiale versionata. Stato di distribuzione e servizi Cloudflare da
              verificare nella relativa configurazione.
            </p>
            <p>
              <strong>Accessi:</strong> ogni lettura/scrittura è filtrata lato server per socio
              autorizzato; i record aziendali sono visibili al socio che li ha creati e agli
              amministratori.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RuleEditor({ rule, stored }: { rule: Rule; stored: boolean }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    value: rule.value?.toString() ?? "",
    value_text: rule.value_text ?? "",
    source: rule.source,
    reference: rule.reference,
    status: rule.status,
    review_notes: rule.review_notes ?? "",
  });
  const [open, setOpen] = useState(false);
  async function save() {
    if (!stored) {
      toast.error(
        "Baseline ufficiale nel codice: modificarla solo con revisione delle fonti e test.",
      );
      return;
    }
    const value = f.value === "" ? null : Number(f.value);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      toast.error("Valore numerico non valido");
      return;
    }
    if (
      f.status === "validata" &&
      /da individuare|non ancora acquisito/i.test(f.reference + f.source)
    ) {
      toast.error("Per validare indicare fonte e riferimento effettivi (articolo/appendice).");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("rules")
      .update({
        value,
        value_text: f.value_text || null,
        source: f.source,
        reference: f.reference,
        status: f.status,
        requires_official_check: f.status !== "validata",
        review_notes: f.review_notes || null,
        updated_by: u.user!.id,
      })
      .eq("key", rule.key);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Regola aggiornata");
    qc.invalidateQueries({ queryKey: ["rules"] });
    setOpen(false);
  }
  return (
    <div className="rounded-lg border bg-card">
      <button
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {rule.category}
          </div>
          <div className="font-medium">{rule.label}</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="tabular">
            {rule.value ?? (rule.value_text ? "testo" : "—")} {rule.unit ?? ""}
          </span>
          <RuleStatusBadge status={rule.status} />
        </div>
      </button>
      {open && (
        <div className="grid gap-3 border-t p-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            Valore numerico
            <Input value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            Stato
            <select
              className="block w-full rounded-md border bg-background px-2 py-2"
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value })}
            >
              <option value="da_validare">Da validare</option>
              <option value="da_confrontare">Da confrontare con testo/appendici</option>
              <option value="validata">Validata</option>
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            Valore testuale
            <Textarea
              rows={2}
              value={f.value_text}
              onChange={(e) => setF({ ...f, value_text: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            Fonte normativa
            <Input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            Riferimento (articolo/appendice)
            <Input
              value={f.reference}
              onChange={(e) => setF({ ...f, reference: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            Note di revisione
            <Textarea
              rows={2}
              value={f.review_notes}
              onChange={(e) => setF({ ...f, review_notes: e.target.value })}
            />
          </label>
          <div className="md:col-span-2">
            <Button disabled={!stored} onClick={save}>
              {stored ? "Salva override" : "Baseline ufficiale consultabile"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      return (p.data ?? []).map((u) => ({
        ...u,
        roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role),
      }));
    },
  });
  async function grant(user_id: string, role: "socio" | "admin") {
    const { error } = await supabase.from("user_roles").insert({ user_id, role });
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }
  async function revoke(user_id: string, role: "socio" | "admin") {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user_id)
      .eq("role", role);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }
  return (
    <div className="divide-y rounded-lg border bg-card">
      {q.error && <p role="alert">Impossibile caricare gli utenti.</p>}
      {(q.data ?? []).map((u) => (
        <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <div className="font-medium">{u.email}</div>
            <div className="text-xs text-muted-foreground">
              {u.roles.length ? u.roles.join(", ") : "In attesa di autorizzazione"}
            </div>
          </div>
          <div className="flex gap-2">
            {u.roles.includes("socio") ? (
              <Button size="sm" variant="outline" onClick={() => revoke(u.id, "socio")}>
                Revoca socio
              </Button>
            ) : (
              <Button size="sm" onClick={() => grant(u.id, "socio")}>
                Autorizza socio
              </Button>
            )}
            {u.roles.includes("admin") ? (
              <Button size="sm" variant="ghost" onClick={() => revoke(u.id, "admin")}>
                Revoca admin
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => grant(u.id, "admin")}>
                Rendi admin
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
