import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useRules } from "@/hooks/use-rules";
import { evaluate, type Answers } from "@/lib/engine";
import { STEPS } from "@/lib/questions";
import { CHECKLIST, DOC_STATUS, dt, eur } from "@/lib/checklist";
import { QuestionField } from "@/components/QuestionField";
import { ResultView } from "@/components/ResultView";
import { Disclaimer } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, FileDown, Save, History, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assessment/$id")({
  head: () => ({ meta: [{ title: "Assessment — NomotecnIA" }, { name: "description", content: "Wizard di pre-istruttoria." }] }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const isNew = id.startsWith("new-");
  const newClientId = isNew ? id.slice(4) : null;
  const qc = useQueryClient();
  const rules = useRules();
  const a = useQuery({
    queryKey: ["assessment", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from("assessments").select("*, clients(*)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const ev = useQuery({
    queryKey: ["evidences", id],
    enabled: !isNew,
    queryFn: async () => (await supabase.from("evidences").select("*").eq("assessment_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const [answers, setAnswers] = useState<Answers>({});
  const client = useQuery({
  queryKey: ["client", newClientId],
  enabled: isNew && !!newClientId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", newClientId!)
      .single();

    if (error) throw error;
    return data;
  },
});
  const [checklist, setChecklist] = useState<Record<string, { status: string; note?: string }>>({});
  const [title, setTitle] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
  if (isNew && client.data) {
    setAnswers({
      ragione_sociale: client.data.ragione_sociale,
      partita_iva: client.data.partita_iva,
    });
  }
}, [isNew, client.data]);
  useEffect(() => {
    if (a.data) {
      const ans = (a.data.answers as Answers) ?? {};
      setAnswers(Object.keys(ans).length ? ans : { ragione_sociale: a.data.clients?.ragione_sociale, partita_iva: a.data.clients?.partita_iva ?? "" });
      setChecklist((a.data.checklist as Record<string, { status: string }>) ?? {});
      setTitle(a.data.title);
    }
  }, [a.data]);

  const result = useMemo(
    () => (rules.data ? evaluate(answers, rules.data.map, (ev.data ?? []).map((e) => ({ intervention: e.intervention, amount: e.amount === null ? null : Number(e.amount) }))) : null),
    [answers, rules.data, ev.data],
  );

  async function save(silent = false) {
  if (saving) return;
  setSaving(true);
  try {
  const status = result
    ? (result.gateStatus === "non_ammissibile"
        ? "non ammissibile"
        : "in lavorazione")
    : "bozza";

  if (isNew) {
    if (!newClientId || !client.data) {
      toast.error("Azienda non identificata");
      return;
    }

    const { data: u } = await supabase.auth.getUser();

    if (!u.user) {
      toast.error("Utente non autenticato");
      return;
    }

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        client_id: newClientId,
        created_by: u.user.id,
        answers: answers as Json,
        checklist: checklist as Json,
        title,
        status,
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setDirty(false);
    qc.invalidateQueries({ queryKey: ["clients"] });
    toast.success("Assessment creato e salvato");

    nav({
      to: "/assessment/$id",
      params: { id: data.id },
      replace: true,
    });

    return;
  }

  const { error } = await supabase
    .from("assessments")
    .update({
      answers: answers as Json,
      checklist: checklist as Json,
      title,
      status,
    })
    .eq("id", id);

  if (error) {
    toast.error(error.message);
    return;
  }

  setDirty(false);
  qc.invalidateQueries({ queryKey: ["clients"] });

  if (!silent) toast.success("Salvato");
  } finally {
    setSaving(false);
  }
}
  
  async function snapshot() {
    if (isNew) return toast.error("Salva prima il questionario");
    if (dirty) return toast.error("Salva prima le modifiche al questionario");
    if (!result || !rules.data) return;
    const { data: u } = await supabase.auth.getUser();
    const label = prompt("Etichetta valutazione (facoltativa)") ?? "";
    const { error } = await supabase.from("assessment_snapshots").insert({
      assessment_id: id, label, answers: answers as Json, result: result as unknown as Json,
      rules_version: rules.data.list.map((r) => ({ key: r.key, value: r.value, status: r.status, updated_at: (r as unknown as { updated_at: string }).updated_at })) as Json,
      author_id: u.user!.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Valutazione registrata nello storico");
    qc.invalidateQueries({ queryKey: ["snapshots", id] });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({
      tool: "NomotecnIA | Lazio Digital Assessment", disclaimer: "Strumento preliminare, non certificazione di ammissibilità.",
      exported_at: new Date().toISOString(), client: isNew ? client.data : a.data?.clients, assessment: { id, title, answers, checklist },
      result, evidences: ev.data, rules: rules.data?.list,
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = `assessment-${id.slice(0, 8)}.json`; el.click();
    URL.revokeObjectURL(url);
  }

  if (rules.isLoading || (isNew ? client.isLoading : a.isLoading)) return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  if (isNew ? (client.error || !client.data) : (a.error || !a.data)) return <p className="text-sm text-destructive">Assessment o azienda non trovati oppure accesso negato.</p>;

  const set = (k: string, v: unknown) => { setAnswers((p) => ({ ...p, [k]: v })); setDirty(true); };
  const cur = STEPS[step];
  const qs = cur.questions(rules.data!.map).filter((q) => !q.showIf || q.showIf(answers));
  const info = cur.info?.(answers);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/dashboard" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Clienti</Link>
          <h1 className="font-display text-2xl">{isNew ? client.data?.ragione_sociale : a.data?.clients?.ragione_sociale}</h1>
          <Input className="mt-1 h-8 max-w-md text-sm" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={saving} onClick={() => save()} variant={isNew || dirty ? "default" : "outline"}><Save className="h-4 w-4" /> {saving ? "Salvataggio…" : isNew || dirty ? "Salva" : "Salvato"}</Button>
          <Button disabled={isNew || dirty} variant="outline" onClick={snapshot}><History className="h-4 w-4" /> Registra valutazione</Button>
          {!isNew && <Button variant="outline" asChild><Link to="/report/$id" params={{ id }}><FileDown className="h-4 w-4" /> Report PDF</Link></Button>}
          <Button variant="outline" onClick={exportJson}><Download className="h-4 w-4" /> JSON</Button>
        </div>
      </div>
      <Disclaimer />

      <Tabs defaultValue="wizard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="wizard">Questionario</TabsTrigger>
          <TabsTrigger value="esito">Esito</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger disabled={isNew} value="evidenze">Evidenze</TabsTrigger>
          <TabsTrigger disabled={isNew} value="note">Note</TabsTrigger>
          <TabsTrigger disabled={isNew} value="storico">Storico</TabsTrigger>
        </TabsList>

        <TabsContent value="wizard" className="mt-4">
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <ol className="space-y-1 text-sm">
              {STEPS.map((s, i) => (
                <li key={s.id}>
                  <button onClick={() => setStep(i)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left", i === step ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted")}>
                    <span className="tabular text-xs opacity-60">{String(i + 1).padStart(2, "0")}</span> {s.title}
                  </button>
                </li>
              ))}
            </ol>
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold">{cur.title}</h2>
              {cur.intro && <p className="mt-1 text-sm text-muted-foreground">{cur.intro}</p>}
              {info && <p className="mt-3 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">{info}</p>}
              <div className="mt-6 space-y-6">
                {qs.length === 0 && <p className="text-sm text-muted-foreground">Nessuna domanda applicabile in base alle risposte precedenti.</p>}
                {qs.map((q) => <QuestionField key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />)}
              </div>
              <div className="mt-8 flex justify-between">
                <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4" /> Indietro</Button>
                {step < STEPS.length - 1
                  ? <Button onClick={() => setStep(step + 1)}>Avanti <ChevronRight className="h-4 w-4" /></Button>
                  : <Button onClick={() => save()}>Salva questionario</Button>}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="esito" className="mt-4">{result && <ResultView r={result} rules={rules.data!.map} />}</TabsContent>

        <TabsContent value="documenti" className="mt-4">
          <div className="rounded-lg border bg-card">
            {CHECKLIST.map((d) => {
              const c = checklist[d.key] ?? { status: "mancante" };
              return (
                <div key={d.key} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0">
                  <span className="min-w-56 flex-1 text-sm">{d.label}</span>
                  <select className="rounded-md border bg-background px-2 py-1 text-sm" value={c.status}
                    onChange={(e) => { setChecklist({ ...checklist, [d.key]: { ...c, status: e.target.value } }); setDirty(true); }}>
                    {DOC_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <Input className="h-8 max-w-xs text-sm" placeholder="Nota" value={c.note ?? ""}
                    onChange={(e) => { setChecklist({ ...checklist, [d.key]: { ...c, note: e.target.value } }); setDirty(true); }} />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Ricorda di salvare dopo le modifiche.</p>
        </TabsContent>

        <TabsContent value="evidenze" className="mt-4">{!isNew && <Evidences id={id} list={ev.data ?? []} interventions={(result?.interventions ?? []).map((i) => ({ key: i.key, label: i.label }))} />}</TabsContent>
        <TabsContent value="note" className="mt-4">{!isNew && <Notes id={id} />}</TabsContent>
        <TabsContent value="storico" className="mt-4">{!isNew && <Snapshots id={id} />}</TabsContent>
      </Tabs>
    </div>
  );
}

function Evidences({ id, list, interventions }: { id: string; list: { id: string; title: string; kind: string; reference: string | null; amount: number | null; intervention: string | null; description: string | null; created_at: string }[]; interventions: { key: string; label: string }[] }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", kind: "preventivo", reference: "", amount: "", intervention: "", description: "" });
  async function add() {
    if (f.title.trim().length < 2) return toast.error("Titolo obbligatorio");
    const { data: u } = await supabase.auth.getUser();
    const amount = f.amount === "" ? null : Number(f.amount);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return toast.error("Importo non valido");
    const { error } = await supabase.from("evidences").insert({ assessment_id: id, title: f.title.trim().slice(0, 200), kind: f.kind, reference: f.reference.slice(0, 300) || null, amount, intervention: f.intervention || null, description: f.description.slice(0, 2000) || null, author_id: u.user!.id });
    if (error) return toast.error(error.message);
    setF({ title: "", kind: "preventivo", reference: "", amount: "", intervention: "", description: "" });
    qc.invalidateQueries({ queryKey: ["evidences", id] });
  }
  async function del(eid: string) {
    await supabase.from("evidences").delete().eq("id", eid);
    qc.invalidateQueries({ queryKey: ["evidences", id] });
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3">
        <Input placeholder="Titolo evidenza" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <select className="rounded-md border bg-background px-2 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          {["preventivo", "documento", "dichiarazione", "inventario", "verifica", "altro"].map((k) => <option key={k}>{k}</option>)}
        </select>
        <select className="rounded-md border bg-background px-2 text-sm" value={f.intervention} onChange={(e) => setF({ ...f, intervention: e.target.value })}>
          <option value="">— Nessun intervento —</option>
          {interventions.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
        </select>
        <Input placeholder="Riferimento (n. protocollo, file, URL interno)" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <Input type="number" placeholder="Importo documentato (EUR)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <Button onClick={add}>Aggiungi evidenza</Button>
        <Textarea className="md:col-span-3" rows={2} placeholder="Descrizione" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </div>
      <div className="rounded-lg border bg-card divide-y">
        {list.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nessuna evidenza registrata.</p>}
        {list.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-3 p-4 text-sm">
            <div>
              <div className="font-medium">{e.title} <span className="ml-2 text-xs text-muted-foreground">{e.kind}{e.intervention && ` · ${e.intervention}`}</span></div>
              {e.reference && <div className="text-xs text-muted-foreground">Rif. {e.reference}</div>}
              {e.description && <div className="mt-1 text-muted-foreground">{e.description}</div>}
              <div className="text-xs text-muted-foreground">{dt(e.created_at)}</div>
            </div>
            <div className="flex items-center gap-3"><span className="tabular">{eur(e.amount === null ? null : Number(e.amount))}</span>
              <button onClick={() => del(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notes({ id }: { id: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [section, setSection] = useState("");
  const notes = useQuery({ queryKey: ["notes", id], queryFn: async () => (await supabase.from("assessment_notes").select("*").eq("assessment_id", id).order("created_at", { ascending: false })).data ?? [] });
  async function add() {
    if (!body.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("assessment_notes").insert({ assessment_id: id, body: body.trim().slice(0, 4000), section: section || null, author_id: u.user!.id });
    if (error) return toast.error(error.message);
    setBody(""); qc.invalidateQueries({ queryKey: ["notes", id] });
  }
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border bg-card p-4">
        <select className="rounded-md border bg-background px-2 py-1 text-sm" value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="">Generale</option>
          {STEPS.map((s) => <option key={s.id} value={s.title}>{s.title}</option>)}
        </select>
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nuova nota…" />
        <Button onClick={add}>Aggiungi nota</Button>
      </div>
      {(notes.data ?? []).map((n) => (
        <div key={n.id} className="rounded-lg border bg-card p-4 text-sm">
          <div className="text-xs text-muted-foreground">{n.section ?? "Generale"} · {dt(n.created_at)}</div>
          <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
        </div>
      ))}
    </div>
  );
}

function Snapshots({ id }: { id: string }) {
  const s = useQuery({ queryKey: ["snapshots", id], queryFn: async () => (await supabase.from("assessment_snapshots").select("*").eq("assessment_id", id).order("created_at", { ascending: false })).data ?? [] });
  return (
    <div className="rounded-lg border bg-card divide-y">
      {(s.data ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">Nessuna valutazione registrata. Usa "Registra valutazione" per salvare uno storico.</p>}
      {(s.data ?? []).map((x) => {
        const r = x.result as unknown as { totals: { confirmedCapped: number; potentialCapped: number }; gateStatus: string; size: string | null };
        return (
          <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div><div className="font-medium">{x.label || "Valutazione"}</div><div className="text-xs text-muted-foreground">{dt(x.created_at)} · dimensione {r.size ?? "n.d."} · requisiti {r.gateStatus}</div></div>
            <div className="text-right tabular">conf. {eur(r.totals.confirmedCapped)}<br /><span className="text-muted-foreground">pot. {eur(r.totals.potentialCapped)}</span></div>
          </div>
        );
      })}
    </div>
  );
}
