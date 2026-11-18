/**
 * Store-level financial metrics (Overview page).
 *
 * Order-level costs (payment fees, fulfilment) are summed from the orders table only.
 * Product lines are never joined here, so order costs cannot be double-counted.
 * Marketing spend comes from marketing_daily (the only spend source).
 */
import type { Dataset, Order } from "@/lib/types";
import { safeRatio, sumBy } from "./core";
import { buckets, bucketIndexer, inRange, type Bucket, type DateRange } from "./dates";

export interface FinancialTotals {
  orders: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  returnHandling: number;
  paymentFees: number;
  fulfilment: number;
  contributionBeforeMarketing: number;
  marketingSpend: number;
  contributionAfterMarketing: number;
}

export interface FinancialRates {
  /** Net revenue ÷ placed orders (refunded orders stay in the denominator). */
  averageOrderValue: number | null;
  /** Gross profit ÷ net revenue. */
  grossMargin: number | null;
  /** Contribution before marketing ÷ net revenue. */
  contributionMarginBeforeMarketing: number | null;
  /** Discounts ÷ gross sales. */
  discountRate: number | null;
  /** Refunds ÷ (gross sales − discounts). */
  refundRate: number | null;
}

export function emptyTotals(): FinancialTotals {
  return {
    orders: 0,
    grossSales: 0,
    discounts: 0,
    refunds: 0,
    netRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    returnHandling: 0,
    paymentFees: 0,
    fulfilment: 0,
    contributionBeforeMarketing: 0,
    marketingSpend: 0,
    contributionAfterMarketing: 0,
  };
}

function addOrder(t: FinancialTotals, o: Order) {
  t.orders += 1;
  t.grossSales += o.gross_sales_pence;
  t.discounts += o.discount_pence;
  t.refunds += o.refund_pence;
  t.netRevenue += o.net_revenue_pence;
  t.cogs += o.cogs_pence;
  t.grossProfit += o.gross_profit_pence;
  t.returnHandling += o.return_handling_pence;
  t.paymentFees += o.payment_fee_pence;
  t.fulfilment += o.fulfilment_cost_pence;
  t.contributionBeforeMarketing += o.contribution_before_marketing_pence;
}

function finish(t: FinancialTotals): FinancialTotals {
  t.contributionAfterMarketing = t.contributionBeforeMarketing - t.marketingSpend;
  return t;
}

export function financialTotals(ds: Dataset, range: DateRange): FinancialTotals {
  const t = emptyTotals();
  for (const o of ds.orders) if (inRange(o.date, range)) addOrder(t, o);
  t.marketingSpend = sumBy(
    ds.marketing.filter((m) => inRange(m.date, range)),
    (m) => m.marketing_spend_pence,
  );
  return finish(t);
}

export function financialRates(t: FinancialTotals): FinancialRates {
  return {
    averageOrderValue: safeRatio(t.netRevenue, t.orders),
    grossMargin: safeRatio(t.grossProfit, t.netRevenue),
    contributionMarginBeforeMarketing: safeRatio(t.contributionBeforeMarketing, t.netRevenue),
    discountRate: safeRatio(t.discounts, t.grossSales),
    refundRate: safeRatio(t.refunds, t.grossSales - t.discounts),
  };
}

export interface FinancialBucket extends Bucket {
  totals: FinancialTotals;
  rates: FinancialRates;
}

export function financialTrend(ds: Dataset, range: DateRange, bs: Bucket[] = buckets(range)): FinancialBucket[] {
  const idx = bucketIndexer(bs);
  const totals = bs.map(() => emptyTotals());
  for (const o of ds.orders) {
    if (!inRange(o.date, range)) continue;
    const i = idx(o.date);
    if (i >= 0) addOrder(totals[i], o);
  }
  for (const m of ds.marketing) {
    if (!inRange(m.date, range)) continue;
    const i = idx(m.date);
    if (i >= 0) totals[i].marketingSpend += m.marketing_spend_pence;
  }
  return bs.map((b, i) => {
    const t = finish(totals[i]);
    return { ...b, totals: t, rates: financialRates(t) };
  });
}

/** Steps from gross sales to contribution after marketing (for the bridge chart). */
export interface BridgeStep {
  key: string;
  label: string;
  /** Signed amount in pence (negative = deduction). Subtotals carry the running total. */
  amount: number;
  kind: "start" | "deduction" | "subtotal";
  help: string;
}

export function revenueBridge(t: FinancialTotals): BridgeStep[] {
  return [
    { key: "gross", label: "Gross sales", amount: t.grossSales, kind: "start", help: "Units × undiscounted list price, before discounts and refunds." },
    { key: "disc", label: "Discounts", amount: -t.discounts, kind: "deduction", help: "Discounts given, including on units later returned." },
    { key: "ref", label: "Refunds", amount: -t.refunds, kind: "deduction", help: "Refunds at the discounted price, assigned to the original order date." },
    { key: "net", label: "Net revenue", amount: t.netRevenue, kind: "subtotal", help: "Gross sales − discounts − refunds. Excludes VAT and shipping income." },
    { key: "cogs", label: "Product costs (COGS)", amount: -t.cogs, kind: "deduction", help: "Cost of every dispatched unit; returned skincare is not resold." },
    { key: "gp", label: "Gross profit", amount: t.grossProfit, kind: "subtotal", help: "Net revenue − COGS. Not net profit." },
    { key: "rh", label: "Return handling", amount: -t.returnHandling, kind: "deduction", help: "£1.00 per returned unit." },
    { key: "pay", label: "Payment fees", amount: -t.paymentFees, kind: "deduction", help: "2% of discounted order value + 20p per order; kept after refunds." },
    { key: "ful", label: "Fulfilment", amount: -t.fulfilment, kind: "deduction", help: "£2.50 per order; kept after refunds." },
    { key: "cbm", label: "Contribution before marketing", amount: t.contributionBeforeMarketing, kind: "subtotal", help: "Gross profit − return handling − payment fees − fulfilment." },
    { key: "mkt", label: "Marketing spend", amount: -t.marketingSpend, kind: "deduction", help: "Paid clicks plus £3/day email cost. Excludes staff time." },
    { key: "cam", label: "Contribution after marketing", amount: t.contributionAfterMarketing, kind: "subtotal", help: "Contribution before marketing − marketing spend. Not net profit: rent, salaries, VAT and tax are not included." },
  ];
}

export interface PromotionRow {
  promotionId: string;
  orders: number;
  grossSales: number;
  discounts: number;
  netRevenue: number;
  grossProfit: number;
  discountRate: number | null;
  grossMargin: number | null;
}

/** Orders grouped by promotion_id ("" = no promotion) within the range. */
export function promotionRows(ds: Dataset, range: DateRange): PromotionRow[] {
  const m = new Map<string, PromotionRow>();
  for (const o of ds.orders) {
    if (!inRange(o.date, range)) continue;
    const k = o.promotion_id;
    const r = m.get(k) ?? { promotionId: k, orders: 0, grossSales: 0, discounts: 0, netRevenue: 0, grossProfit: 0, discountRate: null, grossMargin: null };
    r.orders += 1;
    r.grossSales += o.gross_sales_pence;
    r.discounts += o.discount_pence;
    r.netRevenue += o.net_revenue_pence;
    r.grossProfit += o.gross_profit_pence;
    m.set(k, r);
  }
  return [...m.values()]
    .map((r) => ({ ...r, discountRate: safeRatio(r.discounts, r.grossSales), grossMargin: safeRatio(r.grossProfit, r.netRevenue) }))
    .sort((a, b) => (a.promotionId === "" ? 1 : b.promotionId === "" ? -1 : a.promotionId.localeCompare(b.promotionId)));
}
