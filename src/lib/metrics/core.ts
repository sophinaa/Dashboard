/**
 * Shared calculation primitives. All money stays in integer pence until display.
 */

/** Ratio with a zero/invalid-denominator guard. Returns null when undefined. */
export function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

/** Percentage-point difference between two rates (0–1 scale): 100 × (b − a). */
export function ppDiff(b: number | null, a: number | null): number | null {
  if (b === null || a === null) return null;
  return 100 * (b - a);
}

/**
 * Percentage change of an amount. Undefined (null) when the base is zero or negative,
 * because a % change from a negative base is not meaningful.
 */
export function pctChange(current: number, previous: number): number | null {
  // Also undefined when the value crosses from positive to negative: "−700%" is not a readable change.
  if (!Number.isFinite(previous) || previous <= 0 || current < 0) return null;
  return (current - previous) / previous;
}

export interface AmountComparison {
  current: number;
  previous: number | null;
  change: number | null;
  pctChange: number | null;
}

export function compareAmount(current: number, previous: number | null): AmountComparison {
  if (previous === null) return { current, previous: null, change: null, pctChange: null };
  return { current, previous, change: current - previous, pctChange: pctChange(current, previous) };
}

export interface RateComparison {
  current: number | null;
  previous: number | null;
  /** Percentage points. */
  ppChange: number | null;
}

export function compareRate(current: number | null, previous: number | null | undefined): RateComparison {
  const prev = previous ?? null;
  return { current, previous: prev, ppChange: ppDiff(current, prev) };
}

export function sumBy<T>(rows: readonly T[], f: (r: T) => number): number {
  let s = 0;
  for (const r of rows) s += f(r);
  return s;
}
