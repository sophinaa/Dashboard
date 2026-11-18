"use client";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboard, useDataset } from "@/components/providers/DashboardProvider";
import { ChartCard } from "@/components/ui/ChartCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Callout } from "@/components/ui/Callout";
import { Card, SectionHeading } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { InfoTip } from "@/components/ui/InfoTip";
import { EmptyState } from "@/components/ui/States";
import { axisProps, DASHES, GRID, Legend, makeTooltip, SERIES } from "@/components/charts/theme";
import { analyseExperiment, verdictText, type Interval, type OutcomeComparison, type VariantStats } from "@/lib/metrics/experiment";
import { formatRange, shortDate } from "@/lib/metrics/dates";
import { safeRatio } from "@/lib/metrics/core";
import { count, pct, pp, signedPct } from "@/lib/format";
import { DEFINITIONS } from "@/lib/definitions";

const VARIANT_COLOR = { A: SERIES[1], B: SERIES[2] } as const;

export function ExperimentsPage() {
  const ds = useDataset();
  const { range } = useDashboard();
  const e = useMemo(() => analyseExperiment(ds), [ds]);

  if (!e.period) return <EmptyState title="No experiment data">There are no banner experiment records in this dataset.</EmptyState>;

  const overlap = !(e.period.end < range.start || e.period.start > range.end);
  const fullyInside = e.period.start >= range.start && e.period.end <= range.end;

  return (
    <div className="space-y-4">
      <Callout tone="info" title={`Experiment period: ${formatRange(e.period)} (${e.days} days)`}>
        This page always analyses the whole banner experiment ({e.experimentId}), whatever dates are selected above. Your selected dates ({formatRange(range)}){" "}
        {fullyInside ? "include the whole experiment." : overlap ? "only partly overlap the experiment." : "do not overlap the experiment at all."} Analysing only part of an experiment can give misleading results.
      </Callout>

      <Card>
        <SectionHeading
          title="How the test worked"
          description="Visitors were randomly shown banner A or banner B (each visitor saw one). The outcome decided in advance — the primary outcome — is purchase conversion: the share of exposed visitors who clicked the banner and bought. Clicks are a secondary outcome."
        />
        <VariantTable a={e.variants.A} b={e.variants.B} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <OutcomeCard comparison={e.primary} primary a={e.variants.A} b={e.variants.B} kind="conversion" />
        <OutcomeCard comparison={e.secondary} a={e.variants.A} b={e.variants.B} kind="ctr" />
      </div>

      <CumulativeCard daily={e.daily} />

      <Card>
        <SectionHeading title="Method and assumptions" />
        <ul className="ml-5 list-disc space-y-1.5 text-sm text-ink-2">
          <li>{e.method}</li>
          <li>
            A 95% interval is a range of values for the true difference that are reasonably compatible with the data, under these assumptions. Intervals that include zero mean the data cannot tell which variant is
            higher.
          </li>
          <li>
            &quot;Inconclusive&quot; is not the same as &quot;equivalent&quot;. Showing two banners perform the same would need a margin (e.g. ±0.5 pp) agreed before the test and an interval that fits entirely inside it.
          </li>
          <li>The analysis is fixed to the full experiment period and the pre-specified primary outcome, to avoid picking whichever subset or measure happens to look best.</li>
          <li>Purchases count exposed visitors who clicked and then bought, before any later refunds; they match the experiment-tagged orders ({count(e.variants.A.taggedOrders)} for A, {count(e.variants.B.taggedOrders)} for B).</li>
        </ul>
      </Card>
    </div>
  );
}

function VariantTable({ a, b }: { a: VariantStats; b: VariantStats }) {
  const cols: Column<VariantStats>[] = [
    { key: "v", header: "Banner", rowHeader: true, render: (r) => <span className="inline-flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: VARIANT_COLOR[r.variant] }} aria-hidden />Variant {r.variant}</span> },
    { key: "vis", header: "Exposed visitors", align: "right", help: "Visitors shown this banner. Each visitor saw one variant.", render: (r) => count(r.visitors) },
    { key: "cl", header: "Banner clicks", align: "right", render: (r) => count(r.clicks) },
    { key: "ctr", header: "Click-through rate", align: "right", help: DEFINITIONS["Banner click-through rate"], render: (r) => <>{pct(r.ctr, 2)}<span className="block text-xs text-ink-muted">95% CI {ci(r.ctrCI)}</span></> },
    { key: "pu", header: "Purchases", align: "right", render: (r) => count(r.purchases) },
    { key: "cv", header: "Purchase conversion (primary)", align: "right", help: DEFINITIONS["Banner purchase conversion"], render: (r) => <><span className="font-semibold text-ink">{pct(r.conversion, 2)}</span><span className="block text-xs text-ink-muted">95% CI {ci(r.conversionCI)}</span></> },
  ];
  return <DataTable caption="Banner experiment results by variant" columns={cols} rows={[a, b]} rowKey={(r) => r.variant} />;
}

function ci(i: Interval | null) {
  return i ? `${pct(i.low, 2)} – ${pct(i.high, 2)}` : "n/a";
}

function OutcomeCard({ comparison: c, primary, a, b, kind }: { comparison: OutcomeComparison; primary?: boolean; a: VariantStats; b: VariantStats; kind: "conversion" | "ctr" }) {
  const v = verdictText(c);
  const icon = c.verdict === "inconclusive" ? "info" : c.verdict === "no_data" ? "warning" : "check";
  const rA = kind === "conversion" ? a.conversion : a.ctr;
  const rB = kind === "conversion" ? b.conversion : b.ctr;
  const ciA = kind === "conversion" ? a.conversionCI : a.ctrCI;
  const ciB = kind === "conversion" ? b.conversionCI : b.ctrCI;
  return (
    <Card className={primary ? "ring-2 ring-forest/40" : ""}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{primary ? "Primary outcome (decided in advance)" : "Secondary outcome"}</p>
      <h2 className="mt-1 text-base font-semibold text-ink">{kind === "conversion" ? "Purchase conversion" : "Banner click-through rate"}</h2>
      <div className="mt-3 flex items-start gap-3 rounded-3xl bg-surface p-4">
        <Icon name={icon} className="mt-0.5 h-5 w-5 flex-none text-ink-2" />
        <div>
          <p className="font-semibold text-ink">{v.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{v.body}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-ink-muted">A</dt>
          <dd className="font-semibold num">{pct(rA, 2)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">B</dt>
          <dd className="font-semibold num">{pct(rB, 2)}</dd>
        </div>
        <div>
          <dt className="flex items-center text-ink-muted">
            B − A
            <InfoTip text={DEFINITIONS["Percentage-point (pp) change"]} label="Percentage points" />
          </dt>
          <dd className="font-semibold num">{pp(c.diffPp, 2)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Relative</dt>
          <dd className="font-semibold num">{signedPct(c.relative)}</dd>
        </div>
      </dl>
      <IntervalPlot
        title={`${kind === "conversion" ? "Purchase conversion" : "Click-through rate"}: estimates with 95% intervals`}
        rows={[
          { label: "Variant A", est: rA, ci: ciA, color: VARIANT_COLOR.A },
          { label: "Variant B", est: rB, ci: ciB, color: VARIANT_COLOR.B },
        ]}
        diff={{ est: c.diffPp, ci: c.ciPp }}
      />
    </Card>
  );
}

/** Dot-and-whisker plot drawn in SVG; values also printed as text. */
function IntervalPlot({ title, rows, diff }: { title: string; rows: { label: string; est: number | null; ci: Interval | null; color: string }[]; diff: { est: number | null; ci: Interval | null } }) {
  const W = 460;
  const left = 82;
  const right = 16;
  const maxRate = Math.max(...rows.map((r) => r.ci?.high ?? 0)) * 1.15 || 0.01;
  const x = (v: number) => left + (v / maxRate) * (W - left - right);
  const dLo = Math.min(diff.ci?.low ?? 0, 0);
  const dHi = Math.max(diff.ci?.high ?? 0, 0);
  const pad = (dHi - dLo) * 0.15 || 0.5;
  const dx = (v: number) => left + ((v - (dLo - pad)) / (dHi + pad - (dLo - pad))) * (W - left - right);
  const ticks = [0, maxRate / 2, maxRate].map((t) => Math.round(t * 1000) / 1000);
  return (
    <figure className="mx-auto mt-4 max-w-md">
      <figcaption className="mb-1 text-xs font-medium text-ink-2">{title}</figcaption>
      <svg viewBox={`0 0 ${W} 150`} className="w-full" role="img" aria-label={`${title}. ${rows.map((r) => `${r.label} ${pct(r.est, 2)}, interval ${ci(r.ci)}`).join("; ")}. Difference B minus A ${pp(diff.est, 2)}, interval ${pp(diff.ci?.low, 2)} to ${pp(diff.ci?.high, 2)}.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={6} y2={64} stroke={GRID} />
            <text x={x(t)} y={76} textAnchor="middle" fontSize="10" fill="#5d645d">
              {(t * 100).toFixed(1)}%
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = 18 + i * 26;
          return (
            <g key={r.label}>
              <text x={0} y={y + 4} fontSize="11" fill="#434c45">
                {r.label}
              </text>
              {r.ci && <line x1={x(r.ci.low)} x2={x(r.ci.high)} y1={y} y2={y} stroke={r.color} strokeWidth={2.5} />}
              {r.ci && <line x1={x(r.ci.low)} x2={x(r.ci.low)} y1={y - 5} y2={y + 5} stroke={r.color} strokeWidth={2} />}
              {r.ci && <line x1={x(r.ci.high)} x2={x(r.ci.high)} y1={y - 5} y2={y + 5} stroke={r.color} strokeWidth={2} />}
              {r.est !== null && <circle cx={x(r.est)} cy={y} r={5} fill={r.color} stroke="#fffdf9" strokeWidth={2} />}
            </g>
          );
        })}
        <text x={0} y={118} fontSize="11" fill="#434c45">
          B − A (pp)
        </text>
        <line x1={dx(0)} x2={dx(0)} y1={98} y2={132} stroke="#7d756a" strokeDasharray="3 3" />
        <text x={dx(0)} y={146} textAnchor="middle" fontSize="10" fill="#5d645d">
          0 = no difference
        </text>
        {diff.ci && (
          <>
            <line x1={dx(diff.ci.low)} x2={dx(diff.ci.high)} y1={114} y2={114} stroke="#1d2620" strokeWidth={2.5} />
            <line x1={dx(diff.ci.low)} x2={dx(diff.ci.low)} y1={109} y2={119} stroke="#1d2620" strokeWidth={2} />
            <line x1={dx(diff.ci.high)} x2={dx(diff.ci.high)} y1={109} y2={119} stroke="#1d2620" strokeWidth={2} />
            <text x={dx(diff.ci.low)} y={104} textAnchor="middle" fontSize="10" fill="#434c45">
              {diff.ci.low.toFixed(2)}
            </text>
            <text x={dx(diff.ci.high)} y={104} textAnchor="middle" fontSize="10" fill="#434c45">
              {diff.ci.high >= 0 ? "+" : ""}
              {diff.ci.high.toFixed(2)}
            </text>
          </>
        )}
        {diff.est !== null && <rect x={dx(diff.est) - 4.5} y={109.5} width={9} height={9} fill="#1d2620" transform={`rotate(45 ${dx(diff.est)} 114)`} />}
      </svg>
      <p className="mt-1 text-xs text-ink-muted">Dots/diamond = observed values; bars = 95% intervals.</p>
    </figure>
  );
}

function CumulativeCard({ daily }: { daily: ReturnType<typeof analyseExperiment>["daily"] }) {
  const acc = { A: { v: 0, p: 0, c: 0 }, B: { v: 0, p: 0, c: 0 } };
  const rows = daily.map((d) => {
    for (const k of ["A", "B"] as const) {
      acc[k].v += d[k].visitors;
      acc[k].p += d[k].purchases;
      acc[k].c += d[k].clicks;
    }
    return {
      date: d.date,
      label: shortDate(d.date),
      A: safeRatio(acc.A.p, acc.A.v),
      B: safeRatio(acc.B.p, acc.B.v),
      day: d,
      cum: { A: { ...acc.A }, B: { ...acc.B } },
    };
  });
  type Row = (typeof rows)[number];
  const cols: Column<Row>[] = [
    { key: "d", header: "Date", rowHeader: true, render: (r) => shortDate(r.date) },
    { key: "av", header: "A visitors", align: "right", render: (r) => count(r.day.A.visitors) },
    { key: "ap", header: "A purchases", align: "right", render: (r) => count(r.day.A.purchases) },
    { key: "bv", header: "B visitors", align: "right", render: (r) => count(r.day.B.visitors) },
    { key: "bp", header: "B purchases", align: "right", render: (r) => count(r.day.B.purchases) },
    { key: "ac", header: "A cumulative conversion", align: "right", render: (r) => <>{pct(r.A, 2)}<span className="block text-xs text-ink-muted">{count(r.cum.A.p)} ÷ {count(r.cum.A.v)}</span></> },
    { key: "bc", header: "B cumulative conversion", align: "right", render: (r) => <>{pct(r.B, 2)}<span className="block text-xs text-ink-muted">{count(r.cum.B.p)} ÷ {count(r.cum.B.v)}</span></> },
  ];
  return (
    <ChartCard
      title="Purchase conversion as the test ran (cumulative)"
      description="Running totals: purchases so far ÷ visitors so far. Early values swing because they rest on few purchases; the final values are the ones above. Watching this line to stop the test early would make results unreliable."
      chartLabel="Line chart of cumulative purchase conversion for variants A and B over the 14 experiment days. Use the Table tab for daily counts."
      chart={
        <>
          <Legend
            items={[
              { name: "Variant A", color: VARIANT_COLOR.A, dash: DASHES[0] },
              { name: "Variant B", color: VARIANT_COLOR.B, dash: DASHES[1] },
            ]}
          />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={12} />
                <YAxis {...axisProps} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} width={52} domain={[0, "auto"]} />
                <Tooltip content={makeTooltip((v) => pct(v, 2))} />
                <Line dataKey="A" name="Variant A" stroke={VARIANT_COLOR.A} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: VARIANT_COLOR.A }} isAnimationActive={false} />
                <Line dataKey="B" name="Variant B" stroke={VARIANT_COLOR.B} strokeWidth={2} strokeDasharray={DASHES[1]} dot={{ r: 3, strokeWidth: 0, fill: VARIANT_COLOR.B }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      }
      table={<DataTable caption="Daily experiment counts and cumulative conversion" columns={cols} rows={rows} rowKey={(r) => r.date} dense />}
    />
  );
}
