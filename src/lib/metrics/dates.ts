/**
 * Date-range handling. Dates are ISO strings (YYYY-MM-DD) and ranges are inclusive.
 * All arithmetic is done in UTC so results do not depend on the viewer's time zone.
 */
import { STORE_PERIOD } from "@/lib/data/parse";

export interface DateRange {
  start: string;
  end: string;
}

export type ComparisonMode = "previous" | "none";

const DAY = 86_400_000;

export function toUtc(d: string): number {
  return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
}

export function fromUtc(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  return fromUtc(toUtc(d) + n * DAY);
}

/** Inclusive day count. */
export function dayCount(r: DateRange): number {
  return Math.round((toUtc(r.end) - toUtc(r.start)) / DAY) + 1;
}

export function inRange(date: string, r: DateRange): boolean {
  return date >= r.start && date <= r.end;
}

export function isValidRange(r: DateRange): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(r.start) && /^\d{4}-\d{2}-\d{2}$/.test(r.end) && r.start <= r.end;
}

/** Clamp a range to the store data period. Returns null when there is no overlap. */
export function clampToStore(r: DateRange): DateRange | null {
  const start = r.start < STORE_PERIOD.start ? STORE_PERIOD.start : r.start;
  const end = r.end > STORE_PERIOD.end ? STORE_PERIOD.end : r.end;
  return start <= end ? { start, end } : null;
}

/** True when the range lies entirely inside the store data period. */
export function fullyCovered(r: DateRange): boolean {
  return r.start >= STORE_PERIOD.start && r.end <= STORE_PERIOD.end;
}

/**
 * The comparison period: the immediately preceding period of equal length, or the
 * preceding calendar month(s) when the selection is whole calendar months.
 * Returns null when it would fall (even partly) outside the data, because a
 * partial comparison period would be misleading.
 */
export function previousPeriod(r: DateRange): DateRange | null {
  let prev: DateRange;
  const startY = +r.start.slice(0, 4);
  const startM = +r.start.slice(5, 7);
  const endY = +r.end.slice(0, 4);
  const endM = +r.end.slice(5, 7);
  const lastOfEndMonth = addDays(fromUtc(Date.UTC(endY, endM, 1)), -1);
  if (r.start.slice(8) === "01" && r.end === lastOfEndMonth) {
    const months = (endY - startY) * 12 + (endM - startM) + 1;
    prev = { start: fromUtc(Date.UTC(startY, startM - 1 - months, 1)), end: addDays(r.start, -1) };
  } else {
    const n = dayCount(r);
    prev = { start: addDays(r.start, -n), end: addDays(r.start, -1) };
  }
  return fullyCovered(prev) ? prev : null;
}

export interface Bucket {
  key: string;
  label: string;
  start: string;
  end: string;
  /** True when the bucket is cut short by the selected range (fewer days than a full bucket). */
  partial: boolean;
}

export type Granularity = "day" | "week" | "month";

export function chooseGranularity(r: DateRange): Granularity {
  const n = dayCount(r);
  if (n <= 31) return "day";
  if (n <= 92) return "week";
  return "month";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(d: string): string {
  return `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]}`;
}

export function longDate(d: string): string {
  return `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
}

export function formatRange(r: DateRange): string {
  if (r.start === r.end) return longDate(r.start);
  if (r.start.slice(0, 4) === r.end.slice(0, 4)) return `${shortDate(r.start)} – ${longDate(r.end)}`;
  return `${longDate(r.start)} – ${longDate(r.end)}`;
}

export function monthLabel(month: string): string {
  return `${MONTHS[+month.slice(5, 7) - 1]} ${month.slice(0, 4)}`;
}

/** Split a range into day, ISO-week (Mon–Sun) or calendar-month buckets. */
export function buckets(r: DateRange, g: Granularity = chooseGranularity(r)): Bucket[] {
  const out: Bucket[] = [];
  if (g === "day") {
    for (let d = r.start; d <= r.end; d = addDays(d, 1)) out.push({ key: d, label: shortDate(d), start: d, end: d, partial: false });
    return out;
  }
  if (g === "week") {
    let d = r.start;
    while (d <= r.end) {
      const dow = (new Date(toUtc(d)).getUTCDay() + 6) % 7; // Monday = 0
      const weekStart = addDays(d, -dow);
      const weekEnd = addDays(weekStart, 6);
      const end = weekEnd < r.end ? weekEnd : r.end;
      const start = d;
      out.push({ key: start, label: `w/c ${shortDate(weekStart)}`, start, end, partial: start !== weekStart || end !== weekEnd });
      d = addDays(end, 1);
    }
    return out;
  }
  let d = r.start;
  while (d <= r.end) {
    const y = +d.slice(0, 4);
    const m = +d.slice(5, 7);
    const monthStart = fromUtc(Date.UTC(y, m - 1, 1));
    const monthEnd = addDays(fromUtc(Date.UTC(y, m, 1)), -1);
    const end = monthEnd < r.end ? monthEnd : r.end;
    out.push({ key: d.slice(0, 7), label: monthLabel(d.slice(0, 7)), start: d, end, partial: d !== monthStart || end !== monthEnd });
    d = addDays(end, 1);
  }
  return out;
}

export function bucketIndexer(bs: Bucket[]): (date: string) => number {
  return (date: string) => {
    // buckets are contiguous and sorted; binary search
    let lo = 0;
    let hi = bs.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (date < bs[mid].start) hi = mid - 1;
      else if (date > bs[mid].end) lo = mid + 1;
      else return mid;
    }
    return -1;
  };
}

export type PresetId = "all" | "2026-05" | "2026-06" | "2026-07" | "2026-08" | "2026-09" | "2026-10" | "last30" | "custom";

export const PRESETS: { id: PresetId; label: string; range?: DateRange }[] = [
  { id: "all", label: "Full period (May – Oct 2026)", range: { start: STORE_PERIOD.start, end: STORE_PERIOD.end } },
  { id: "last30", label: "Last 30 days of data (2 – 31 Oct)", range: { start: "2026-10-02", end: "2026-10-31" } },
  { id: "2026-05", label: "May 2026", range: { start: "2026-05-01", end: "2026-05-31" } },
  { id: "2026-06", label: "June 2026", range: { start: "2026-06-01", end: "2026-06-30" } },
  { id: "2026-07", label: "July 2026", range: { start: "2026-07-01", end: "2026-07-31" } },
  { id: "2026-08", label: "August 2026", range: { start: "2026-08-01", end: "2026-08-31" } },
  { id: "2026-09", label: "September 2026", range: { start: "2026-09-01", end: "2026-09-30" } },
  { id: "2026-10", label: "October 2026", range: { start: "2026-10-01", end: "2026-10-31" } },
  { id: "custom", label: "Custom range" },
];
