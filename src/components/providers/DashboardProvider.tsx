"use client";
/**
 * Loads the configured dataset once and holds the global filters (date range and
 * comparison mode). Every page reads from here, so all pages stay consistent under
 * the same filters. The provider is keyed by dataset ID, so switching dataset
 * remounts it and discards all derived state (no stale results).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { parseDataset } from "@/lib/data/parse";
import type { Dataset, DatasetId } from "@/lib/types";
import { clampToStore, previousPeriod, PRESETS, type ComparisonMode, type DateRange, type PresetId } from "@/lib/metrics/dates";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; dataset: Dataset };

interface DashboardState {
  load: LoadState;
  retry: () => void;
  preset: PresetId;
  range: DateRange;
  comparison: ComparisonMode;
  /** The comparison range, or null when comparison is off or unavailable. */
  previous: DateRange | null;
  /** True when comparison is requested but the preceding period is outside the data. */
  comparisonUnavailable: boolean;
  setPreset: (p: PresetId) => void;
  setCustomRange: (r: DateRange) => void;
  setComparison: (c: ComparisonMode) => void;
}

const Ctx = createContext<DashboardState | null>(null);
const FILTER_KEY = "storescope.filters.v1";

const DEFAULT_RANGE = PRESETS.find((p) => p.id === "2026-10")!.range!;

export function DashboardProvider({ datasetId, children }: { datasetId: DatasetId; children: React.ReactNode }) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [preset, setPresetState] = useState<PresetId>("2026-10");
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const [comparison, setComparisonState] = useState<ComparisonMode>("previous");

  // Restore filters for this browser tab only (sessionStorage); never required.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FILTER_KEY);
      if (!raw) return;
      const v = JSON.parse(raw) as { preset: PresetId; range: DateRange; comparison: ComparisonMode };
      const r = clampToStore(v.range);
      if (r) {
        setPresetState(v.preset);
        setRange(r);
      }
      if (v.comparison === "none" || v.comparison === "previous") setComparisonState(v.comparison);
    } catch {
      /* storage unavailable: use defaults */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify({ preset, range, comparison }));
    } catch {
      /* ignore */
    }
  }, [preset, range, comparison]);

  useEffect(() => {
    const ac = new AbortController();
    setLoad({ status: "loading" });
    fetch("/api/dataset", { signal: ac.signal, cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `The shop data could not be loaded (HTTP ${res.status}).`);
        const ds = parseDataset(body.id, body);
        if (ds.id !== datasetId) throw new Error("The dataset changed while loading. Please reload the page.");
        setLoad({ status: "ready", dataset: ds });
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        setLoad({ status: "error", message: e instanceof Error ? e.message : "The shop data could not be loaded." });
      });
    return () => ac.abort();
  }, [datasetId, attempt]);

  const setPreset = useCallback((p: PresetId) => {
    setPresetState(p);
    const r = PRESETS.find((x) => x.id === p)?.range;
    if (r) setRange(r);
  }, []);

  const setCustomRange = useCallback((r: DateRange) => {
    const c = clampToStore(r);
    if (!c) return;
    setPresetState("custom");
    setRange(c);
  }, []);

  const value = useMemo<DashboardState>(() => {
    const prev = comparison === "previous" ? previousPeriod(range) : null;
    return {
      load,
      retry: () => setAttempt((a) => a + 1),
      preset,
      range,
      comparison,
      previous: prev,
      comparisonUnavailable: comparison === "previous" && prev === null,
      setPreset,
      setCustomRange,
      setComparison: setComparisonState,
    };
  }, [load, preset, range, comparison, setPreset, setCustomRange]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDashboard must be used inside DashboardProvider");
  return c;
}

/** For page components rendered only once data is ready. */
export function useDataset(): Dataset {
  const { load } = useDashboard();
  if (load.status !== "ready") throw new Error("Dataset not ready");
  return load.dataset;
}
