/**
 * Builds the structured fact sheet sent to the model. Every number is calculated here
 * by application code (the same functions the dashboard uses) and pre-formatted, so
 * the model never has to do arithmetic on raw records.
 *
 * Contains only shop data and definitions — no participant information, and nothing
 * from the researcher-only materials.
 */
import type { Dataset } from "@/lib/types";
import { compareAmount, compareRate, type AmountComparison, type RateComparison } from "@/lib/metrics/core";
import { formatRange, previousPeriod, type ComparisonMode, type DateRange } from "@/lib/metrics/dates";
import { financialRates, financialTotals, financialTrend, promotionRows } from "@/lib/metrics/financials";
import { productRows } from "@/lib/metrics/products";
import { FUNNEL_RATE_DEFS, funnelCounts, funnelRates } from "@/lib/metrics/funnel";
import { channelRows, paidSummary } from "@/lib/metrics/marketing";
import { analyseExperiment, verdictText } from "@/lib/metrics/experiment";
import { count, money, pct, pp, ratio, signedMoney, signedPct } from "@/lib/format";
import { DEFINITIONS, LIMITATIONS } from "@/lib/definitions";

export type PageId = "overview" | "products" | "journey" | "marketing" | "experiments";

export const PAGE_TITLES: Record<PageId, string> = {
  overview: "Overview",
  products: "Products",
  journey: "Customer journey",
  marketing: "Marketing",
  experiments: "Experiments",
};

function amt(c: AmountComparison) {
  if (c.previous === null) return money(c.current);
  return `${money(c.current)} (previous ${money(c.previous)}; change ${signedMoney(c.change)}${c.pctChange !== null ? `, ${signedPct(c.pctChange)}` : ""})`;
}

function cnt(c: AmountComparison) {
  if (c.previous === null) return count(c.current);
  return `${count(c.current)} (previous ${count(c.previous)}; change ${c.change! >= 0 ? "+" : ""}${count(c.change)}${c.pctChange !== null ? `, ${signedPct(c.pctChange)}` : ""})`;
}

function rate(c: RateComparison, digits = 1) {
  if (c.previous === null) return pct(c.current, digits);
  return `${pct(c.current, digits)} (previous ${pct(c.previous, digits)}; change ${pp(c.ppChange, digits)})`;
}

export interface AiContextInput {
  page: PageId;
  range: DateRange;
  comparison: ComparisonMode;
}

export function buildAiContext(ds: Dataset, input: AiContextInput) {
  const { range } = input;
  const prev = input.comparison === "previous" ? previousPeriod(range) : null;

  // Overview
  const cur = financialTotals(ds, range);
  const curR = financialRates(cur);
  const pt = prev ? financialTotals(ds, prev) : null;
  const ptR = pt ? financialRates(pt) : null;
  const overview = {
    placed_orders: cnt(compareAmount(cur.orders, pt?.orders ?? null)),
    gross_sales: amt(compareAmount(cur.grossSales, pt?.grossSales ?? null)),
    discounts: amt(compareAmount(cur.discounts, pt?.discounts ?? null)),
    refunds: amt(compareAmount(cur.refunds, pt?.refunds ?? null)),
    net_revenue: amt(compareAmount(cur.netRevenue, pt?.netRevenue ?? null)),
    cogs: amt(compareAmount(cur.cogs, pt?.cogs ?? null)),
    gross_profit: amt(compareAmount(cur.grossProfit, pt?.grossProfit ?? null)),
    return_handling: amt(compareAmount(cur.returnHandling, pt?.returnHandling ?? null)),
    payment_fees: amt(compareAmount(cur.paymentFees, pt?.paymentFees ?? null)),
    fulfilment: amt(compareAmount(cur.fulfilment, pt?.fulfilment ?? null)),
    contribution_before_marketing: amt(compareAmount(cur.contributionBeforeMarketing, pt?.contributionBeforeMarketing ?? null)),
    marketing_spend: amt(compareAmount(cur.marketingSpend, pt?.marketingSpend ?? null)),
    contribution_after_marketing: amt(compareAmount(cur.contributionAfterMarketing, pt?.contributionAfterMarketing ?? null)),
    average_order_value: amt(compareAmount(curR.averageOrderValue ?? NaN, ptR?.averageOrderValue ?? null)),
    gross_margin: rate(compareRate(curR.grossMargin, ptR?.grossMargin)),
    discount_rate_of_gross_sales: rate(compareRate(curR.discountRate, ptR?.discountRate)),
    contribution_margin_before_marketing: rate(compareRate(curR.contributionMarginBeforeMarketing, ptR?.contributionMarginBeforeMarketing)),
  };
  const trend = financialTrend(ds, range).map((b) => ({
    period: `${b.label}${b.partial ? " (partial)" : ""}`,
    orders: b.totals.orders,
    net_revenue: money(b.totals.netRevenue),
    gross_profit: money(b.totals.grossProfit),
    gross_margin: pct(b.rates.grossMargin),
    discounts: money(b.totals.discounts),
    refunds: money(b.totals.refunds),
    marketing_spend: money(b.totals.marketingSpend),
    contribution_after_marketing: money(b.totals.contributionAfterMarketing),
  }));

  const promotions = promotionRows(ds, range).map((r) => ({
    promotion: r.promotionId || "No promotion",
    orders: count(r.orders),
    gross_sales: money(r.grossSales),
    discounts: money(r.discounts),
    discount_rate_of_gross_sales: pct(r.discountRate),
    net_revenue: money(r.netRevenue),
    gross_profit: money(r.grossProfit),
    gross_margin: pct(r.grossMargin),
  }));

  // Products
  const pr = productRows(ds, range);
  const pp_ = prev ? productRows(ds, prev) : null;
  const products = pr.map((r) => {
    const p = pp_?.find((x) => x.productId === r.productId) ?? null;
    return {
      product: `${r.name} (${r.productId})`,
      list_price: money(r.listPrice),
      unit_cost: money(r.unitCost),
      units_dispatched: cnt(compareAmount(r.units, p?.units ?? null)),
      returned_units: count(r.returnedUnits),
      unit_return_rate: rate(compareRate(r.returnRate, p?.returnRate)),
      discounts: money(r.discounts),
      discount_rate_of_gross_sales: rate(compareRate(r.discountRate, p?.discountRate)),
      refunds: money(r.refunds),
      net_revenue: amt(compareAmount(r.netRevenue, p?.netRevenue ?? null)),
      gross_profit: amt(compareAmount(r.grossProfit, p?.grossProfit ?? null)),
      gross_margin: rate(compareRate(r.grossMargin, p?.grossMargin)),
      return_handling_cost: money(r.returnHandling),
      share_of_net_revenue: pct(r.revenueShare),
      share_of_gross_profit: pct(r.grossProfitShare),
      revenue_rank: r.revenueRank,
      gross_profit_rank: r.grossProfitRank,
    };
  });

  // Funnel
  const journey = (["all", "mobile", "desktop"] as const).map((device) => {
    const c = funnelCounts(ds, range, device);
    const r = funnelRates(c);
    const pc = prev ? funnelCounts(ds, prev, device) : null;
    const prr = pc ? funnelRates(pc) : null;
    return {
      device,
      sessions: cnt(compareAmount(c.sessions, pc?.sessions ?? null)),
      sessions_with_basket: cnt(compareAmount(c.basket, pc?.basket ?? null)),
      sessions_with_checkout: cnt(compareAmount(c.checkout, pc?.checkout ?? null)),
      purchasing_sessions: cnt(compareAmount(c.purchases, pc?.purchases ?? null)),
      ...Object.fromEntries(FUNNEL_RATE_DEFS.map((d) => [`${d.label} (${d.numerator} ÷ ${d.denominator})`, rate(compareRate(r[d.key], prr?.[d.key]), 2)])),
    };
  });

  // Marketing
  const ch = channelRows(ds, range);
  const chPrev = prev ? channelRows(ds, prev) : null;
  const marketing = ch.map((r) => {
    const p = chPrev?.find((x) => x.channel === r.channel) ?? null;
    return {
      channel: r.label,
      paid_channel: r.isPaid,
      clicks: r.clicks === null ? "not recorded (unpaid channel)" : count(r.clicks),
      spend: amt(compareAmount(r.spend, p?.spend ?? null)),
      attributed_orders: cnt(compareAmount(r.attributedOrders, p?.attributedOrders ?? null)),
      attributed_net_revenue: amt(compareAmount(r.attributedRevenue, p?.attributedRevenue ?? null)),
      paid_roas: r.isPaid ? `${ratio(r.roas)}${p ? ` (previous ${ratio(p.roas)})` : ""}` : "not applicable",
      cost_per_attributed_order: r.isPaid ? money(r.costPerAttributedOrder) : "not applicable",
      contribution_before_marketing: money(r.contributionBeforeMarketing),
      contribution_after_marketing: amt(compareAmount(r.contributionAfterMarketing, p?.contributionAfterMarketing ?? null)),
    };
  });
  const paid = paidSummary(ch);

  // Experiment (always the full experiment period)
  const e = analyseExperiment(ds);
  const overlap = e.period && !(e.period.end < range.start || e.period.start > range.end);
  const experiment = {
    experiment: e.experimentId,
    experiment_period: e.period ? formatRange(e.period) : "none",
    note: `Analysed over the full experiment period regardless of the dashboard date filter. The selected store period ${overlap ? "overlaps" : "does not overlap"} the experiment.`,
    variants: (["A", "B"] as const).map((v) => {
      const s = e.variants[v];
      return {
        variant: v,
        exposed_visitors: s.visitors,
        banner_clicks: s.clicks,
        purchases: s.purchases,
        click_through_rate: `${pct(s.ctr, 2)} (95% CI ${pct(s.ctrCI?.low, 2)} to ${pct(s.ctrCI?.high, 2)})`,
        purchase_conversion: `${pct(s.conversion, 2)} (95% CI ${pct(s.conversionCI?.low, 2)} to ${pct(s.conversionCI?.high, 2)})`,
      };
    }),
    primary_outcome_purchase_conversion_B_minus_A: `${pp(e.primary.diffPp, 2)} (95% CI ${pp(e.primary.ciPp?.low, 2)} to ${pp(e.primary.ciPp?.high, 2)}); reading: ${verdictText(e.primary).title}`,
    secondary_outcome_click_through_B_minus_A: `${pp(e.secondary.diffPp, 2)} (95% CI ${pp(e.secondary.ciPp?.low, 2)} to ${pp(e.secondary.ciPp?.high, 2)}); reading: ${verdictText(e.secondary).title}`,
    method: e.method,
  };

  return {
    data_status: "SYNTHETIC data for a fictional shop (Willow & Co, skincare). Currency GBP, prices exclude VAT.",
    current_page: PAGE_TITLES[input.page],
    selected_period: formatRange(range),
    comparison_period: prev ? formatRange(prev) : input.comparison === "previous" ? "not available (the preceding period falls outside the data, which starts 1 May 2026)" : "none selected",
    overview,
    overview_trend: trend,
    orders_by_promotion: promotions,
    products,
    product_note: "Payment fees and fulfilment are order-level costs and are not allocated to products, so product profitability is shown at gross-profit level (return handling shown separately).",
    customer_journey: journey,
    marketing,
    paid_channels_combined: { spend: money(paid.spend), attributed_net_revenue: money(paid.revenue), roas: ratio(paid.roas), contribution_after_marketing: money(paid.contributionAfter) },
    experiment,
    definitions: DEFINITIONS,
    limitations: LIMITATIONS,
  };
}
