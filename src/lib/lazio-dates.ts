// Shared calendar and Italian PEC-date interpretation for the Lazio engine and dossier.
export function timestamp(v: unknown): number | null {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)
  )
    return null;
  const day = v.slice(0, 10);
  if (isoDay(day) === null) return null;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : null;
}
export function isoDay(v: unknown): number | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const n = Date.parse(`${v}T00:00:00Z`);
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === v ? n : null;
}
export function calendarMonths(v: number, months: number): number {
  const d = new Date(v),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.getTime();
}
export function romeDay(t: number): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(t));
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return isoDay(`${part("year")}-${part("month")}-${part("day")}`)!;
}
