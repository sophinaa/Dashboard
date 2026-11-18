"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboard, useDataset } from "@/components/providers/DashboardProvider";
import { ChartCard } from "@/components/ui/ChartCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Callout } from "@/components/ui/Callout";
import { Card, SectionHeading } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { axisProps, DASHES, GRID, Legend, makeTooltip, SERIES } from "@/components/charts/theme";
import { CHANNEL_LABELS, channelRows, channelTrend, paidSummary, type ChannelRow, type ChannelTrendPoint } from "@/lib/metrics/marketing";
import { compareAmount } from "@/lib/metrics/core";
import { formatRange } from "@/lib/metrics/dates";
import { count, money, moneyShort, pct, ratio, signedMoney, signedPct } from "@/lib/format";
import { DEFINITIONS } from "@/lib/definitions";
import { PAID_CHANNELS } from "@/lib/types";

export function MarketingPage() {
  const ds = useDataset();
  const { range, previous } = useDashboard();
  const m = useMemo(() => {
    const rows = channelRows(ds, range);
    const prevRows = previous ? channelRows(ds, previous) : null;
    return { rows, prevRows, paid: paidSummary(rows), prevPaid: prevRows ? paidSummary(prevRows) : null, trend: channelTrend(ds, range) };
  }, [ds, range, previous]);
  const prevBy = new Map(m.prevRows?.map((r) => [r.channel, r]) ?? []);
  const totalSpend = m.rows.reduce((s, r) => s + r.spend, 0);
  const totalCam = m.rows.reduce((s, r) => s + r.contributionAfterMarketing, 0);

  const amountDelta = (c: number, p: number | null | undefined) => {
    const x = compareAmount(c, p ?? null);
    return { delta: x.change, deltaText: x.change === null ? "" : `${signedMoney(x.change)}${x.pctChange !== null ? ` (${signedPct(x.pctChange)})` : ""}`, previousText: x.previous === null ? null : `vs ${money(x.previous)}` };
  };

  const columns: Column<ChannelRow>[] = [
    { key: "c", header: "Channel", rowHeader: true, render: (r) => <>{r.label}{!r.isPaid && <span className="block text-xs font-normal text-ink-muted">{r.channel === "email" ? "Fixed £3/day cost" : "No assigned cost"}</span>}</>, sortValue: (r) => r.label },
    {
      key: "s",
      header: "Spend",
      align: "right",
      help: `${DEFINITIONS["Marketing spend"]} Paid clicks are shown underneath; clicks are not recorded for unpaid channels (not zero).`,
      render: (r) => <>{money(r.spend)}<span className="block text-xs text-ink-muted">{r.clicks === null ? "clicks not recorded" : `${count(r.clicks)} paid clicks`}</span></>,
      sortValue: (r) => r.spend,
    },
    { key: "o", header: "Attributed orders", align: "right", help: DEFINITIONS["Attributed orders / revenue"], render: (r) => <>{count(r.attributedOrders)}<span className="block text-xs text-ink-muted">{pct(r.orderShare)} of orders</span></>, sortValue: (r) => r.attributedOrders },
    { key: "rv", header: "Attributed net revenue", align: "right", help: DEFINITIONS["Attributed orders / revenue"], render: (r) => money(r.attributedRevenue), sortValue: (r) => r.attributedRevenue },
    {
      key: "roas",
      header: "Paid ROAS",
      align: "right",
      help: DEFINITIONS["Paid ROAS"],
      render: (r) => (r.isPaid ? <>{ratio(r.roas)}{prevBy.get(r.channel) && <span className="block text-xs text-ink-muted">prev {ratio(prevBy.get(r.channel)!.roas)}</span>}</> : <span className="text-ink-muted">not applicable</span>),
      sortValue: (r) => r.roas,
    },
    { key: "cpo", header: "Spend per order", align: "right", help: "Paid spend ÷ attributed orders (paid channels only).", render: (r) => (r.isPaid ? money(r.costPerAttributedOrder) : "—"), sortValue: (r) => r.costPerAttributedOrder },
    {
      key: "cam",
      header: "Contribution after mktg",
      align: "right",
      help: DEFINITIONS["Channel contribution after marketing"],
      render: (r) => {
        const p = prevBy.get(r.channel);
        return (
          <>
            {money(r.contributionAfterMarketing)}
            <span className="block text-xs text-ink-muted">before mktg {money(r.contributionBeforeMarketing)}</span>
            {p && <span className="block text-xs text-ink-muted">{signedMoney(r.contributionAfterMarketing - p.contributionAfterMarketing)} vs prev</span>}
          </>
        );
      },
      sortValue: (r) => r.contributionAfterMarketing,
    },
  ];

  const footer = (
    <tr>
      <th scope="row" className="px-3 py-2 text-left">All channels</th>
      <td className="px-3 py-2 text-right num">{money(totalSpend)}</td>
      <td className="px-3 py-2 text-right num">{count(m.rows.reduce((s, r) => s + r.attributedOrders, 0))}</td>
      <td className="px-3 py-2 text-right num">{money(m.rows.reduce((s, r) => s + r.attributedRevenue, 0))}</td>
      <td className="px-3 py-2 text-right num">{ratio(m.paid.roas)} <span className="block text-xs font-normal text-ink-muted">paid only</span></td>
      <td className="px-3 py-2 text-right">—</td>
      <td className="px-3 py-2 text-right num">{money(totalCam)}</td>
    </tr>
  );

  const barData = m.rows.map((r) => ({ name: r.label, spend: r.spend, revenue: r.attributedRevenue, cam: r.contributionAfterMarketing }));
  const anyNeg = barData.some((d) => d.cam < 0);

  return (
    <div className="space-y-4">
      <Callout tone="caution" title="Attributed revenue is not proof that marketing caused the sale">
        Each order is credited to exactly one channel by a fixed rule. Some of those customers might have bought anyway, so attributed revenue does not show the extra (incremental) sales a channel created. Past returns also
        do not tell you what more — or less — spending would bring: results do not necessarily grow in step with the budget.
      </Callout>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total marketing spend" value={money(totalSpend)} help={DEFINITIONS["Marketing spend"]} {...amountDelta(totalSpend, m.prevRows?.reduce((s, r) => s + r.spend, 0))} />
        <KpiCard label="Paid ad spend" value={money(m.paid.spend)} help="Paid search + paid social click costs." {...amountDelta(m.paid.spend, m.prevPaid?.spend)} />
        <KpiCard label="Paid ROAS" value={ratio(m.paid.roas)} help={DEFINITIONS["Paid ROAS"]} sub={<>£{m.paid.roas !== null ? m.paid.roas.toFixed(2) : "n/a"} attributed revenue per £1 of paid spend{m.prevPaid ? ` · prev ${ratio(m.prevPaid.roas)}` : ""}</>} />
        <KpiCard label="Contribution after marketing" value={money(totalCam)} help={DEFINITIONS["Contribution after marketing"]} {...amountDelta(totalCam, m.prevRows?.reduce((s, r) => s + r.contributionAfterMarketing, 0))} sub="All channels · matches Overview" />
      </div>

      <ChartCard
        title="Spend, attributed revenue and contribution by channel"
        description={`${formatRange(range)}. Contribution after marketing is what the channel's attributed orders left after product, order and marketing costs. A channel can have high revenue but low or negative contribution.`}
        chartLabel="Grouped bar chart of marketing spend, attributed net revenue and contribution after marketing for each channel. Use the Table tab for exact values."
        chart={
          <>
            <Legend
              items={[
                { name: "Spend", color: SERIES[2], kind: "box" },
                { name: "Attributed net revenue", color: SERIES[1], kind: "box" },
                { name: "Contribution after marketing", color: SERIES[0], kind: "box" },
              ]}
            />
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }} barGap={2}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" {...axisProps} interval={0} />
                  <YAxis {...axisProps} tickFormatter={(v) => moneyShort(v)} width={64} />
                  {anyNeg && <ReferenceLine y={0} stroke="#7d756a" strokeWidth={1.5} />}
                  <Tooltip cursor={{ fill: "rgba(30,92,63,0.06)" }} content={makeTooltip((v) => money(v))} />
                  <Bar dataKey="spend" name="Spend" fill={SERIES[2]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="revenue" name="Attributed net revenue" fill={SERIES[1]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="cam" name="Contribution after marketing" fill={SERIES[0]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        }
        table={<DataTable caption="Spend, revenue and contribution by channel" columns={columns.filter((c) => ["c", "s", "rv", "cam"].includes(c.key))} rows={m.rows} rowKey={(r) => r.channel} dense />}
        footnote="Amounts in £ (GBP, excl. VAT). Organic/direct has no assigned cost; email has a fixed £3 per day cost."
      />

      <Card>
        <SectionHeading title="Channel comparison" description={`${formatRange(range)}${previous ? `; small figures compare with ${formatRange(previous)}` : ""}. Totals reconcile with placed orders and net revenue on the Overview.`} />
        <DataTable caption="Channel comparison" columns={columns} rows={m.rows} rowKey={(r) => r.channel} footer={footer} initialSort={{ key: "s", dir: "desc" }} />
      </Card>

      <RoasTrend trend={m.trend} />

      <Card>
        <SectionHeading title="Before changing a budget" />
        <ul className="ml-5 list-disc space-y-1.5 text-sm text-ink-2">
          <li>ROAS is a revenue ratio. Check contribution after marketing too: revenue can cover the ad cost but not the product, order and return costs.</li>
          <li>These figures describe what happened at past spending levels. They cannot show what an increase or cut would do.</li>
          <li>A time-limited, measured test (for example, changing one channel&apos;s budget for a set period and comparing with a holdout) gives better evidence than extrapolating averages.</li>
        </ul>
      </Card>
    </div>
  );
}

function RoasTrend({ trend }: { trend: ChannelTrendPoint[] }) {
  const paid = PAID_CHANNELS;
  const data = trend.map((b) => ({
    label: b.partial ? `${b.label}*` : b.label,
    period: formatRange(b) + (b.partial ? " (partial)" : ""),
    ...Object.fromEntries(paid.map((c) => [c, b.byChannel[c].roas])),
  }));
  const cols: Column<ChannelTrendPoint>[] = [
    { key: "p", header: "Period", rowHeader: true, render: (b) => formatRange(b) + (b.partial ? " (partial)" : "") },
    ...paid.flatMap((c) => [
      { key: `${c}-s`, header: `${CHANNEL_LABELS[c]} spend`, align: "right" as const, render: (b: ChannelTrendPoint) => money(b.byChannel[c].spend) },
      { key: `${c}-r`, header: `${CHANNEL_LABELS[c]} revenue`, align: "right" as const, render: (b: ChannelTrendPoint) => money(b.byChannel[c].attributedRevenue) },
      { key: `${c}-roas`, header: `${CHANNEL_LABELS[c]} ROAS`, align: "right" as const, render: (b: ChannelTrendPoint) => ratio(b.byChannel[c].roas) },
    ]),
  ];
  return (
    <ChartCard
      title="Paid ROAS over time"
      description="Attributed net revenue per £1 of ad spend for each paid channel. Changes over time can reflect many things at once (spend level, offers, product mix) and do not by themselves show cause."
      chartLabel="Line chart of paid search and paid social ROAS by period. Use the Table tab for spend, revenue and ROAS values."
      chart={
        <>
          <Legend items={paid.map((c, i) => ({ name: CHANNEL_LABELS[c], color: SERIES[i + 1], dash: DASHES[i + 1] }))} />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
                <YAxis {...axisProps} tickFormatter={(v) => `${Number(v).toFixed(1)}×`} width={48} domain={[0, "auto"]} />
                <ReferenceLine y={1} stroke="#7d756a" strokeDasharray="4 3" label={{ value: "1× = revenue equals spend", position: "insideTopRight", fill: "#5d645d", fontSize: 11 }} />
                <Tooltip content={makeTooltip((v) => ratio(v), (_l, p) => String(p.period))} />
                {paid.map((c, i) => (
                  <Line key={c} dataKey={c} name={CHANNEL_LABELS[c]} stroke={SERIES[i + 1]} strokeWidth={2} strokeDasharray={DASHES[i + 1]} dot={{ r: 3, strokeWidth: 0, fill: SERIES[i + 1] }} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      }
      table={<DataTable caption="Paid channel spend, revenue and ROAS by period" columns={cols} rows={trend} rowKey={(b) => b.key} dense />}
      footnote="Periods marked * are partial. ROAS above 1× does not mean the channel is profitable — see contribution after marketing."
    />
  );
}
