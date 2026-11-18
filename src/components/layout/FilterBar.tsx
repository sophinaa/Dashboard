"use client";
import { useEffect, useId, useState } from "react";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { STORE_PERIOD } from "@/lib/data/parse";
import { formatRange, PRESETS, type PresetId } from "@/lib/metrics/dates";
import { Icon } from "@/components/ui/Icon";

/** Global filters. Every page reads the same range and comparison. */
export function FilterBar() {
  const { preset, range, comparison, previous, comparisonUnavailable, setPreset, setCustomRange, setComparison } = useDashboard();
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
    if (end < STORE_PERIOD.start || start > STORE_PERIOD.end) return setError("Shop data covers 1 May – 31 October 2026 only.");
    setError(null);
    setCustomRange({ start, end });
  };

  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
      <div className="flex flex-col">
        <label htmlFor={`${id}-preset`} className="mb-1 text-xs font-medium text-ink-2">
          Date range
        </label>
        <select
          id={`${id}-preset`}
          value={preset}
          onChange={(e) => setPreset(e.target.value as PresetId)}
          className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink"
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {preset === "custom" && (
        <form onSubmit={applyCustom} className="flex flex-wrap items-end gap-2" aria-describedby={error ? `${id}-err` : undefined}>
          <div className="flex flex-col">
            <label htmlFor={`${id}-start`} className="mb-1 text-xs font-medium text-ink-2">
              From
            </label>
            <input id={`${id}-start`} type="date" min={STORE_PERIOD.start} max={STORE_PERIOD.end} value={start} onChange={(e) => setStart(e.target.value)} className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm" />
          </div>
          <div className="flex flex-col">
            <label htmlFor={`${id}-end`} className="mb-1 text-xs font-medium text-ink-2">
              To
            </label>
            <input id={`${id}-end`} type="date" min={STORE_PERIOD.start} max={STORE_PERIOD.end} value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm" />
          </div>
          <button type="submit" className="h-9 rounded-md bg-forest px-3 text-sm font-medium text-white hover:bg-forest-700">
            Apply
          </button>
          {error && (
            <p id={`${id}-err`} role="alert" className="w-full text-xs font-medium text-danger-ink">
              {error}
            </p>
          )}
        </form>
      )}
      <div className="flex flex-col">
        <label htmlFor={`${id}-cmp`} className="mb-1 text-xs font-medium text-ink-2">
          Compare with
        </label>
        <select id={`${id}-cmp`} value={comparison} onChange={(e) => setComparison(e.target.value as "previous" | "none")} className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink">
          <option value="previous">Previous period</option>
          <option value="none">No comparison</option>
        </select>
      </div>
      <p className="flex items-center gap-2 pb-2 text-sm text-ink-2" aria-live="polite">
        <Icon name="calendar" className="h-4 w-4 text-ink-muted" />
        <span>
          <span className="font-medium text-ink">{formatRange(range)}</span>
          {previous && <span className="text-ink-muted"> vs {formatRange(previous)}</span>}
          {comparisonUnavailable && <span className="text-ink-muted"> · no earlier data to compare with</span>}
        </span>
      </p>
    </div>
  );
}
