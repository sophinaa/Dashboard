/**
 * Deterministic "what if" calculations. These are HYPOTHETICAL SCENARIOS, not
 * predictions: each holds everything else in the selected period fixed and states
 * its assumptions explicitly. The model can request them via a tool; the
 * arithmetic happens here, never in the model.
 */
import type { Channel, Dataset } from "@/lib/types";
import { CHANNELS, PAID_CHANNELS } from "@/lib/types";
import { inRange, formatRange, type DateRange } from "@/lib/metrics/dates";
import { financialTotals } from "@/lib/metrics/financials";
import { channelRows, CHANNEL_LABELS } from "@/lib/metrics/marketing";
import { money, pct, ratio, signedMoney } from "@/lib/format";

export interface ScenarioResult {
  title: string;
  period: string;
  assumptions: string[];
  rows: { label: string; actual: string; scenario: string; change: string }[];
  caveat: string;
}

export class ScenarioError extends Error {}

const PAYMENT_PCT = 0.02;
const PAYMENT_FIXED = 20;
const HANDLING_PER_UNIT = 100;

function row(label: string, actual: number, scenario: number) {
  return { label, actual: money(actual), scenario: money(Math.round(scenario)), change: signedMoney(Math.round(scenario - actual)) };
}

/**
 * Discount scenario: every order line in the period carries `discountPercent` instead of
 * its actual discount. Units sold and units returned are held at their actual values.
 */
export function discountScenario(ds: Dataset, range: DateRange, discountPercent: number): ScenarioResult {
  if (!(discountPercent >= 0 && discountPercent <= 90)) throw new ScenarioError("discount_percent must be between 0 and 90");
  const d = discountPercent / 100;
  const actual = financialTotals(ds, range);
  const orderValue = new Map<string, number>();
  let disc = 0;
  let refunds = 0;
  for (const l of ds.orderItems) {
    if (!inRange(l.date, range)) continue;
    const lineDisc = l.gross_sales_pence * d;
    disc += lineDisc;
    refunds += l.returned_quantity * l.unit_list_price_pence * (1 - d);
    orderValue.set(l.order_id, (orderValue.get(l.order_id) ?? 0) + l.gross_sales_pence - lineDisc);
  }
  let fees = 0;
  for (const v of orderValue.values()) fees += Math.round(v * PAYMENT_PCT) + PAYMENT_FIXED;
  const net = actual.grossSales - disc - refunds;
  const gp = net - actual.cogs;
  const cbm = gp - actual.returnHandling - fees - actual.fulfilment;
  const cam = cbm - actual.marketingSpend;
  return {
    title: `Hypothetical: a ${discountPercent}% discount on every order line`,
    period: formatRange(range),
    assumptions: [
      `Every order line in ${formatRange(range)} carries a ${discountPercent}% discount instead of the discount actually given (actual average ${pct(actual.grossSales ? actual.discounts / actual.grossSales : null)} of gross sales).`,
      "The same orders, units, product mix and returned units occur — in reality customers may respond to a different price, and this calculation cannot capture that.",
      "Refunds are recalculated at the new discounted price; payment fees are recalculated at 2% of discounted order value + 20p.",
      "COGS, return handling, fulfilment and marketing spend are unchanged.",
    ],
    rows: [
      row("Discounts", actual.discounts, disc),
      row("Refunds", actual.refunds, refunds),
      row("Net revenue", actual.netRevenue, net),
      row("Gross profit", actual.grossProfit, gp),
      row("Payment fees", actual.paymentFees, fees),
      row("Contribution before marketing", actual.contributionBeforeMarketing, cbm),
      row("Contribution after marketing", actual.contributionAfterMarketing, cam),
    ],
    caveat: "Hypothetical scenario, not a prediction. It shows only the arithmetic effect of a different discount on the same sales; it says nothing about how many people would buy.",
  };
}

/**
 * Return-rate scenario: one product (or all) has `returnRatePercent` of dispatched units
 * returned instead of the actual number. Refund per returned unit = that product's actual
 * average refund per returned unit in the period (or its discounted price if none returned).
 */
export function returnRateScenario(ds: Dataset, range: DateRange, productId: string, returnRatePercent: number): ScenarioResult {
  if (!(returnRatePercent >= 0 && returnRatePercent <= 100)) throw new ScenarioError("return_rate_percent must be between 0 and 100");
  const ids = productId === "all" ? ds.products.map((p) => p.product_id) : [productId];
  if (productId !== "all" && !ds.products.some((p) => p.product_id === productId)) throw new ScenarioError(`Unknown product_id ${productId}`);
  const actual = financialTotals(ds, range);
  let units = 0;
  let returned = 0;
  let refunds = 0;
  let handling = 0;
  let netAfterDiscount = 0;
  for (const l of ds.orderItems) {
    if (!ids.includes(l.product_id) || !inRange(l.date, range)) continue;
    units += l.quantity;
    returned += l.returned_quantity;
    refunds += l.refund_pence;
    handling += l.return_handling_pence;
    netAfterDiscount += l.gross_sales_pence - l.discount_pence;
  }
  if (units === 0) throw new ScenarioError("No units were sold for that selection in the period.");
  const refundPerReturned = returned > 0 ? refunds / returned : netAfterDiscount / units;
  const newReturned = (units * returnRatePercent) / 100;
  const newRefunds = newReturned * refundPerReturned;
  const newHandling = newReturned * HANDLING_PER_UNIT;
  const dRef = newRefunds - refunds;
  const dHand = newHandling - handling;
  const name = productId === "all" ? "all products" : ds.products.find((p) => p.product_id === productId)!.name;
  return {
    title: `Hypothetical: ${name} unit return rate of ${returnRatePercent}%`,
    period: formatRange(range),
    assumptions: [
      `${name}: ${units.toLocaleString("en-GB")} units dispatched in ${formatRange(range)}; actual returns ${returned.toLocaleString("en-GB")} units (${pct(returned / units)}). Scenario: ${newReturned.toFixed(1)} units (${returnRatePercent}%).`,
      `Each returned unit is refunded at ${money(Math.round(refundPerReturned))} (the actual average refund per returned unit in the period) and costs £1.00 to handle.`,
      "Units sold, prices, discounts, COGS (returned skincare is not resold), payment fees and fulfilment are unchanged.",
    ],
    rows: [
      row("Refunds", actual.refunds, actual.refunds + dRef),
      row("Return handling", actual.returnHandling, actual.returnHandling + dHand),
      row("Net revenue", actual.netRevenue, actual.netRevenue - dRef),
      row("Gross profit", actual.grossProfit, actual.grossProfit - dRef),
      row("Contribution after marketing", actual.contributionAfterMarketing, actual.contributionAfterMarketing - dRef - dHand),
    ],
    caveat: "Hypothetical scenario, not a prediction. It does not say whether or how the return rate could be changed, or what that would cost.",
  };
}

/**
 * Marketing-spend scenario. The data cannot say what extra spend would return, so this
 * reports the BREAK-EVEN return needed, and — only if an assumed ROAS is supplied
 * explicitly — the arithmetic result under that stated assumption.
 */
export function spendScenario(ds: Dataset, range: DateRange, channel: Channel, spendChangePercent: number, assumedRoas?: number | null): ScenarioResult {
  if (!CHANNELS.includes(channel)) throw new ScenarioError(`Unknown channel ${channel}`);
  if (!PAID_CHANNELS.includes(channel)) throw new ScenarioError("Spend scenarios are only available for paid channels (paid_search, paid_social).");
  if (!(spendChangePercent >= -100 && spendChangePercent <= 500)) throw new ScenarioError("spend_change_percent must be between −100 and 500");
  const r = channelRows(ds, range).find((x) => x.channel === channel)!;
  if (r.spend === 0 || r.attributedRevenue === 0) throw new ScenarioError("No spend or attributed revenue for that channel in the period.");
  const dSpend = (r.spend * spendChangePercent) / 100;
  const contribRate = r.contributionBeforeMarketing / r.attributedRevenue; // contribution before marketing per £1 attributed revenue
  const breakEvenRoas = contribRate > 0 ? 1 / contribRate : null;
  const assumptions = [
    `${CHANNEL_LABELS[channel]} in ${formatRange(range)}: spend ${money(r.spend)}, attributed net revenue ${money(r.attributedRevenue)}, historical average ROAS ${ratio(r.roas)}.`,
    `A spend change of ${spendChangePercent >= 0 ? "+" : ""}${spendChangePercent}% is ${signedMoney(Math.round(dSpend))} over the same period.`,
    `Historically each £1 of attributed net revenue on this channel left ${pct(contribRate)} as contribution before marketing; the calculation assumes the same proportion for any additional revenue.`,
    breakEvenRoas !== null
      ? `Break-even: additional attributed revenue would need to be at least ${ratio(breakEvenRoas)} the additional spend (${money(Math.round(Math.abs(dSpend) * breakEvenRoas))}) for contribution after marketing not to fall.`
      : "Break-even cannot be calculated because the channel's contribution before marketing was not positive.",
  ];
  const rows = [{ label: "Change in spend", actual: money(r.spend), scenario: money(Math.round(r.spend + dSpend)), change: signedMoney(Math.round(dSpend)) }];
  if (assumedRoas !== undefined && assumedRoas !== null) {
    if (!(assumedRoas >= 0 && assumedRoas <= 50)) throw new ScenarioError("assumed_roas must be between 0 and 50");
    const dRev = dSpend * assumedRoas;
    const dCam = dRev * contribRate - dSpend;
    assumptions.push(`ASSUMED (not from the data): each £1 of spend change moves attributed revenue by £${assumedRoas.toFixed(2)} (ROAS ${ratio(assumedRoas)} on the change).`);
    rows.push(row("Attributed net revenue", r.attributedRevenue, r.attributedRevenue + dRev));
    rows.push(row("Channel contribution after marketing", r.contributionAfterMarketing, r.contributionAfterMarketing + dCam));
  }
  return {
    title: `Hypothetical: ${CHANNEL_LABELS[channel]} spend ${spendChangePercent >= 0 ? "+" : ""}${spendChangePercent}%`,
    period: formatRange(range),
    assumptions,
    rows,
    caveat:
      "Hypothetical scenario, not a prediction. Historical average returns do not show what additional (or reduced) spend would return, and attribution does not prove the channel caused the sales. A bounded test would be needed to learn the real response.",
  };
}
