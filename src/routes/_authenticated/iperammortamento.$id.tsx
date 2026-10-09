import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Disclaimer } from "@/components/StatusBadge";
import {
  assessIperammortamento,
  calculateIperUplift,
  IPER_VERSION,
  type IperAnswers,
} from "@/lib/iperammortamento";
import { ArrowLeft, Save, AlertTriangle, CircleHelp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/iperammortamento/$id")({
  head: () => ({
    meta: [
      { title: "Iperammortamento 2026 — NomotecnIA Assessment Bandi" },
      { name: "description", content: "Pre-assessment dell’Iperammortamento 2026." },
    ],
  }),
  component: IperammortamentoPage,
});

const yesNo = [
  ["si", "Sì"],
  ["no", "No"],
  ["non_so", "Non so"],
] as const;

function IperammortamentoPage() {
  const { id } = Route.useParams();
  const isNew = id.startsWith("new-");
  const clientId = isNew ? id.slice(4) : null;
  const nav = useNavigate();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<IperAnswers>({
    _assessment_type: "iperammortamento_2026",
  });
  const [assessmentId, setAssessmentId] = useState<string | null>(isNew ? null : id);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const company = useQuery({
    queryKey: ["client", clientId],
    enabled: isNew && !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const existing = useQuery({
    queryKey: ["assessment", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from("assessments").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!existing.data) return;
    const saved = existing.data.answers;
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      setAnswers(saved as IperAnswers);
    }
  }, [existing.data]);

  const companyName =
    existing.data?.title.replace(/^Iperammortamento 2026 · /, "") ||
    company.data?.ragione_sociale ||
    "";
  const result = useMemo(() => assessIperammortamento(answers), [answers]);
  const uplift = useMemo(() => {
    const cost =
      typeof answers.costo_ammissibile === "number" ? Math.max(0, answers.costo_ammissibile) : 0;
    return calculateIperUplift(cost);
  }, [answers.costo_ammissibile]);

  function set(key: string, value: string | number | undefined) {
    setAnswers((prev) => ({ ...prev, _assessment_type: "iperammortamento_2026", [key]: value }));
    setDirty(true);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Utente non autenticato");
        return;
      }
      if (isNew) {
        if (!clientId || !company.data) {
          toast.error("Azienda non identificata");
          return;
        }
        const { data, error } = await supabase
          .from("assessments")
          .insert({
            client_id: clientId,
            created_by: userData.user.id,
            answers: answers as Json,
            checklist: {} as Json,
            title: `Iperammortamento 2026 · ${company.data.ragione_sociale}`,
            status:
              result.status === "ostacolo" ? "criticità da verificare" : "pre-assessment in corso",
          })
          .select("id")
          .single();
        if (error) throw error;
        setAssessmentId(data.id);
        setDirty(false);
        await qc.invalidateQueries({ queryKey: ["clients"] });
        toast.success("Pre-assessment salvato");
        nav({ to: "/iperammortamento/$id", params: { id: data.id }, replace: true });
        return;
      }
      const { error } = await supabase
        .from("assessments")
        .update({
          answers: answers as Json,
          status:
            result.status === "ostacolo" ? "criticità da verificare" : "pre-assessment in corso",
        })
        .eq("id", assessmentId ?? id);
      if (error) throw error;
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Pre-assessment salvato");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  if (company.isLoading || existing.isLoading) return <p>Caricamento…</p>;
  if (company.error || existing.error)
    return (
      <p role="alert" className="text-destructive">
        Impossibile caricare i dati dell’azienda o della valutazione.
      </p>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Clienti
            </Link>
          </Button>
          <h1 className="font-display text-3xl">Iperammortamento 2026</h1>
          <p className="mt-1 text-sm text-muted-foreground">{companyName || "Nuova valutazione"}</p>
        </div>
        <Button onClick={() => void save()} disabled={saving || (!isNew && !dirty)}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvataggio…" : "Salva"}
        </Button>
      </div>

      <Disclaimer />

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">1. Impresa e requisiti generali</h2>
        <div className="mt-4 grid gap-5">
          <TriQuestion
            label="Impresa residente in Italia o stabile organizzazione in Italia?"
            value={answers.italia}
            onChange={(v) => set("italia", v)}
          />
          <TriQuestion
            label="L’impresa è in liquidazione/procedura concorsuale o è in corso un procedimento per dichiararla?"
            help="Rispondere Sì se ricorre una delle situazioni escluse dalla disciplina."
            value={answers.procedura_crisi}
            onChange={(v) => set("procedura_crisi", v)}
          />
          <TriQuestion
            label="L’impresa è destinataria di una sanzione interdittiva ai sensi del D.Lgs. 231/2001?"
            value={answers.sanzioni_231}
            onChange={(v) => set("sanzioni_231", v)}
          />
          <TriQuestion
            label="Sono rispettate le norme di sicurezza sul lavoro e gli obblighi contributivi/previdenziali?"
            value={answers.sicurezza_durc}
            onChange={(v) => set("sicurezza_durc", v)}
          />
          <TriQuestion
            label="Il bene è nuovo e strumentale all’attività d’impresa?"
            value={answers.bene_nuovo}
            onChange={(v) => set("bene_nuovo", v)}
          />
          <TriQuestion
            label="È previsto che l’investimento rientri nel periodo agevolabile dal 1° gennaio 2026 al 30 settembre 2028, secondo i criteri applicabili?"
            value={answers.termine}
            onChange={(v) => set("termine", v)}
          />
          <TriQuestion
            label="Sul bene/costo viene richiesto anche il credito d’imposta previsto dall’art. 1, comma 446, L. 207/2024?"
            help="La Legge 199/2025 esclude dall’iperammortamento gli investimenti che beneficiano di quella specifica disposizione. Se non sai se si applica, scegli “Non so” e chiedi verifica al commercialista."
            value={answers.esclusione_446}
            onChange={(v) => set("esclusione_446", v)}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">2. Investimento</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La selezione instrada le domande; la classificazione finale richiede verifica tecnica.
        </p>
        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <Label>Quale investimento vuoi valutare?</Label>
            <select
              className="h-10 w-full max-w-xl rounded-md border bg-background px-3 text-sm"
              value={String(answers.tipo_bene ?? "")}
              onChange={(e) => set("tipo_bene", e.target.value)}
            >
              <option value="">Seleziona…</option>
              <option value="allegato_iv">Bene materiale – Allegato IV</option>
              <option value="allegato_v">Software o bene immateriale – Allegato V</option>
              <option value="energia">Autoproduzione di energia rinnovabile</option>
            </select>
          </div>
          {(answers.tipo_bene === "allegato_iv" || answers.tipo_bene === "allegato_v") && (
            <>
              <TriQuestion
                label="Un tecnico ha verificato che il bene rientra in una voce dell’Allegato IV/V?"
                value={answers.categoria_allegato}
                onChange={(v) => set("categoria_allegato", v)}
              />
              <TriQuestion
                label="Il bene sarà interconnesso al sistema aziendale di gestione della produzione o alla rete di fornitura?"
                value={answers.interconnessione}
                onChange={(v) => set("interconnessione", v)}
              />
              {answers.tipo_bene === "allegato_iv" ? (
                <TriQuestion
                  label="Le caratteristiche tecniche richieste per la specifica categoria di bene sono documentate?"
                  value={answers.requisiti_tecnici}
                  onChange={(v) => set("requisiti_tecnici", v)}
                />
              ) : (
                <TriQuestion
                  label="Il software è funzionale ai processi digitali/operativi contemplati dall’Allegato V, e non soltanto un software generico?"
                  help="La presenza di AI, cloud o low-code nell’elenco non rende da sola agevolabile qualsiasi prodotto o abbonamento."
                  value={answers.funzione_software}
                  onChange={(v) => set("funzione_software", v)}
                />
              )}
            </>
          )}
          {answers.tipo_bene === "energia" && (
            <>
              <div className="space-y-2">
                <Label>Quale tipo di energia produce l’impianto?</Label>
                <select
                  className="h-10 w-full max-w-xl rounded-md border bg-background px-3 text-sm"
                  value={String(answers.tipo_energia ?? "")}
                  onChange={(e) => set("tipo_energia", e.target.value)}
                >
                  <option value="">Seleziona…</option>
                  <option value="elettrica">Energia elettrica</option>
                  <option value="termica">Calore di processo</option>
                  <option value="entrambe">Energia elettrica e calore di processo</option>
                  <option value="non_so">Non lo so</option>
                </select>
              </div>
              <TriQuestion
                label="L’energia prodotta è destinata all’autoconsumo della struttura produttiva?"
                value={answers.autoconsumo}
                onChange={(v) => set("autoconsumo", v)}
              />
              <TriQuestion
                label="La tecnologia e i componenti rispettano i requisiti della misura?"
                help="Per il fotovoltaico sono ammesse solo le categorie di moduli indicate dalla norma."
                value={answers.impianto_ammesso}
                onChange={(v) => set("impianto_ammesso", v)}
              />
              {(answers.tipo_energia === "elettrica" || answers.tipo_energia === "entrambe") && (
                <TriQuestion
                  label="Un tecnico ha verificato il limite del 105% per la produzione elettrica usando i consumi dell’esercizio precedente e le conversioni previste dal decreto?"
                  help="Il limite non si applica indistintamente agli impianti termici. Il calcolo regolamentare può includere consumi equivalenti e fattori di conversione; non usare una semplice stima dei kWh come verifica definitiva."
                  value={answers.dimensionamento}
                  onChange={(v) => set("dimensionamento", v)}
                />
              )}
              {(answers.tipo_energia === "termica" || answers.tipo_energia === "entrambe") && (
                <>
                  <TriQuestion
                    label="Il calore prodotto è destinato esclusivamente al calore di processo?"
                    value={answers.calore_processo}
                    onChange={(v) => set("calore_processo", v)}
                  />
                  <TriQuestion
                    label="Il calore prodotto non è cedibile a terzi?"
                    value={answers.calore_non_cessibile}
                    onChange={(v) => set("calore_non_cessibile", v)}
                  />
                  <TriQuestion
                    label="L’impianto termico è alimentato nelle modalità ammesse dal decreto?"
                    help="Per il calore di processo, l’elettrificazione deve essere alimentata da energia elettrica rinnovabile autoprodotta e autoconsumata, oppure coperta da un contratto di fornitura di energia rinnovabile conforme."
                    value={answers.fonte_termica_ammessa}
                    onChange={(v) => set("fonte_termica_ammessa", v)}
                  />
                </>
              )}
              <TriQuestion
                label="Ubicazione, POD e collegamento alla struttura produttiva sono stati verificati?"
                value={answers.sito_pod}
                onChange={(v) => set("sito_pod", v)}
              />
              <TriQuestion
                label="Sono previsti sistemi di accumulo?"
                value={answers.accumulo}
                onChange={(v) => set("accumulo", v)}
              />
            </>
          )}
          <NumberQuestion
            label="Costo agevolabile stimato per una singola annualità, al netto degli altri contributi (€)"
            help="Facoltativo. Se gli investimenti sono distribuiti su più anni, inserisci il costo della sola annualità considerata. La maggiorazione è una stima teorica, non il risparmio fiscale."
            value={answers.costo_ammissibile}
            onChange={(v) => set("costo_ammissibile", v)}
          />
          {typeof answers.costo_ammissibile === "number" && answers.costo_ammissibile > 0 && (
            <p className="text-sm">
              Maggiorazione teorica sul costo agevolabile (calcolo fino a 20 milioni per annualità):
              <strong> {eur(uplift.amount)}</strong>. Non è un contributo né un credito F24.
              {uplift.capped && " Il calcolo è limitato al massimale di 20 milioni per annualità."}
            </p>
          )}
          <TriQuestion
            label="Ci sono altri contributi o agevolazioni sugli stessi costi?"
            value={answers.altri_aiuti}
            onChange={(v) => set("altri_aiuti", v)}
          />
          {answers.altri_aiuti === "si" && (
            <TriQuestion
              label="Il commercialista ha verificato il cumulo, la base netta e l’assenza di doppio finanziamento delle stesse quote di costo?"
              value={answers.cumulo_verificato}
              onChange={(v) => set("cumulo_verificato", v)}
            />
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">3. Procedura e documenti</h2>
        <p className="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Procedura: comunicazione preventiva per ciascuna struttura produttiva; dopo esito positivo
          GSE, conferma entro 60 giorni e acconto minimo del 20% per ciascun bene; comunicazione di
          completamento dopo l’interconnessione dei beni IV/V e, in ogni caso, entro il 15 novembre
          2028. Per gli impianti FER, il completamento corrisponde alla fine dei lavori. Sono
          inoltre previste comunicazioni periodiche entro il 20 gennaio e il 30 giugno. Verificare
          sempre modelli e istruzioni correnti nella sezione GSE prima dell’invio.
        </p>
        <div className="mt-4 grid gap-5">
          <TriQuestion
            label="È già disponibile la perizia tecnica asseverata con analisi tecnica?"
            value={answers.perizia}
            onChange={(v) => set("perizia", v)}
          />
          <TriQuestion
            label="È già disponibile la certificazione contabile delle spese?"
            value={answers.certificazione_contabile}
            onChange={(v) => set("certificazione_contabile", v)}
          />
          <div className="space-y-2">
            <Label>Fase comunicazioni GSE</Label>
            <select
              className="h-10 w-full max-w-xl rounded-md border bg-background px-3 text-sm"
              value={String(answers.fase_gse ?? "non_avviata")}
              onChange={(e) => set("fase_gse", e.target.value)}
            >
              <option value="non_avviata">Non avviata</option>
              <option value="preventiva">Comunicazione preventiva inviata</option>
              <option value="conferma">Conferma investimento da inviare/inviata</option>
              <option value="completamento">Completamento da comunicare/comunicato</option>
              <option value="periodica">Comunicazioni periodiche</option>
            </select>
          </div>
          {answers.fase_gse === "preventiva" && (
            <TriQuestion
              label="Dopo esito positivo GSE, è stato rispettato/programmato il termine di 60 giorni per la conferma e l’acconto minimo del 20% per ciascun bene?"
              value={answers.conferma_20}
              onChange={(v) => set("conferma_20", v)}
            />
          )}
          {answers.fase_gse === "conferma" && (
            <TriQuestion
              label="La conferma è stata inviata entro 60 giorni dall’esito positivo GSE e l’acconto del 20% è documentato per ciascun bene?"
              value={answers.conferma_20}
              onChange={(v) => set("conferma_20", v)}
            />
          )}
          {answers.fase_gse === "completamento" && (
            <>
              <TriQuestion
                label={
                  answers.tipo_bene === "energia"
                    ? "Sono terminati i lavori dell’impianto e sono verificate le condizioni di entrata in funzione?"
                    : "L’interconnessione è stata effettivamente realizzata?"
                }
                value={answers.completamento_tecnico}
                onChange={(v) => set("completamento_tecnico", v)}
              />
              <TriQuestion
                label="La comunicazione di completamento è stata inviata entro il termine applicabile?"
                value={answers.completamento_invio}
                onChange={(v) => set("completamento_invio", v)}
              />
            </>
          )}
          {answers.fase_gse === "periodica" && (
            <>
              <TriQuestion
                label="La comunicazione annuale entro il 20 gennaio è stata inviata o non è ancora dovuta?"
                value={answers.periodica_gennaio}
                onChange={(v) => set("periodica_gennaio", v)}
              />
              <TriQuestion
                label="Il piano di ammortamento entro il 30 giugno è stato inviato o non è ancora dovuto?"
                value={answers.periodica_giugno}
                onChange={(v) => set("periodica_giugno", v)}
              />
            </>
          )}
          <div className="space-y-2">
            <Label>Note e documenti ancora da chiedere</Label>
            <Textarea
              rows={3}
              maxLength={2000}
              value={String(answers.note ?? "")}
              onChange={(e) => set("note", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2">
          <ResultIcon status={result.status} />
          <h2 className="font-semibold">Esito del pre-assessment</h2>
        </div>
        <p className="mt-2 font-medium">
          {result.status === "ostacolo"
            ? "Possibile ostacolo dichiarato: serve una verifica prima di procedere"
            : result.status === "coerente"
              ? "Nessun ostacolo dichiarato nelle risposte: ammissibilità da verificare"
              : "Valutazione incompleta: servono verifiche o informazioni"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{result.note}</p>
        {result.blockers.length > 0 && (
          <DetailList title="Possibili criteri ostativi dichiarati" items={result.blockers} />
        )}
        {result.missing.length > 0 && (
          <DetailList title="Da verificare o completare" items={result.missing} />
        )}
        {result.checks.length > 0 && (
          <DetailList title="Adempimenti da pianificare" items={result.checks} />
        )}
        <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <p>
            {IPER_VERSION}. Le aliquote di maggiorazione sono applicate per scaglioni alla quota
            d’investimento di ciascuna annualità; la maggiorazione non equivale al risparmio
            d’imposta. La disciplina richiede comunicazioni al GSE e verifiche tecniche, contabili e
            fiscali.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <a
              className="underline"
              href="https://www.mimit.gov.it/it/incentivi/nuovo-piano-transizione-5-0-iperammortamento"
              target="_blank"
              rel="noreferrer"
            >
              Scheda MIMIT
            </a>
            <a
              className="underline"
              href="https://www.mimit.gov.it/images/stories/normativa/allegati/Decreto_-_Iperammortamento_2026_-nf.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Decreto attuativo
            </a>
            <a
              className="underline"
              href="https://www.gse.it/servizi-per-te/imprese/nuovo-piano-transizione-5-0/come-accedere"
              target="_blank"
              rel="noreferrer"
            >
              Procedura aggiornata GSE
            </a>
            <a
              className="underline"
              href="https://www.gazzettaufficiale.it/atto/serie_generale/caricaArticolo?art.codiceRedazionale=25G00212&art.dataPubblicazioneGazzetta=2025-12-30&art.flagTipoArticolo=5&art.idArticolo=1&art.idGruppo=3&art.idSottoArticolo=1&art.idSottoArticolo1=10&art.progressivo=0&art.versione=1"
              target="_blank"
              rel="noreferrer"
            >
              Allegato V · Gazzetta Ufficiale
            </a>
            <a
              className="underline"
              href="https://www.gazzettaufficiale.it/atto/serie_generale/caricaArticolo?art.codiceRedazionale=25G00212&art.dataPubblicazioneGazzetta=2025-12-30&art.flagTipoArticolo=4&art.idArticolo=1&art.idGruppo=3&art.idSottoArticolo=1&art.idSottoArticolo1=10&art.progressivo=0&art.versione=1"
              target="_blank"
              rel="noreferrer"
            >
              Allegato IV · Gazzetta Ufficiale
            </a>
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving || (!isNew && !dirty)}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvataggio…" : "Salva pre-assessment"}
        </Button>
      </div>
    </div>
  );
}

function TriQuestion({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: unknown;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      <div className="flex flex-wrap gap-2">
        {yesNo.map(([v, text]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(value === v ? "" : v)}
            aria-pressed={value === v}
            className={`rounded-md border px-3 py-1.5 text-sm ${value === v ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberQuestion({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: unknown;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      <Input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        className="max-w-xs"
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    </div>
  );
}

function ResultIcon({ status }: { status: string }) {
  if (status === "ostacolo") return <AlertTriangle className="h-5 w-5 text-destructive" />;
  return <CircleHelp className="h-5 w-5 text-muted-foreground" />;
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function eur(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
