import { cn } from "@/lib/utils";
import { STATUS_LABEL, type Status } from "@/lib/engine";

const STYLE: Record<Status, string> = {
  confermato: "bg-ok-soft text-ok border-ok/30",
  potenziale: "bg-warn-soft text-warn border-warn/30",
  non_ammissibile: "bg-ko-soft text-ko border-ko/30",
  ignoto: "bg-unknown-soft text-unknown border-unknown/30",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function RuleStatusBadge({ status }: { status: string }) {
  const s: Status =
    status === "validata" ? "confermato" : status === "da_confrontare" ? "ignoto" : "potenziale";
  const label =
    status === "validata"
      ? "Validata"
      : status === "da_confrontare"
        ? "Da confrontare"
        : "Da validare";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
        STYLE[s],
      )}
    >
      {label}
    </span>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-foreground",
        className,
      )}
    >
      <strong>Strumento preliminare.</strong> Gli esiti non costituiscono certificazione di
      ammissibilità né garanzia di concessione. Importi e controlli seguono l’Avviso 2026 e le
      appendici. Risposte, documenti e condizioni alla concessione devono essere verificati; nessun
      finanziamento è garantito.
    </p>
  );
}
