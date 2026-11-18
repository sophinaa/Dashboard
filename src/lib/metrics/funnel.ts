/**
 * Customer-journey (session funnel) metrics from daily_funnel.
 * Each stage is nested in the previous one. Rates are calculated from summed counts.
 */
import type { Dataset, Device } from "@/lib/types";
import { safeRatio } from "./core";
import { buckets, bucketIndexer, inRange, type Bucket, type DateRange } from "./dates";

export type DeviceFilter = Device | "all";

export interface FunnelCounts {
  sessions: number;
  basket: number;
  checkout: number;
  purchases: number;
}

export interface FunnelRates {
  /** Sessions with basket ÷ sessions. */
  basketRate: number | null;
  /** Sessions with checkout ÷ sessions with basket. */
  checkoutStartRate: number | null;
  /** Purchasing sessions ÷ sessions with checkout. */
  checkoutCompletion: number | null;
  /** Purchasing sessions ÷ sessions. */
  conversion: number | null;
}

export const FUNNEL_RATE_DEFS: { key: keyof FunnelRates; label: string; numerator: string; denominator: string }[] = [
  { key: "basketRate", label: "Basket rate", numerator: "Sessions with basket", denominator: "sessions" },
  { key: "checkoutStartRate", label: "Checkout start rate", numerator: "Sessions with checkout", denominator: "sessions with basket" },
  { key: "checkoutCompletion", label: "Checkout completion", numerator: "Purchasing sessions", denominator: "sessions with checkout" },
  { key: "conversion", label: "Store purchase conversion", numerator: "Purchasing sessions", denominator: "all sessions" },
];

export function emptyFunnel(): FunnelCounts {
  return { sessions: 0, basket: 0, checkout: 0, purchases: 0 };
}

function add(c: FunnelCounts, f: Dataset["funnel"][number]) {
  c.sessions += f.sessions;
  c.basket += f.sessions_with_basket;
  c.checkout += f.sessions_with_checkout;
  c.purchases += f.purchasing_sessions;
}

export function funnelRates(c: FunnelCounts): FunnelRates {
  return {
    basketRate: safeRatio(c.basket, c.sessions),
    checkoutStartRate: safeRatio(c.checkout, c.basket),
    checkoutCompletion: safeRatio(c.purchases, c.checkout),
    conversion: safeRatio(c.purchases, c.sessions),
  };
}

export function funnelCounts(ds: Dataset, range: DateRange, device: DeviceFilter = "all"): FunnelCounts {
  const c = emptyFunnel();
  for (const f of ds.funnel) if (inRange(f.date, range) && (device === "all" || f.device === device)) add(c, f);
  return c;
}

export interface FunnelTrendPoint extends Bucket {
  byDevice: Record<DeviceFilter, { counts: FunnelCounts; rates: FunnelRates }>;
}

export function funnelTrend(ds: Dataset, range: DateRange, bs: Bucket[] = buckets(range)): FunnelTrendPoint[] {
  const idx = bucketIndexer(bs);
  const acc = bs.map(() => ({ all: emptyFunnel(), mobile: emptyFunnel(), desktop: emptyFunnel() }));
  for (const f of ds.funnel) {
    if (!inRange(f.date, range)) continue;
    const i = idx(f.date);
    if (i < 0) continue;
    add(acc[i].all, f);
    add(acc[i][f.device], f);
  }
  return bs.map((b, i) => ({
    ...b,
    byDevice: {
      all: { counts: acc[i].all, rates: funnelRates(acc[i].all) },
      mobile: { counts: acc[i].mobile, rates: funnelRates(acc[i].mobile) },
      desktop: { counts: acc[i].desktop, rates: funnelRates(acc[i].desktop) },
    },
  }));
}

/** Placed orders by device in a range (used to reconcile funnel purchases with orders). */
export function ordersByDevice(ds: Dataset, range: DateRange): Record<DeviceFilter, number> {
  const out: Record<DeviceFilter, number> = { all: 0, mobile: 0, desktop: 0 };
  for (const o of ds.orders) {
    if (!inRange(o.date, range)) continue;
    out.all += 1;
    out[o.device] += 1;
  }
  return out;
}
