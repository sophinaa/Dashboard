"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboard, useDataset } from "@/components/providers/DashboardProvider";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Callout } from "@/components/ui/Callout";
import { Card, SectionHeading } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { axisProps, ChartTooltip, DASHES, GRID, Legend, makeTooltip, NEUTRAL, SERIES } from "@/components/charts/theme";
import { financialRates, financialTotals, financialTrend, promotionRows, revenueBridge, type BridgeStep, type FinancialBucket, type PromotionRow } from "@/lib/metrics/financials";
import { compareAmount, compareRate, safeRatio } from "@/lib/metrics/core";
import { formatRange } from "@/lib/metrics/dates";
import { count, money, moneyShort, pct, pp, signedCount, signedMoney, signedPct } from "@/lib/format";
import { DEFINITIONS, LIMITATIONS } from "@/lib/definitions";

const TREND_SERIES = [
  { key: "netRevenue", name: "Net revenue" },
  { key: "grossProfit", name: "Gross profit" },
  { key: "contributionAfterMarketing", name: "Contribution after marketing" },
] as const;

export function OverviewPage() {
  const ds = useDataset();
  const { range, previous, comparisonUnavailable } = useDashboard();

  const m = useMemo(() => {
    const cur = financialTotals(ds, range);
    const prev = previous ? financialTotals(ds, previous) : null;
    return {
      cur,
      prev,
      curR: financialRates(cur),
      prevR: prev ? financialRates(prev) : null,
      trend: financialTrend(ds, range),
      bridge: revenueBridge(cur),
      promos: promotionRows(ds, range),
    };
  }, [ds, range, previous]);

  const { cur, prev, curR, prevR } = m;
  const prevLabel = previous ? formatRange(previous) : "";

  const amountKpi = (c: number, p: number | null | undefined) => {
    const cmp = compareAmount(c, p ?? null);
    return {
      delta: cmp.change,
      deltaText: cmp.change === null ? "" : `${signedMoney(cmp.change)}${cmp.pctChange !== null ? ` (${signedPct(cmp.pctChange)})` : ""}`,
      previousText: cmp.previous === null ? null : `vs ${money(cmp.previous)}`,
    };
  };

  if (cur.orders === 0) {
    return <EmptyState title="No orders in the selected dates">Choose a range between 1 May and 31 October 2026.</EmptyState>;
  }

  const ordersCmp = compareAmount(cur.orders, prev?.orders ?? null);
  const marginCmp = compareRate(curR.grossMargin, prevR?.grossMargin);
  const aov = amountKpi(curR.averageOrderValue ?? 0, prevR?.averageOrderValue);

  return (
    <div className="space-y-4">
      {comparisonUnavailable && (
        <Callout tone="info" title="No comparison period">
          The period before {formatRange(range)} falls outside the shop data (which starts on 1 May 2026), so changes are not shown.
        </Callout>
      )}

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Key figures for {formatRange(range)}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Net revenue" value={money(cur.netRevenue)} help={DEFINITIONS["Net revenue"]} {...amountKpi(cur.netRevenue, prev?.netRevenue)} sub="After discounts and refunds" />
          <KpiCard
            label="Placed orders"
            value={count(cur.orders)}
            help={DEFINITIONS["Placed orders"]}
            delta={ordersCmp.change}
            deltaText={ordersCmp.change === null ? "" : `${signedCount(ordersCmp.change)}${ordersCmp.pctChange !== null ? ` (${signedPct(ordersCmp.pctChange)})` : ""}`}
            previousText={ordersCmp.previous === null ? null : `vs ${count(ordersCmp.previous)}`}
          />
          <KpiCard label="Average order value" value={money(curR.averageOrderValue)} help={DEFINITIONS["Average order value"]} {...aov} />
          <KpiCard label="Gross profit" value={money(cur.grossProfit)} help={DEFINITIONS["Gross profit"]} {...amountKpi(cur.grossProfit, prev?.grossProfit)} sub="After product costs (COGS)" />
          <KpiCard
            label="Gross margin"
            value={pct(curR.grossMargin)}
            help={DEFINITIONS["Gross margin"]}
            delta={marginCmp.ppChange}
            deltaText={pp(marginCmp.ppChange)}
            previousText={marginCmp.previous === null ? null : `vs ${pct(marginCmp.previous)}`}
            sub="Change in percentage points"
          />
          <KpiCard
            label="Contribution after marketing"
            value={money(cur.contributionAfterMarketing)}
            help={DEFINITIONS["Contribution after marketing"]}
            {...amountKpi(cur.contributionAfterMarketing, prev?.contributionAfterMarketing)}
            sub={<>Before marketing: {money(cur.contributionBeforeMarketing)} · Not net profit</>}
          />
        </div>
        {prev && <p className="mt-2 text-xs text-ink-muted">Changes compare {formatRange(range)} with {prevLabel}. Percentage changes are not shown when either value is zero or negative; the £ change is shown instead.</p>}
      </section>

      <TrendCard trend={m.trend} />

      <BridgeCard steps={m.bridge} netRevenue={cur.netRevenue} rangeLabel={formatRange(range)} />

      <PromotionsCard rows={m.promos} />

      <Card>
        <details>
          <summary className="cursor-pointer text-base font-semibold text-ink">About this data: definitions and limits</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <dl className="space-y-2 text-sm">
              {Object.entries(DEFINITIONS).map(([k, v]) => (
                <div key={k}>
                  <dt className="font-medium text-ink">{k}</dt>
                  <dd className="text-ink-2">{v}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="text-sm font-semibold text-ink">What this data cannot tell you</h3>
              <ul className="ml-5 mt-2 list-disc space-y-1.5 text-sm text-ink-2">
                {LIMITATIONS.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-ink-2">All amounts are in pounds sterling (GBP), excluding VAT, calculated from the order records in whole pence.</p>
            </div>
          </div>
        </details>
      </Card>
    </div>
  );
}

function TrendCard({ trend }: { trend: FinancialBucket[] }) {
  const data = trend.map((b) => ({
    label: b.partial ? `${b.label}*` : b.label,
    period: `${formatRange(b)}${b.partial ? " (partial)" : ""}`,
    netRevenue: b.totals.netRevenue,
    grossProfit: b.totals.grossProfit,
    contributionAfterMarketing: b.totals.contributionAfterMarketing,
  }));
  const anyNegative = data.some((d) => d.contributionAfterMarketing < 0);
  const hasPartial = trend.some((b) => b.partial);
  const columns: Column<FinancialBucket>[] = [
    { key: "p", header: "Period", rowHeader: true, render: (b) => `${formatRange(b)}${b.partial ? " (partial)" : ""}` },
    { key: "o", header: "Orders", align: "right", render: (b) => count(b.totals.orders) },
    { key: "nr", header: "Net revenue", align: "right", render: (b) => money(b.totals.netRevenue) },
    { key: "gp", header: "Gross profit", align: "right", render: (b) => money(b.totals.grossProfit) },
    { key: "gm", header: "Gross margin", align: "right", render: (b) => pct(b.rates.grossMargin) },
    { key: "mk", header: "Marketing", align: "right", render: (b) => money(b.totals.marketingSpend) },
    { key: "cam", header: "Contribution after mktg", align: "right", render: (b) => money(b.totals.contributionAfterMarketing) },
  ];
  return (
    <ChartCard
      title="Revenue, gross profit and contribution over time"
      description="Net revenue can rise while profit falls. Compare the three lines to see whether growth carried through to what is left after costs."
      chartLabel={`Line chart of net revenue, gross profit and contribution after marketing across ${data.length} periods. Use the Table tab for exact values.`}
      chart={
        <>
          <Legend items={TREND_SERIES.map((s, i) => ({ name: s.name, color: SERIES[i], dash: DASHES[i] }))} />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
                <YAxis {...axisProps} tickFormatter={(v) => moneyShort(v)} width={64} />
                {anyNegative && <ReferenceLine y={0} stroke="#7d756a" strokeWidth={1.5} />}
                <Tooltip content={makeTooltip((v) => money(v), (_l, p) => String(p.period))} />
                {TREND_SERIES.map((s, i) => (
                  <Line key={s.key} type="linear" dataKey={s.key} name={s.name} stroke={SERIES[i]} strokeWidth={2} strokeDasharray={DASHES[i]} dot={{ r: 3, strokeWidth: 0, fill: SERIES[i] }} activeDot={{ r: 5 }} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      }
      table={<DataTable caption="Financial trend by period" columns={columns} rows={trend} rowKey={(b) => b.key} dense />}
      footnote={
        <>
          Amounts in £ (GBP, excl. VAT). {hasPartial && "* Partial period: fewer days than a full week/month, so not directly comparable with full periods. "}
          Contribution is not net profit.
        </>
      }
    />
  );
}

function BridgeCard({ steps, netRevenue, rangeLabel }: { steps: BridgeStep[]; netRevenue: number; rangeLabel: string }) {
  let running = 0;
  const data = steps.map((s) => {
    let low: number;
    let high: number;
    if (s.kind === "deduction") {
      const before = running;
      running += s.amount;
      low = Math.min(before, running);
      high = Math.max(before, running);
    } else {
      running = s.amount;
      low = Math.min(0, s.amount);
      high = Math.max(0, s.amount);
    }
    return { ...s, range: [low, high] as [number, number] };
  });
  const columns: Column<BridgeStep>[] = [
    { key: "l", header: "Step", rowHeader: true, render: (s) => <span className={s.kind === "subtotal" ? "font-semibold" : "pl-3"}>{s.kind === "deduction" ? "− " : "= "}{s.label}</span> },
    { key: "a", header: "Amount", align: "right", render: (s) => <span className={s.kind === "subtotal" ? "font-semibold" : ""}>{money(s.amount)}</span> },
    { key: "p", header: "% of net revenue", align: "right", help: "Each step as a share of net revenue for the period.", render: (s) => (s.kind === "start" ? "—" : pct(netRevenue > 0 ? safeRatio(s.amount, netRevenue) : null)) },
    { key: "h", header: "What it is", render: (s) => <span className="text-xs">{s.help}</span> },
  ];
  return (
    <ChartCard
      title="From sales to contribution"
      description={`How ${rangeLabel}'s gross sales turn into contribution after marketing. Green bars are totals; light bars are costs and deductions taken away.`}
      chartLabel="Waterfall chart from gross sales through discounts, refunds, product costs, return handling, payment fees, fulfilment and marketing to contribution after marketing. Use the Table tab for exact values."
      chart={
        <>
          <Legend
            items={[
              { name: "Total / subtotal", color: SERIES[0], kind: "box" },
              { name: "Deduction (taken away)", color: NEUTRAL, kind: "box" },
            ]}
          />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }} barCategoryGap={6}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" {...axisProps} tickFormatter={(v) => moneyShort(v)} />
                <YAxis type="category" dataKey="label" {...axisProps} width={200} interval={0} />
                <ReferenceLine x={0} stroke="#7d756a" strokeWidth={1.5} />
                <Tooltip
                  cursor={{ fill: "rgba(30,92,63,0.06)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const s = payload[0].payload as BridgeStep;
                    return <ChartTooltip title={s.label} rows={[{ name: s.kind === "deduction" ? "Deducted" : "Total", value: money(Math.abs(s.amount) * (s.kind === "deduction" ? 1 : Math.sign(s.amount) || 1)) }]} note={s.help} />;
                  }}
                />
                <Bar dataKey="range" isAnimationActive={false} radius={3}>
                  {data.map((d) => (
                    <Cell key={d.key} fill={d.kind === "deduction" ? NEUTRAL : SERIES[0]} fillOpacity={d.kind === "deduction" ? 0.55 : 1} stroke={d.kind === "deduction" ? "#7d756a" : undefined} strokeDasharray={d.kind === "deduction" ? "3 2" : undefined} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      }
      table={<DataTable caption="Revenue to contribution bridge" columns={columns} rows={steps} rowKey={(s) => s.key} dense />}
      footnote="Contribution excludes fixed overheads such as rent, salaries, VAT and tax, so it is not net profit. Payment fees and fulfilment are kept even when an order is refunded."
    />
  );
}

function PromotionsCard({ rows }: { rows: PromotionRow[] }) {
  const columns: Column<PromotionRow>[] = [
    { key: "p", header: "Promotion", rowHeader: true, render: (r) => r.promotionId || "No promotion" },
    { key: "o", header: "Orders", align: "right", render: (r) => count(r.orders), sortValue: (r) => r.orders },
    { key: "g", header: "Gross sales", align: "right", render: (r) => money(r.grossSales), sortValue: (r) => r.grossSales },
    { key: "d", header: "Discounts", align: "right", render: (r) => money(r.discounts), sortValue: (r) => r.discounts },
    { key: "dr", header: "Discount rate", align: "right", help: DEFINITIONS["Discount rate"], render: (r) => pct(r.discountRate), sortValue: (r) => r.discountRate },
    { key: "n", header: "Net revenue", align: "right", render: (r) => money(r.netRevenue), sortValue: (r) => r.netRevenue },
    { key: "gp", header: "Gross profit", align: "right", render: (r) => money(r.grossProfit), sortValue: (r) => r.grossProfit },
    { key: "gm", header: "Gross margin", align: "right", help: DEFINITIONS["Gross margin"], render: (r) => pct(r.grossMargin), sortValue: (r) => r.grossMargin },
  ];
  return (
    <Card>
      <SectionHeading title="Orders by promotion" description="Orders placed under a recorded promotion code compared with other orders in the selected dates. Orders without a promotion can still carry small discounts." />
      <DataTable caption="Orders by promotion" columns={columns} rows={rows} rowKey={(r) => r.promotionId || "none"} dense />
    </Card>
  );
}
