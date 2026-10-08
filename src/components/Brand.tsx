import { cn } from "@/lib/utils";

export function Brand({ className, sub = true }: { className?: string; sub?: boolean }) {
  return (
    <div className={cn("leading-tight", className)}>
      <div className="font-display text-xl font-semibold tracking-tight">
        Nomotecn<span className="text-primary">IA</span>
      </div>
      {sub && <div className="text-[11px] uppercase tracking-[0.18em] opacity-70">Lazio Digital Assessment</div>}
    </div>
  );
}
