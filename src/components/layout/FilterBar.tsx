"use client";
import { useEffect, useId, useState } from "react";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { STORE_PERIOD } from "@/lib/data/parse";
import { PRESETS, type PresetId } from "@/lib/metrics/dates";
import { Icon } from "@/components/ui/Icon";

const field = "h-9 rounded-full border-0 bg-panel pl-3.5 pr-8 text-sm font-medium text-ink hover:bg-sunken";

/** Global filters, styled as one pill. Every page reads the same range and comparison. */
export function FilterBar() {
  const { preset, range, comparison, comparisonUnavailable, setPreset, setCustomRange, setComparison } = useDashboard();
  const id = useId();
  const [start, setStart] = useState(range.start);
  const [end, setEnd] = useState(range.end);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStart(range.start);
    setEnd(range.end);
  }, [range]);

  const applyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!start || !end) return setError("Choose both a start and an end date.");
    if (start > end) return setError("The start date must be on or before the end date.");
    if (end < STORE_PERIOD.start || start > STORE_PERIOD.end) return setError("Shop data covers 1 May to 31 October 2026 only.");
    setError(null);
    setCustomRange({ start, end });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 rounded-[1.75rem] border border-line bg-surface p-1.5 pl-4">
        <Icon name="calendar" className="h-4 w-4 text-ink-muted" />
        <label htmlFor={`${id}-preset`} className="text-sm text-ink-muted">
          Dates
        </label>
        <select id={`${id}-preset`} value={preset} onChange={(e) => setPreset(e.target.value as PresetId)} className={field}>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {preset === "custom" && (
          <form onSubmit={applyCustom} className="flex flex-wrap items-center gap-2" aria-describedby={error ? `${id}-err` : undefined}>
            <label htmlFor={`${id}-start`} className="sr-only">
              From
            </label>
            <input id={`${id}-start`} type="date" min={STORE_PERIOD.start} max={STORE_PERIOD.end} value={start} onChange={(e) => setStart(e.target.value)} className="h-9 rounded-full border-0 bg-panel px-3 text-sm" />
            <span className="text-sm text-ink-muted" aria-hidden>
              to
            </span>
            <label htmlFor={`${id}-end`} className="sr-only">
              To
            </label>
            <input id={`${id}-end`} type="date" min={STORE_PERIOD.start} max={STORE_PERIOD.end} value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 rounded-full border-0 bg-panel px-3 text-sm" />
            <button type="submit" className="h-9 rounded-full bg-night px-4 text-sm font-medium text-white hover:bg-night-2">
              Apply
            </button>
          </form>
        )}
        <span aria-hidden className="mx-1 h-5 w-px bg-line" />
        <label htmlFor={`${id}-cmp`} className="text-sm text-ink-muted">
          Compare with
        </label>
        <select id={`${id}-cmp`} value={comparison} onChange={(e) => setComparison(e.target.value as "previous" | "none")} className={field}>
          <option value="previous">Previous period</option>
          <option value="none">No comparison</option>
        </select>
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="pl-4 text-xs font-medium text-danger-ink">
          {error}
        </p>
      )}
      {comparisonUnavailable && !error && <p className="pl-4 text-xs text-ink-muted">No earlier data to compare with: the shop data starts on 1 May 2026.</p>}
    </div>
  );
}
