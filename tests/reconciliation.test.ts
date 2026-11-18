/**
 * Verification of calculations against the supplied records and derived summaries.
 * Run with: npm test
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDataset } from "@/lib/data/parse";
import type { Dataset, DatasetId } from "@/lib/types";
import { CHANNELS } from "@/lib/types";
import { financialTotals, financialRates, financialTrend, revenueBridge } from "@/lib/metrics/financials";
import { productRows, productTotalsAll } from "@/lib/metrics/products";
import { funnelCounts, ordersByDevice, funnelRates } from "@/lib/metrics/funnel";
import { channelRows, channelTotals } from "@/lib/metrics/marketing";
import { analyseExperiment, newcombeDiff, wilson } from "@/lib/metrics/experiment";
import { addDays, buckets, previousPeriod, type DateRange } from "@/lib/metrics/dates";
import { safeRatio, ppDiff } from "@/lib/metrics/core";

const load = (id: DatasetId): Dataset =>
  parseDataset(id, JSON.parse(readFileSync(path.join(__dirname, "..", "data", "datasets", `${id}.json`), "utf8")));

const datasets = { A: load("A"), B: load("B") };
const FULL: DateRange = { start: "2026-05-01", end: "2026-10-31" };
const monthRange = (m: string): DateRange => {
  const [y, mm] = m.split("-").map(Number);
  const end = new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10);
  return { start: `${m}-01`, end };
};

describe.each(["A", "B"] as const)("Dataset %s", (id) => {
  const ds = datasets[id];

  it("monthly financial totals match monthly_summary exactly", () => {
    for (const m of ds.monthlySummary) {
      const t = financialTotals(ds, monthRange(m.month));
      expect(t.orders).toBe(m.orders);
      expect(t.grossSales).toBe(m.gross_sales_pence);
      expect(t.discounts).toBe(m.discount_pence);
      expect(t.refunds).toBe(m.refund_pence);
      expect(t.netRevenue).toBe(m.net_revenue_pence);
      expect(t.cogs).toBe(m.cogs_pence);
      expect(t.grossProfit).toBe(m.gross_profit_pence);
      expect(t.returnHandling).toBe(m.return_handling_pence);
      expect(t.paymentFees).toBe(m.payment_fee_pence);
      expect(t.fulfilment).toBe(m.fulfilment_cost_pence);
      expect(t.contributionBeforeMarketing).toBe(m.contribution_before_marketing_pence);
      expect(t.marketingSpend).toBe(m.marketing_spend_pence);
      expect(t.contributionAfterMarketing).toBe(m.contribution_after_marketing_pence);
    }
  });

  it("full-period totals equal the sum of monthly summaries; monthly trend buckets match", () => {
    const t = financialTotals(ds, FULL);
    const sum = (f: keyof Dataset["monthlySummary"][number]) => ds.monthlySummary.reduce((s, m) => s + (m[f] as number), 0);
    expect(t.netRevenue).toBe(sum("net_revenue_pence"));
    expect(t.contributionAfterMarketing).toBe(sum("contribution_after_marketing_pence"));
    const trend = financialTrend(ds, FULL);
    expect(trend.map((b) => b.key)).toEqual(ds.monthlySummary.map((m) => m.month));
    trend.forEach((b, i) => expect(b.totals.netRevenue).toBe(ds.monthlySummary[i].net_revenue_pence));
  });

  it("formula identities hold for every order and line", () => {
    for (const o of ds.orders) {
      expect(o.net_revenue_pence).toBe(o.gross_sales_pence - o.discount_pence - o.refund_pence);
      expect(o.gross_profit_pence).toBe(o.net_revenue_pence - o.cogs_pence);
      expect(o.contribution_before_marketing_pence).toBe(o.gross_profit_pence - o.return_handling_pence - o.payment_fee_pence - o.fulfilment_cost_pence);
    }
    for (const l of ds.orderItems) {
      expect(l.net_revenue_pence).toBe(l.gross_sales_pence - l.discount_pence - l.refund_pence);
      expect(l.returned_quantity).toBeLessThanOrEqual(l.quantity);
    }
  });

  it("revenue bridge steps sum to each subtotal", () => {
    const t = financialTotals(ds, FULL);
    let running = 0;
    for (const s of revenueBridge(t)) {
      if (s.kind === "start") running = s.amount;
      else if (s.kind === "deduction") running += s.amount;
      else expect(running).toBe(s.amount);
    }
  });

  it("product monthly metrics match product_monthly_summary; product totals reconcile to orders", () => {
    for (const m of ds.productMonthlySummary) {
      const row = productRows(ds, monthRange(m.month)).find((r) => r.productId === m.product_id)!;
      expect(row.units).toBe(m.quantity);
      expect(row.returnedUnits).toBe(m.returned_quantity);
      expect(row.grossSales).toBe(m.gross_sales_pence);
      expect(row.discounts).toBe(m.discount_pence);
      expect(row.refunds).toBe(m.refund_pence);
      expect(row.netRevenue).toBe(m.net_revenue_pence);
      expect(row.cogs).toBe(m.cogs_pence);
      expect(row.grossProfit).toBe(m.gross_profit_pence);
      expect(row.returnHandling).toBe(m.return_handling_pence);
    }
    const all = productTotalsAll(productRows(ds, FULL));
    const fin = financialTotals(ds, FULL);
    expect(all.netRevenue).toBe(fin.netRevenue);
    expect(all.grossProfit).toBe(fin.grossProfit);
    expect(all.returnHandling).toBe(fin.returnHandling);
  });

  it("order-level costs are not double-counted when orders have several lines", () => {
    // A naive join (each line carrying its order's fulfilment cost) would overstate fulfilment.
    const orderById = new Map(ds.orders.map((o) => [o.order_id, o]));
    const naive = ds.orderItems.reduce((s, l) => s + orderById.get(l.order_id)!.fulfilment_cost_pence, 0);
    const t = financialTotals(ds, FULL);
    expect(ds.orderItems.length).toBeGreaterThan(ds.orders.length);
    expect(naive).toBeGreaterThan(t.fulfilment);
    expect(t.fulfilment).toBe(ds.orders.length * 250);
  });

  it("funnel purchases equal placed orders by date and device", () => {
    const key = (d: string, dev: string) => `${d}|${dev}`;
    const orders = new Map<string, number>();
    for (const o of ds.orders) orders.set(key(o.date, o.device), (orders.get(key(o.date, o.device)) ?? 0) + 1);
    for (const f of ds.funnel) {
      expect(f.purchasing_sessions).toBe(orders.get(key(f.date, f.device)) ?? 0);
      expect(f.sessions_with_basket).toBeLessThanOrEqual(f.sessions);
      expect(f.sessions_with_checkout).toBeLessThanOrEqual(f.sessions_with_basket);
      expect(f.purchasing_sessions).toBeLessThanOrEqual(f.sessions_with_checkout);
    }
    const r: DateRange = { start: "2026-09-15", end: "2026-10-14" };
    const od = ordersByDevice(ds, r);
    expect(funnelCounts(ds, r, "mobile").purchases).toBe(od.mobile);
    expect(funnelCounts(ds, r, "desktop").purchases).toBe(od.desktop);
    expect(funnelCounts(ds, r).purchases).toBe(od.all);
  });

  it("funnel rates use summed numerators/denominators, not averaged daily rates", () => {
    const c = funnelCounts(ds, FULL, "mobile");
    const rates = funnelRates(c);
    expect(rates.checkoutCompletion).toBeCloseTo(c.purchases / c.checkout, 12);
    const daily = ds.funnel.filter((f) => f.device === "mobile").map((f) => f.purchasing_sessions / f.sessions_with_checkout);
    const avgOfDaily = daily.reduce((s, x) => s + x, 0) / daily.length;
    expect(Math.abs(avgOfDaily - (rates.checkoutCompletion as number))).toBeGreaterThan(0); // they differ in general
  });

  it("marketing attribution reconciles to orders (counts, revenue, contribution) per day and channel", () => {
    const key = (d: string, c: string) => `${d}|${c}`;
    const agg = new Map<string, { n: number; rev: number; cbm: number }>();
    for (const o of ds.orders) {
      const k = key(o.date, o.channel);
      const a = agg.get(k) ?? { n: 0, rev: 0, cbm: 0 };
      a.n += 1;
      a.rev += o.net_revenue_pence;
      a.cbm += o.contribution_before_marketing_pence;
      agg.set(k, a);
    }
    for (const m of ds.marketing) {
      const a = agg.get(key(m.date, m.channel)) ?? { n: 0, rev: 0, cbm: 0 };
      expect(m.attributed_orders).toBe(a.n);
      expect(m.attributed_net_revenue_pence).toBe(a.rev);
      expect(m.contribution_before_marketing_pence).toBe(a.cbm);
    }
    const rows = channelRows(ds, FULL);
    const fin = financialTotals(ds, FULL);
    expect(rows.reduce((s, r) => s + r.attributedOrders, 0)).toBe(fin.orders);
    expect(rows.reduce((s, r) => s + r.attributedRevenue, 0)).toBe(fin.netRevenue);
    expect(rows.reduce((s, r) => s + r.spend, 0)).toBe(fin.marketingSpend);
    expect(rows.reduce((s, r) => s + r.contributionAfterMarketing, 0)).toBe(fin.contributionAfterMarketing);
  });

  it("ROAS only for paid channels; unpaid clicks stay blank (null), not zero", () => {
    const rows = channelRows(ds, FULL);
    for (const r of rows) {
      if (r.isPaid) {
        expect(r.roas).toBeCloseTo(r.attributedRevenue / r.spend, 12);
        expect(r.clicks).not.toBeNull();
      } else {
        expect(r.roas).toBeNull();
        expect(r.clicks).toBeNull();
      }
    }
    const t = channelTotals(ds, FULL);
    expect(t.organic_direct.spend).toBe(0);
    expect(CHANNELS.length).toBe(4);
  });

  it("experiment purchases reconcile with tagged orders and fit inside store sessions", () => {
    const e = analyseExperiment(ds);
    expect(e.variants.A.purchases).toBe(e.variants.A.taggedOrders);
    expect(e.variants.B.purchases).toBe(e.variants.B.taggedOrders);
    expect(e.period).toEqual({ start: "2026-08-01", end: "2026-08-14" });
    for (const d of e.daily) {
      const sessions = funnelCounts(ds, { start: d.date, end: d.date }).sessions;
      expect(d.A.visitors + d.B.visitors).toBeLessThanOrEqual(sessions);
      expect(d.A.purchases).toBeLessThanOrEqual(d.A.clicks);
    }
    // Primary difference interval includes zero (as stated in the supplied validation report).
    expect(e.primary.verdict).toBe("inconclusive");
    expect(e.primary.ciPp!.low).toBeLessThan(0);
    expect(e.primary.ciPp!.high).toBeGreaterThan(0);
  });

  it("date filtering: disjoint ranges add up to the whole; empty ranges give guarded rates", () => {
    const a = financialTotals(ds, { start: "2026-05-01", end: "2026-07-17" });
    const b = financialTotals(ds, { start: "2026-07-18", end: "2026-10-31" });
    const all = financialTotals(ds, FULL);
    expect(a.netRevenue + b.netRevenue).toBe(all.netRevenue);
    expect(a.orders + b.orders).toBe(all.orders);
    const none = financialTotals(ds, { start: "2027-01-01", end: "2027-01-31" });
    expect(none.orders).toBe(0);
    expect(financialRates(none).averageOrderValue).toBeNull();
    expect(financialRates(none).grossMargin).toBeNull();
    expect(funnelRates(funnelCounts(ds, { start: "2027-01-01", end: "2027-01-02" })).conversion).toBeNull();
  });
});

describe("dataset switching", () => {
  it("A and B produce different results (no shared/stale state)", () => {
    const a = financialTotals(datasets.A, FULL);
    const b = financialTotals(datasets.B, FULL);
    expect(a.netRevenue).not.toBe(b.netRevenue);
    expect(financialTotals(datasets.A, FULL)).toEqual(a);
  });
});

describe("primitives", () => {
  it("guards zero denominators and computes percentage points", () => {
    expect(safeRatio(5, 0)).toBeNull();
    expect(ppDiff(0.031, 0.025)).toBeCloseTo(0.6, 10);
    expect(ppDiff(null, 0.1)).toBeNull();
  });

  it("Wilson and Newcombe intervals match published worked examples", () => {
    // Newcombe (1998) example: 56/70 vs 48/80 → difference 0.2, 95% CI 0.0524 to 0.3339 (method 10)
    const ci = newcombeDiff(48, 80, 56, 70)!;
    expect(ci.low).toBeCloseTo(0.0524, 3);
    expect(ci.high).toBeCloseTo(0.3339, 3);
    // Wilson 81/263 → 0.2553 to 0.3662
    const w = wilson(81, 263)!;
    expect(w.low).toBeCloseTo(0.2553, 3);
    expect(w.high).toBeCloseTo(0.3662, 3);
    expect(wilson(0, 0)).toBeNull();
  });

  it("previous-period logic only returns fully covered comparison periods", () => {
    expect(previousPeriod({ start: "2026-06-01", end: "2026-06-30" })).toEqual({ start: "2026-05-01", end: "2026-05-31" });
    expect(previousPeriod({ start: "2026-09-01", end: "2026-10-31" })).toEqual({ start: "2026-07-01", end: "2026-08-31" });
    expect(previousPeriod({ start: "2026-10-02", end: "2026-10-31" })).toEqual({ start: "2026-09-02", end: "2026-10-01" });
    expect(previousPeriod({ start: "2026-05-01", end: "2026-05-31" })).toBeNull();
    expect(previousPeriod({ start: "2026-05-01", end: "2026-10-31" })).toBeNull();
  });

  it("weekly buckets are contiguous and flag partial weeks", () => {
    const r = { start: "2026-08-05", end: "2026-09-20" };
    const bs = buckets(r, "week");
    expect(bs[0].start).toBe(r.start);
    expect(bs[bs.length - 1].end).toBe(r.end);
    for (let i = 1; i < bs.length; i++) expect(bs[i].start).toBe(addDays(bs[i - 1].end, 1));
    expect(bs[0].partial).toBe(true);
  });
});
