"use client";
import { useId, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboard, useDataset } from "@/components/providers/DashboardProvider";
import { ChartCard } from "@/components/ui/ChartCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Callout } from "@/components/ui/Callout";
import { Card, SectionHeading } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { Delta } from "@/components/ui/Delta";
import { axisProps, DASHES, GRID, Legend, makeTooltip, SERIES } from "@/components/charts/theme";
import { FUNNEL_RATE_DEFS, funnelCounts, funnelRates, funnelTrend, ordersByDevice, type DeviceFilter, type FunnelCounts, type FunnelRates, type FunnelTrendPoint } from "@/lib/metrics/funnel";
import { ppDiff, safeRatio } from "@/lib/metrics/core";
import { formatRange } from "@/lib/metrics/dates";
import { count, pct, pp } from "@/lib/format";
import { DEFINITIONS } from "@/lib/definitions";

const DEVICE_LABEL: Record<DeviceFilter, string> = { all: "All devices", mobile: "Mobile", desktop: "Desktop" };

const STAGES: { key: keyof FunnelCounts; label: string; base: string; help: string }[] = [
  { key: "sessions", label: "Sessions", base: "all sessions", help: "Visits to the shop (mobile and desktop; tablet traffic is not in the data)." },
  { key: "basket", label: "Added to basket", base: "sessions that added to basket", help: "Sessions that reached the basket." },
  { key: "checkout", label: "Started checkout", base: "sessions that started checkout", help: "Sessions that reached checkout (all of these also reached the basket)." },
  { key: "purchases", label: "Purchased", base: "purchasing sessions", help: "Sessions that completed a purchase. Equals placed orders, including orders later refunded." },
];

const RATE_FOR_STAGE: Partial<Record<keyof FunnelCounts, keyof FunnelRates>> = { basket: "basketRate", checkout: "checkoutStartRate", purchases: "checkoutCompletion" };

export function JourneyPage() {
  const ds = useDataset();
  const { range, previous } = useDashboard();
  const id = useId();
  const [device, setDevice] = useState<DeviceFilter>("all");
  const [trendRate, setTrendRate] = useState<keyof FunnelRates>("checkoutCompletion");

  const data = useMemo(() => {
    const devices: DeviceFilter[] = ["all", "mobile", "desktop"];
    const byDevice = Object.fromEntries(
      devices.map((d) => {
        const c = funnelCounts(ds, range, d);
        const p = previous ? funnelCounts(ds, previous, d) : null;
        return [d, { c, r: funnelRates(c), p, pr: p ? funnelRates(p) : null }];
      }),
    ) as Record<DeviceFilter, { c: FunnelCounts; r: FunnelRates; p: FunnelCounts | null; pr: FunnelRates | null }>;
    return { byDevice, trend: funnelTrend(ds, range), orders: ordersByDevice(ds, range) };
  }, [ds, range, previous]);

  const sel = data.byDevice[device];
  const reconciles = sel.c.purchases === data.orders[device];

  return (
    <div className="space-y-4">
      <Callout tone="info" title="Reading the journey">
        Each step counts sessions that got at least that far. Every rate states what it is divided by. Changes in rates are shown in percentage points (pp). The data shows where sessions stop, not why.
      </Callout>

      <Card>
        <SectionHeading
          title="Shopping journey"
          description={`${formatRange(range)}${previous ? ` compared with ${formatRange(previous)}` : ""}.`}
          actions={
            <fieldset>
              <legend className="mb-1 text-xs font-medium text-ink-2">Device</legend>
              <div className="inline-flex rounded-lg border border-line bg-sunken p-0.5">
                {(["all", "mobile", "desktop"] as DeviceFilter[]).map((d) => (
                  <label key={d} className={`cursor-pointer rounded-md px-3 py-1 text-sm font-medium focus-within:outline focus-within:outline-2 focus-within:outline-forest ${device === d ? "bg-surface text-ink shadow-card" : "text-ink-muted"}`}>
                    <input type="radio" name={`${id}-device`} value={d} checked={device === d} onChange={() => setDevice(d)} className="sr-only" />
                    {DEVICE_LABEL[d]}
                  </label>
                ))}
              </div>
            </fieldset>
          }
        />
        <ol className="space-y-2" aria-label={`Journey steps, ${DEVICE_LABEL[device]}`}>
          {STAGES.map((s, i) => {
            const v = sel.c[s.key];
            const width = sel.c.sessions > 0 ? Math.max(1.5, (v / sel.c.sessions) * 100) : 0;
            const rateKey = RATE_FOR_STAGE[s.key];
            const prevStage = i > 0 ? STAGES[i - 1] : null;
            const rate = rateKey ? sel.r[rateKey] : null;
            const prevRate = rateKey && sel.pr ? sel.pr[rateKey] : null;
            const ppc = ppDiff(rate, prevRate);
            return (
              <li key={s.key} className="grid items-center gap-x-4 gap-y-1 md:grid-cols-[180px_1fr_300px]">
                <div className="flex items-center text-sm font-medium text-ink">
                  {s.label}
                  <InfoTip text={s.help} label={s.label} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 flex-1 rounded bg-sunken" aria-hidden>
                    <div className="h-5 rounded" style={{ width: `${width}%`, background: SERIES[0], opacity: 1 - i * 0.15 }} />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold text-ink num">{count(v)}</span>
                </div>
                <div className="text-sm text-ink-2">
                  {prevStage ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <span>
                        <span className="font-semibold text-ink num">{pct(rate, 1)}</span> of {prevStage.base}
                        <span className="text-ink-muted num"> ({count(v)} ÷ {count(sel.c[prevStage.key])})</span>
                      </span>
                      {sel.pr && <Delta value={ppc} text={pp(ppc)} srPrefix="Change in rate" />}
                    </span>
                  ) : (
                    <span className="text-ink-muted">Starting point (100%)</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 flex flex-wrap gap-6 border-t border-line pt-4 text-sm">
          <p>
            <span className="font-medium text-ink">Store purchase conversion</span>
            <InfoTip text={DEFINITIONS["Store purchase conversion"]} label="Store purchase conversion" />:{" "}
            <span className="font-semibold num">{pct(sel.r.conversion, 2)}</span>
            <span className="text-ink-muted num">
              {" "}
              ({count(sel.c.purchases)} purchases ÷ {count(sel.c.sessions)} sessions)
            </span>
            {sel.pr && (
              <span className="ml-2">
                <Delta value={ppDiff(sel.r.conversion, sel.pr.conversion)} text={pp(ppDiff(sel.r.conversion, sel.pr.conversion), 2)} />
              </span>
            )}
          </p>
          <p className="text-ink-muted">
            {reconciles ? "Check: purchases match placed orders for these dates and device (" : "Warning: purchases do not match placed orders ("}
            {count(data.orders[device])} orders).
          </p>
        </div>
      </Card>

      <Card>
        <SectionHeading title="Counts and rates by device" description="Rates are calculated from the summed counts for the whole period, not averaged across days." />
        <DeviceTable byDevice={data.byDevice} hasPrev={!!previous} />
      </Card>

      <TrendCard trend={data.trend} rate={trendRate} setRate={setTrendRate} />
    </div>
  );
}

interface DeviceRow {
  key: string;
  device: DeviceFilter;
  label: string;
  numerator: number;
  denominator: number;
  rate: number | null;
  prev: number | null;
}

function DeviceTable({ byDevice, hasPrev }: { byDevice: Record<DeviceFilter, { c: FunnelCounts; r: FunnelRates; p: FunnelCounts | null; pr: FunnelRates | null }>; hasPrev: boolean }) {
  const numKey: Record<keyof FunnelRates, [keyof FunnelCounts, keyof FunnelCounts]> = {
    basketRate: ["basket", "sessions"],
    checkoutStartRate: ["checkout", "basket"],
    checkoutCompletion: ["purchases", "checkout"],
    conversion: ["purchases", "sessions"],
  };
  const rows: DeviceRow[] = [];
  for (const def of FUNNEL_RATE_DEFS) {
    for (const d of ["mobile", "desktop", "all"] as DeviceFilter[]) {
      const x = byDevice[d];
      const [n, dn] = numKey[def.key];
      rows.push({ key: `${def.key}-${d}`, device: d, label: def.label, numerator: x.c[n], denominator: x.c[dn], rate: safeRatio(x.c[n], x.c[dn]), prev: x.pr ? x.pr[def.key] : null });
    }
  }
  const cols: Column<DeviceRow>[] = [
    { key: "m", header: "Measure", rowHeader: true, render: (r) => (r.device === "mobile" ? r.label : <span className="sr-only">{r.label}</span>) },
    { key: "d", header: "Device", render: (r) => DEVICE_LABEL[r.device] },
    {
      key: "n",
      header: "Count ÷ base",
      align: "right",
      render: (r) => {
        const def = FUNNEL_RATE_DEFS.find((d) => d.label === r.label)!;
        return (
          <span title={`${def.numerator} ÷ ${def.denominator}`}>
            {count(r.numerator)} ÷ {count(r.denominator)}
            <span className="block text-xs text-ink-muted">
              {def.numerator.toLowerCase()} ÷ {def.denominator}
            </span>
          </span>
        );
      },
    },
    { key: "r", header: "Rate", align: "right", render: (r) => <span className="font-semibold text-ink">{pct(r.rate, 2)}</span> },
    ...(hasPrev
      ? ([
          { key: "p", header: "Previous", align: "right", render: (r: DeviceRow) => pct(r.prev, 2) },
          { key: "c", header: "Change", align: "right", render: (r: DeviceRow) => pp(ppDiff(r.rate, r.prev), 2) },
        ] as Column<DeviceRow>[])
      : []),
  ];
  return <DataTable caption="Journey rates by device with explicit denominators" columns={cols} rows={rows} rowKey={(r) => r.key} dense />;
}

function TrendCard({ trend, rate, setRate }: { trend: FunnelTrendPoint[]; rate: keyof FunnelRates; setRate: (r: keyof FunnelRates) => void }) {
  const id = useId();
  const def = FUNNEL_RATE_DEFS.find((d) => d.key === rate)!;
  const lines: { key: DeviceFilter; name: string }[] = [
    { key: "mobile", name: "Mobile" },
    { key: "desktop", name: "Desktop" },
    { key: "all", name: "All devices" },
  ];
  const data = trend.map((b) => ({
    label: b.partial ? `${b.label}*` : b.label,
    period: formatRange(b) + (b.partial ? " (partial)" : ""),
    mobile: b.byDevice.mobile.rates[rate],
    desktop: b.byDevice.desktop.rates[rate],
    all: b.byDevice.all.rates[rate],
  }));
  const cols: Column<FunnelTrendPoint>[] = [
    { key: "p", header: "Period", rowHeader: true, render: (b) => formatRange(b) + (b.partial ? " (partial)" : "") },
    ...lines.map((l) => ({
      key: l.key,
      header: l.name,
      align: "right" as const,
      render: (b: FunnelTrendPoint) => {
        const [n, d] = numDen(rate, b.byDevice[l.key].counts);
        return (
          <>
            {pct(b.byDevice[l.key].rates[rate], 2)}
            <span className="block text-xs text-ink-muted">
              {count(n)} ÷ {count(d)}
            </span>
          </>
        );
      },
    })),
  ];
  return (
    <ChartCard
      title={`${def.label} over time`}
      description={`${def.numerator} ÷ ${def.denominator}, by device. Short periods have fewer sessions, so their rates move around more.`}
      actions={
        <div>
          <label htmlFor={`${id}-r`} className="sr-only">
            Rate to chart
          </label>
          <select id={`${id}-r`} value={rate} onChange={(e) => setRate(e.target.value as keyof FunnelRates)} className="h-8 rounded-md border border-line-strong bg-surface px-2 text-sm">
            {FUNNEL_RATE_DEFS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      }
      chartLabel={`Line chart of ${def.label} for mobile, desktop and all devices over time. Use the Table tab for exact values and counts.`}
      chart={
        <>
          <Legend items={lines.map((l, i) => ({ name: l.name, color: SERIES[i], dash: DASHES[i] }))} />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
                <YAxis {...axisProps} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} width={48} domain={[0, "auto"]} />
                <Tooltip content={makeTooltip((v) => pct(v, 2), (_l, p) => String(p.period))} />
                {lines.map((l, i) => (
                  <Line key={l.key} dataKey={l.key} name={l.name} stroke={SERIES[i]} strokeWidth={2} strokeDasharray={DASHES[i]} dot={{ r: 3, strokeWidth: 0, fill: SERIES[i] }} connectNulls={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      }
      table={<DataTable caption={`${def.label} by period and device`} columns={cols} rows={trend} rowKey={(b) => b.key} dense />}
      footnote="Periods marked * are partial. The y-axis starts at 0%."
    />
  );
}

function numDen(rate: keyof FunnelRates, c: FunnelCounts): [number, number] {
  switch (rate) {
    case "basketRate":
      return [c.basket, c.sessions];
    case "checkoutStartRate":
      return [c.checkout, c.basket];
    case "checkoutCompletion":
      return [c.purchases, c.checkout];
    default:
      return [c.purchases, c.sessions];
  }
}
