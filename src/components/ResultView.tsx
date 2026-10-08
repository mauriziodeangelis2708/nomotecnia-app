import type { Result, RuleMap } from "@/lib/engine";
import { SIZE_LABEL } from "@/lib/engine";
import { StatusBadge, RuleStatusBadge } from "@/components/StatusBadge";
import { eur } from "@/lib/checklist";

export function ResultView({ r, rules, compact = false }: { r: Result; rules: RuleMap; compact?: boolean }) {
  const t = r.totals;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Dimensione" value={r.size ? SIZE_LABEL[r.size] : "Non determinata"} badge={<StatusBadge status={r.sizeStatus} />} />
        <Kpi label="Valore teorico confermato" value={eur(t.confirmedCapped)} hint={t.cap ? `Massimale ${eur(t.cap)}` : "Massimale n.d."} />
        <Kpi label="Valore teorico incl. potenziali" value={eur(t.potentialCapped)} hint="Non è un contributo attribuito" />
        <Kpi label="Valore documentato" value={eur(t.documented)} hint="Da evidenze registrate" />
      </div>
      <div className="rounded-lg border bg-card p-4 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium">Soglia minima {eur(t.minimum)}:</span>
          {t.meetsMinimumConfirmed ? <StatusBadge status="confermato" /> : t.meetsMinimumPotential ? <StatusBadge status="potenziale" /> : <StatusBadge status="non_ammissibile" />}
          <span className="text-muted-foreground">
            {t.meetsMinimumConfirmed ? "raggiunta con interventi confermati" : t.meetsMinimumPotential ? "raggiungibile solo includendo interventi potenziali" : "non raggiunta"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-medium">Punteggio:</span>
          <span className="rounded-full border border-warn/30 bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
            {r.score.status === "da_verificare" ? "Da verificare" : "Formula validata"}
          </span>
          <span className="text-muted-foreground">{r.score.note}</span>
        </div>
      </div>

      <Section title="Requisiti soggettivi" status={r.gateStatus}>
        {r.gates.map((g) => <Row key={g.key} label={g.label} status={g.status} reasons={g.reasons} ruleKeys={g.ruleKeys} rules={rules} compact={compact} />)}
      </Section>

      <Section title="Interventi">
        {r.interventions.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nessun intervento di interesse indicato.</p>}
        {r.interventions.map((i) => (
          <Row key={i.key} label={i.label} status={i.status} reasons={i.reasons} ruleKeys={i.ruleKeys} rules={rules} compact={compact}
            right={<div className="text-right text-sm"><div className="tabular">{i.status === "non_ammissibile" ? "—" : eur(i.theoretical)}</div><div className="text-xs text-muted-foreground">doc. {eur(i.documented)}</div></div>} />
        ))}
      </Section>

      {r.warnings.length > 0 && (
        <ul className="list-disc space-y-1 rounded-lg border border-warn/30 bg-warn-soft p-4 pl-8 text-sm">
          {r.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value, hint, badge }: { label: string; value: string; hint?: string; badge?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-xl font-semibold tabular">{value} {badge}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
function Section({ title, status, children }: { title: string; status?: Result["gateStatus"]; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3"><h3 className="font-semibold">{title}</h3>{status && <StatusBadge status={status} />}</div>
      <div className="divide-y">{children}</div>
    </div>
  );
}
function Row({ label, status, reasons, ruleKeys, rules, right, compact }: { label: string; status: Result["gateStatus"]; reasons: string[]; ruleKeys: string[]; rules: RuleMap; right?: React.ReactNode; compact?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{label}</span><StatusBadge status={status} /></div>
        {reasons.length > 0 && <ul className="text-sm text-muted-foreground">{reasons.map((x) => <li key={x}>· {x}</li>)}</ul>}
        {!compact && ruleKeys.map((k) => rules[k]).filter(Boolean).map((ru) => (
          <div key={ru!.key} className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <RuleStatusBadge status={ru!.status} /> <span>{ru!.label} — {ru!.source}; {ru!.reference}</span>
          </div>
        ))}
      </div>
      {right}
    </div>
  );
}
