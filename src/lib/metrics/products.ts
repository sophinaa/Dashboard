/**
 * Product metrics, from order_items joined to products by product_id.
 * Only line-level fields are summed. Order-level costs (payment fees, fulfilment)
 * are NOT allocated to products — the data has no allocation rule, so product
 * profitability stops at gross profit (with return handling shown separately).
 */
import type { Dataset } from "@/lib/types";
import { safeRatio } from "./core";
import { buckets, bucketIndexer, inRange, type Bucket, type DateRange } from "./dates";

export interface ProductTotals {
  units: number;
  returnedUnits: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  returnHandling: number;
  orderLines: number;
}

export interface ProductRow extends ProductTotals {
  productId: string;
  name: string;
  listPrice: number;
  unitCost: number;
  /** Returned units ÷ dispatched units (not an order return rate). */
  returnRate: number | null;
  /** Discounts ÷ gross sales. */
  discountRate: number | null;
  /** Gross profit ÷ net revenue. */
  grossMargin: number | null;
  /** Share of the selected period's total net revenue. */
  revenueShare: number | null;
  /** Share of the selected period's total gross profit. */
  grossProfitShare: number | null;
  revenueRank: number;
  grossProfitRank: number;
}

function empty(): ProductTotals {
  return { units: 0, returnedUnits: 0, grossSales: 0, discounts: 0, refunds: 0, netRevenue: 0, cogs: 0, grossProfit: 0, returnHandling: 0, orderLines: 0 };
}

function add(t: ProductTotals, l: Dataset["orderItems"][number]) {
  t.units += l.quantity;
  t.returnedUnits += l.returned_quantity;
  t.grossSales += l.gross_sales_pence;
  t.discounts += l.discount_pence;
  t.refunds += l.refund_pence;
  t.netRevenue += l.net_revenue_pence;
  t.cogs += l.cogs_pence;
  t.grossProfit += l.gross_profit_pence;
  t.returnHandling += l.return_handling_pence;
  t.orderLines += 1;
}

export function productTotalsById(ds: Dataset, range: DateRange): Map<string, ProductTotals> {
  const m = new Map<string, ProductTotals>();
  for (const p of ds.products) m.set(p.product_id, empty());
  for (const l of ds.orderItems) {
    if (!inRange(l.date, range)) continue;
    const t = m.get(l.product_id);
    if (t) add(t, l);
  }
  return m;
}

function rank(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
  const r = new Array<number>(values.length);
  order.forEach(([, i], pos) => (r[i] = pos + 1));
  return r;
}

export function productRows(ds: Dataset, range: DateRange): ProductRow[] {
  const byId = productTotalsById(ds, range);
  const all = [...byId.values()];
  const totalRevenue = all.reduce((s, t) => s + t.netRevenue, 0);
  const totalGp = all.reduce((s, t) => s + t.grossProfit, 0);
  const rows = ds.products.map((p) => {
    const t = byId.get(p.product_id) ?? empty();
    return {
      ...t,
      productId: p.product_id,
      name: p.name,
      listPrice: p.list_price_pence,
      unitCost: p.unit_cost_pence,
      returnRate: safeRatio(t.returnedUnits, t.units),
      discountRate: safeRatio(t.discounts, t.grossSales),
      grossMargin: safeRatio(t.grossProfit, t.netRevenue),
      // Shares are only meaningful when the total is positive.
      revenueShare: totalRevenue > 0 ? t.netRevenue / totalRevenue : null,
      grossProfitShare: totalGp > 0 ? t.grossProfit / totalGp : null,
      revenueRank: 0,
      grossProfitRank: 0,
    };
  });
  const rr = rank(rows.map((r) => r.netRevenue));
  const gr = rank(rows.map((r) => r.grossProfit));
  rows.forEach((r, i) => {
    r.revenueRank = rr[i];
    r.grossProfitRank = gr[i];
  });
  return rows;
}

export function productTotalsAll(rows: ProductTotals[]): ProductTotals & { returnRate: number | null; grossMargin: number | null; discountRate: number | null } {
  const t = empty();
  for (const r of rows) {
    t.units += r.units;
    t.returnedUnits += r.returnedUnits;
    t.grossSales += r.grossSales;
    t.discounts += r.discounts;
    t.refunds += r.refunds;
    t.netRevenue += r.netRevenue;
    t.cogs += r.cogs;
    t.grossProfit += r.grossProfit;
    t.returnHandling += r.returnHandling;
    t.orderLines += r.orderLines;
  }
  return { ...t, returnRate: safeRatio(t.returnedUnits, t.units), grossMargin: safeRatio(t.grossProfit, t.netRevenue), discountRate: safeRatio(t.discounts, t.grossSales) };
}

export interface ProductTrendPoint extends Bucket {
  totals: ProductTotals;
  returnRate: number | null;
  grossMargin: number | null;
  discountRate: number | null;
}

export function productTrend(ds: Dataset, productId: string, range: DateRange, bs: Bucket[] = buckets(range)): ProductTrendPoint[] {
  const idx = bucketIndexer(bs);
  const t = bs.map(() => empty());
  for (const l of ds.orderItems) {
    if (l.product_id !== productId || !inRange(l.date, range)) continue;
    const i = idx(l.date);
    if (i >= 0) add(t[i], l);
  }
  return bs.map((b, i) => ({
    ...b,
    totals: t[i],
    returnRate: safeRatio(t[i].returnedUnits, t[i].units),
    grossMargin: safeRatio(t[i].grossProfit, t[i].netRevenue),
    discountRate: safeRatio(t[i].discounts, t[i].grossSales),
  }));
}
