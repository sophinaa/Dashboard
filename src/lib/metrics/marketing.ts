/**
 * Channel metrics from marketing_daily (already aggregated at date × channel grain).
 * Attribution is exclusive, last-assigned simulation attribution — not incrementality.
 */
import { CHANNELS, PAID_CHANNELS, type Channel, type Dataset } from "@/lib/types";
import { safeRatio } from "./core";
import { buckets, bucketIndexer, inRange, type Bucket, type DateRange } from "./dates";

export const CHANNEL_LABELS: Record<Channel, string> = {
  paid_search: "Paid search",
  paid_social: "Paid social",
  email: "Email",
  organic_direct: "Organic / direct",
};

export interface ChannelTotals {
  /** Paid ad clicks; null for channels where clicks are not recorded. */
  clicks: number | null;
  spend: number;
  attributedOrders: number;
  attributedRevenue: number;
  contributionBeforeMarketing: number;
  contributionAfterMarketing: number;
}

export interface ChannelRow extends ChannelTotals {
  channel: Channel;
  label: string;
  isPaid: boolean;
  /** Attributed net revenue ÷ paid ad spend. Only for paid channels. Revenue ratio, not profit or causal lift. */
  roas: number | null;
  /** Spend ÷ attributed orders (paid channels). */
  costPerAttributedOrder: number | null;
  /** Spend ÷ clicks (paid channels). */
  costPerClick: number | null;
  /** Attributed orders ÷ paid clicks. */
  ordersPerClick: number | null;
  /** Share of all attributed orders. */
  orderShare: number | null;
}

function empty(isPaid: boolean): ChannelTotals {
  return { clicks: isPaid ? 0 : null, spend: 0, attributedOrders: 0, attributedRevenue: 0, contributionBeforeMarketing: 0, contributionAfterMarketing: 0 };
}

function add(t: ChannelTotals, m: Dataset["marketing"][number]) {
  if (m.clicks !== null) t.clicks = (t.clicks ?? 0) + m.clicks;
  t.spend += m.marketing_spend_pence;
  t.attributedOrders += m.attributed_orders;
  t.attributedRevenue += m.attributed_net_revenue_pence;
  t.contributionBeforeMarketing += m.contribution_before_marketing_pence;
  t.contributionAfterMarketing = t.contributionBeforeMarketing - t.spend;
}

export function channelTotals(ds: Dataset, range: DateRange): Record<Channel, ChannelTotals> {
  const out = Object.fromEntries(CHANNELS.map((c) => [c, empty(PAID_CHANNELS.includes(c))])) as Record<Channel, ChannelTotals>;
  for (const m of ds.marketing) if (inRange(m.date, range)) add(out[m.channel], m);
  return out;
}

export function channelRows(ds: Dataset, range: DateRange): ChannelRow[] {
  const t = channelTotals(ds, range);
  const totalOrders = CHANNELS.reduce((s, c) => s + t[c].attributedOrders, 0);
  return CHANNELS.map((c) => {
    const isPaid = PAID_CHANNELS.includes(c);
    const x = t[c];
    return {
      ...x,
      channel: c,
      label: CHANNEL_LABELS[c],
      isPaid,
      roas: isPaid ? safeRatio(x.attributedRevenue, x.spend) : null,
      costPerAttributedOrder: isPaid ? safeRatio(x.spend, x.attributedOrders) : null,
      costPerClick: isPaid && x.clicks !== null ? safeRatio(x.spend, x.clicks) : null,
      ordersPerClick: isPaid && x.clicks !== null ? safeRatio(x.attributedOrders, x.clicks) : null,
      orderShare: safeRatio(x.attributedOrders, totalOrders),
    };
  });
}

export function paidSummary(rows: ChannelRow[]) {
  const paid = rows.filter((r) => r.isPaid);
  const spend = paid.reduce((s, r) => s + r.spend, 0);
  const revenue = paid.reduce((s, r) => s + r.attributedRevenue, 0);
  const contributionAfter = paid.reduce((s, r) => s + r.contributionAfterMarketing, 0);
  return { spend, revenue, contributionAfter, roas: safeRatio(revenue, spend) };
}

export interface ChannelTrendPoint extends Bucket {
  byChannel: Record<Channel, ChannelTotals & { roas: number | null }>;
}

export function channelTrend(ds: Dataset, range: DateRange, bs: Bucket[] = buckets(range)): ChannelTrendPoint[] {
  const idx = bucketIndexer(bs);
  const acc = bs.map(() => Object.fromEntries(CHANNELS.map((c) => [c, empty(PAID_CHANNELS.includes(c))])) as Record<Channel, ChannelTotals>);
  for (const m of ds.marketing) {
    if (!inRange(m.date, range)) continue;
    const i = idx(m.date);
    if (i >= 0) add(acc[i][m.channel], m);
  }
  return bs.map((b, i) => ({
    ...b,
    byChannel: Object.fromEntries(
      CHANNELS.map((c) => [c, { ...acc[i][c], roas: PAID_CHANNELS.includes(c) ? safeRatio(acc[i][c].attributedRevenue, acc[i][c].spend) : null }]),
    ) as ChannelTrendPoint["byChannel"],
  }));
}
