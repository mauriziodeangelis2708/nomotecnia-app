import { isIntegerQuestion, type Question } from "@/lib/questions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const TRI = [
  { value: "si", label: "Sì" },
  { value: "no", label: "No" },
  { value: "nonso", label: "Non so" },
];

export function QuestionField({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const opts = q.type === "tri" ? TRI : (q.options ?? []);
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{q.label}</Label>
      {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
      {q.type === "text" && (
        <Input
          value={(value as string) ?? ""}
          maxLength={300}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {q.type === "number" && (
        <Input
          type="number"
          min={0}
          step={isIntegerQuestion(q.id) ? 1 : "any"}
          inputMode="decimal"
          className="max-w-xs tabular"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      )}
      {q.type === "textarea" && (
        <Textarea
          rows={3}
          maxLength={4000}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {(q.type === "tri" || q.type === "select") && (
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(value === o.value ? "" : o.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                value === o.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {q.type === "multi" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {opts.map((o) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const on = arr.includes(o.value);
            return (
              <label
                key={o.value}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={on}
                  onCheckedChange={(c) =>
                    onChange(c ? [...arr, o.value] : arr.filter((x) => x !== o.value))
                  }
                />
                {o.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
