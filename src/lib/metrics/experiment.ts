/**
 * Banner experiment (BANNER_01) analysis.
 *
 * Primary outcome (pre-specified in the data dictionary): purchase conversion =
 * purchases ÷ exposed visitors. Secondary: click-through rate = clicks ÷ visitors.
 *
 * Uncertainty: 95% Wilson score intervals for each variant's rate, and the
 * Newcombe hybrid-score interval (Newcombe 1998, method 10) for the difference
 * B − A. Both behave well with small counts, unlike the simple Wald interval.
 *
 * The analysis always uses the complete experiment period. It is not re-cut by the
 * dashboard date filter, because analysing an arbitrary subset of an experiment
 * (e.g. stopping early on a favourable day) inflates false positives.
 */
import type { Dataset } from "@/lib/types";
import { safeRatio } from "./core";

export const Z95 = 1.959963984540054;

export interface Interval {
  low: number;
  high: number;
}

/** Wilson score interval for a binomial proportion. Null when n = 0. */
export function wilson(successes: number, n: number, z = Z95): Interval | null {
  if (n <= 0) return null;
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

/** Newcombe hybrid score interval for p2 − p1 (proportion scale, not pp). */
export function newcombeDiff(x1: number, n1: number, x2: number, n2: number, z = Z95): Interval | null {
  const w1 = wilson(x1, n1, z);
  const w2 = wilson(x2, n2, z);
  if (!w1 || !w2) return null;
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const d = p2 - p1;
  return {
    low: d - Math.sqrt((p2 - w2.low) ** 2 + (w1.high - p1) ** 2),
    high: d + Math.sqrt((w2.high - p2) ** 2 + (p1 - w1.low) ** 2),
  };
}

export interface VariantStats {
  variant: "A" | "B";
  visitors: number;
  clicks: number;
  purchases: number;
  ctr: number | null;
  ctrCI: Interval | null;
  conversion: number | null;
  conversionCI: Interval | null;
  /** Tagged store orders for this variant (reconciliation check). */
  taggedOrders: number;
}

export type Verdict = "evidence_b_higher" | "evidence_a_higher" | "inconclusive" | "no_data";

export interface OutcomeComparison {
  label: string;
  /** B − A in percentage points. */
  diffPp: number | null;
  /** 95% interval for B − A in percentage points. */
  ciPp: Interval | null;
  /** Relative difference (B ÷ A − 1); null when A's rate is zero. */
  relative: number | null;
  verdict: Verdict;
}

export interface ExperimentResult {
  experimentId: string;
  period: { start: string; end: string } | null;
  days: number;
  variants: { A: VariantStats; B: VariantStats };
  primary: OutcomeComparison;
  secondary: OutcomeComparison;
  daily: { date: string; A: { visitors: number; clicks: number; purchases: number }; B: { visitors: number; clicks: number; purchases: number } }[];
  method: string;
}

function verdictFrom(ci: Interval | null): Verdict {
  if (!ci) return "no_data";
  if (ci.low > 0) return "evidence_b_higher";
  if (ci.high < 0) return "evidence_a_higher";
  return "inconclusive";
}

function compare(label: string, xA: number, nA: number, xB: number, nB: number): OutcomeComparison {
  const rA = safeRatio(xA, nA);
  const rB = safeRatio(xB, nB);
  const ci = newcombeDiff(xA, nA, xB, nB);
  return {
    label,
    diffPp: rA !== null && rB !== null ? 100 * (rB - rA) : null,
    ciPp: ci ? { low: 100 * ci.low, high: 100 * ci.high } : null,
    relative: rA && rB !== null ? rB / rA - 1 : null,
    verdict: verdictFrom(ci),
  };
}

export const EXPERIMENT_METHOD =
  "95% Wilson score intervals for each variant's rate; 95% Newcombe hybrid-score interval (method 10) for the difference B − A. " +
  "Assumes random, exclusive allocation and independent visitors, as stated for this simulation. " +
  "No equivalence margin was pre-specified, so the analysis can show a difference or be inconclusive, but cannot establish equivalence.";

export function analyseExperiment(ds: Dataset, experimentId = "BANNER_01"): ExperimentResult {
  const rows = ds.experiments.filter((e) => e.experiment_id === experimentId);
  const acc = { A: { visitors: 0, clicks: 0, purchases: 0 }, B: { visitors: 0, clicks: 0, purchases: 0 } };
  const byDate = new Map<string, ExperimentResult["daily"][number]>();
  for (const r of rows) {
    acc[r.variant].visitors += r.visitors;
    acc[r.variant].clicks += r.clicks;
    acc[r.variant].purchases += r.purchases;
    let d = byDate.get(r.date);
    if (!d) {
      d = { date: r.date, A: { visitors: 0, clicks: 0, purchases: 0 }, B: { visitors: 0, clicks: 0, purchases: 0 } };
      byDate.set(r.date, d);
    }
    d[r.variant].visitors += r.visitors;
    d[r.variant].clicks += r.clicks;
    d[r.variant].purchases += r.purchases;
  }
  const tagged = { A: 0, B: 0 };
  for (const o of ds.orders) {
    if (o.experiment_id === experimentId && (o.experiment_variant === "A" || o.experiment_variant === "B")) tagged[o.experiment_variant] += 1;
  }
  const dates = [...byDate.keys()].sort();
  const stats = (v: "A" | "B"): VariantStats => ({
    variant: v,
    ...acc[v],
    ctr: safeRatio(acc[v].clicks, acc[v].visitors),
    ctrCI: wilson(acc[v].clicks, acc[v].visitors),
    conversion: safeRatio(acc[v].purchases, acc[v].visitors),
    conversionCI: wilson(acc[v].purchases, acc[v].visitors),
    taggedOrders: tagged[v],
  });
  return {
    experimentId,
    period: dates.length ? { start: dates[0], end: dates[dates.length - 1] } : null,
    days: dates.length,
    variants: { A: stats("A"), B: stats("B") },
    primary: compare("Purchase conversion (primary)", acc.A.purchases, acc.A.visitors, acc.B.purchases, acc.B.visitors),
    secondary: compare("Banner click-through rate (secondary)", acc.A.clicks, acc.A.visitors, acc.B.clicks, acc.B.visitors),
    daily: dates.map((d) => byDate.get(d)!),
    method: EXPERIMENT_METHOD,
  };
}

/** Plain-language reading of a comparison, avoiding "winner" language. */
export function verdictText(c: OutcomeComparison): { title: string; body: string } {
  const ci = c.ciPp;
  const range = ci ? `${ci.low.toFixed(2)} to ${ci.high >= 0 ? "+" : ""}${ci.high.toFixed(2)} percentage points` : "";
  switch (c.verdict) {
    case "evidence_b_higher":
      return { title: "Evidence that B is higher", body: `The 95% interval for B − A (${range}) is entirely above zero. This indicates a difference under the stated assumptions; it does not show the size of any long-run effect precisely, or that the difference is commercially meaningful.` };
    case "evidence_a_higher":
      return { title: "Evidence that A is higher", body: `The 95% interval for B − A (${range}) is entirely below zero. This indicates a difference under the stated assumptions; it does not show the size of any long-run effect precisely, or that the difference is commercially meaningful.` };
    case "inconclusive":
      return { title: "Inconclusive", body: `The 95% interval for B − A runs from ${range}. It includes zero, so the data cannot distinguish the variants on this measure. This is not evidence that they are equivalent: the interval still allows differences in either direction, and no equivalence margin was set in advance.` };
    default:
      return { title: "No data", body: "There are no experiment visitors to analyse." };
  }
}
