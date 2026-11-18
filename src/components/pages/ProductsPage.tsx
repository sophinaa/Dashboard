"use client";
import { useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboard, useDataset } from "@/components/providers/DashboardProvider";
import { ChartCard } from "@/components/ui/ChartCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Callout } from "@/components/ui/Callout";
import { Card, SectionHeading } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { axisProps, DASHES, GRID, Legend, makeTooltip, SERIES } from "@/components/charts/theme";
import { productRows, productTotalsAll, productTrend, type ProductRow, type ProductTrendPoint } from "@/lib/metrics/products";
import { ppDiff } from "@/lib/metrics/core";
import { formatRange } from "@/lib/metrics/dates";
import { count, money, moneyShort, pct, pp, signedMoney, signedPct } from "@/lib/format";
import { DEFINITIONS } from "@/lib/definitions";

const HELP = {
  units: "Units dispatched, including units later returned.",
  returned: "Units returned and refunded.",
  returnRate: DEFINITIONS["Unit return rate"],
  discounts: "Total discount given on this product's order lines, including on units later returned.",
  discountRate: DEFINITIONS["Discount rate"],
  refunds: "Refunds at the discounted price.",
  netRevenue: DEFINITIONS["Net revenue"],
  grossProfit: DEFINITIONS["Gross profit"],
  grossMargin: DEFINITIONS["Gross margin"],
  returnHandling: "£1.00 per returned unit. Shown separately; not included in gross profit.",
  share: "This product's share of the period's total for all products.",
};

export function ProductsPage() {
  const ds = useDataset();
  const { range, previous } = useDashboard();
  const groupId = useId();
  const [visible, setVisible] = useState<string[]>(() => ds.products.map((p) => p.product_id));
  const [detailId, setDetailId] = useState<string>(ds.products[0].product_id);
  const [cmpA, setCmpA] = useState<string>(ds.products[0].product_id);
  const [cmpB, setCmpB] = useState<string>(ds.products[1]?.product_id ?? ds.products[0].product_id);

  const rows = useMemo(() => productRows(ds, range), [ds, range]);
  const prevRows = useMemo(() => (previous ? productRows(ds, previous) : null), [ds, previous]);
  const prevById = useMemo(() => new Map(prevRows?.map((r) => [r.productId, r]) ?? []), [prevRows]);
  const shown = rows.filter((r) => visible.includes(r.productId));
  const totals = productTotalsAll(rows);

  const toggle = (id: string) => setVisible((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const columns: Column<ProductRow>[] = [
    { key: "name", header: "Product", rowHeader: true, render: (r) => r.name, sortValue: (r) => r.name },
    { key: "units", header: "Units sold", align: "right", help: HELP.units, render: (r) => count(r.units), sortValue: (r) => r.units },
    {
      key: "rr",
      header: "Return rate",
      align: "right",
      help: HELP.returnRate,
      render: (r) => (
        <>
          {pct(r.returnRate)}
          <span className="block text-xs text-ink-muted">{count(r.returnedUnits)} of {count(r.units)} units</span>
          {prevRows && <span className="block text-xs text-ink-muted">{pp(ppDiff(r.returnRate, prevById.get(r.productId)?.returnRate ?? null))}</span>}
        </>
      ),
      sortValue: (r) => r.returnRate,
    },
    { key: "disc", header: "Discounts", align: "right", help: `${HELP.discounts} The percentage underneath is the discount rate (discounts ÷ gross sales).`, render: (r) => <>{money(r.discounts)}<span className="block text-xs text-ink-muted">{pct(r.discountRate)} of gross sales</span></>, sortValue: (r) => r.discounts },
    {
      key: "ref",
      header: "Refunds",
      align: "right",
      help: `${HELP.refunds} Underneath: return handling cost (${HELP.returnHandling})`,
      render: (r) => <>{money(r.refunds)}<span className="block text-xs text-ink-muted">+ {money(r.returnHandling)} handling</span></>,
      sortValue: (r) => r.refunds,
    },
    {
      key: "nr",
      header: "Net revenue",
      align: "right",
      help: HELP.netRevenue,
      render: (r) => (
        <>
          {money(r.netRevenue)}
          <span className="block text-xs text-ink-muted">{pct(r.revenueShare)} of total · rank {r.revenueRank}</span>
        </>
      ),
      sortValue: (r) => r.netRevenue,
    },
    {
      key: "gp",
      header: "Gross profit",
      align: "right",
      help: HELP.grossProfit,
      render: (r) => (
        <>
          {money(r.grossProfit)}
          <span className="block text-xs text-ink-muted">{pct(r.grossProfitShare)} of total · rank {r.grossProfitRank}</span>
        </>
      ),
      sortValue: (r) => r.grossProfit,
    },
    {
      key: "gm",
      header: "Gross margin",
      align: "right",
      help: HELP.grossMargin,
      render: (r) => (
        <>
          {pct(r.grossMargin)}
          {prevRows && <span className="block text-xs text-ink-muted">{pp(ppDiff(r.grossMargin, prevById.get(r.productId)?.grossMargin ?? null))}</span>}
        </>
      ),
      sortValue: (r) => r.grossMargin,
    },
    {
      key: "d",
      header: "Details",
      render: (r) => (
        <button type="button" onClick={() => setDetailId(r.productId)} aria-pressed={detailId === r.productId} className="rounded-md border border-line-strong px-2 py-0.5 text-xs font-medium text-ink-2 hover:border-forest hover:text-forest">
          {detailId === r.productId ? "Showing" : "View"}
          <span className="sr-only"> details for {r.name}</span>
        </button>
      ),
    },
  ];

  const footer = (
    <tr>
      <th scope="row" className="px-3 py-2 text-left">All products</th>
      <td className="px-3 py-2 text-right num">{count(totals.units)}</td>
      <td className="px-3 py-2 text-right num">{pct(totals.returnRate)}<span className="block text-xs font-normal text-ink-muted">{count(totals.returnedUnits)} of {count(totals.units)} units</span></td>
      <td className="px-3 py-2 text-right num">{money(totals.discounts)}<span className="block text-xs font-normal text-ink-muted">{pct(totals.discountRate)} of gross sales</span></td>
      <td className="px-3 py-2 text-right num">{money(totals.refunds)}<span className="block text-xs font-normal text-ink-muted">+ {money(totals.returnHandling)} handling</span></td>
      <td className="px-3 py-2 text-right num">{money(totals.netRevenue)}</td>
      <td className="px-3 py-2 text-right num">{money(totals.grossProfit)}</td>
      <td className="px-3 py-2 text-right num">{pct(totals.grossMargin)}</td>
      <td />
    </tr>
  );

  const chartData = shown.map((r) => ({ name: r.name, netRevenue: r.netRevenue, grossProfit: r.grossProfit, margin: r.grossMargin }));
  const anyNegative = shown.some((r) => r.grossProfit < 0);

  return (
    <div className="space-y-4">
      <Callout tone="info" title="High revenue is not the same as high profit">
        A product can bring in a lot of revenue but keep little of it once product costs, discounts and refunds are taken off. Compare each product&apos;s share of net revenue with its share of gross profit. Payment fees and
        fulfilment are charged per order, not per product, so they are not split across products here.
      </Callout>

      <fieldset className="rounded-xl border border-line bg-surface px-5 py-4 shadow-card">
        <legend className="px-1 text-sm font-semibold text-ink">Products shown in the chart and table</legend>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
          {ds.products.map((p) => (
            <label key={p.product_id} className="inline-flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" checked={visible.includes(p.product_id)} onChange={() => toggle(p.product_id)} className="h-4 w-4 accent-forest" aria-describedby={`${groupId}-hint`} />
              {p.name}
            </label>
          ))}
          <button type="button" onClick={() => setVisible(ds.products.map((p) => p.product_id))} className="text-sm font-medium text-forest underline">
            Show all
          </button>
        </div>
        <p id={`${groupId}-hint`} className="mt-2 text-xs text-ink-muted">
          The &quot;All products&quot; total row always includes every product, so it matches the Overview.
        </p>
      </fieldset>

      {shown.length === 0 ? (
        <EmptyState title="No products selected">Tick at least one product above.</EmptyState>
      ) : (
        <ChartCard
          title="Net revenue and gross profit by product"
          description={`${formatRange(range)}. The gap between the two bars is product cost (COGS). A tall revenue bar with a short profit bar means a low gross margin.`}
          chartLabel="Grouped bar chart of net revenue and gross profit for each selected product. Use the Table tab for exact values."
          chart={
            <>
              <Legend
                items={[
                  { name: "Net revenue", color: SERIES[1], kind: "box" },
                  { name: "Gross profit", color: SERIES[0], kind: "box" },
                ]}
              />
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }} barGap={2}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" {...axisProps} interval={0} />
                    <YAxis {...axisProps} tickFormatter={(v) => moneyShort(v)} width={64} />
                    {anyNegative && <ReferenceLine y={0} stroke="#7d756a" />}
                    <Tooltip cursor={{ fill: "rgba(30,92,63,0.06)" }} content={makeTooltip((v) => money(v), undefined, (p) => `Gross margin ${pct(p.margin as number | null)}`)} />
                    <Bar dataKey="netRevenue" name="Net revenue" fill={SERIES[1]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="grossProfit" name="Gross profit" fill={SERIES[0]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          }
          table={<ProductSummaryTable rows={shown} />}
          footnote="Amounts in £ (GBP, excl. VAT)."
        />
      )}

      <Card>
        <SectionHeading
          title="Product performance"
          description={
            <>
              {formatRange(range)}
              {previous ? ` · small figures under rates show the change in percentage points vs ${formatRange(previous)}` : ""}. Select a column heading to sort.
            </>
          }
        />
        {shown.length === 0 ? (
          <EmptyState title="No products selected" />
        ) : (
          <DataTable caption="Product performance" columns={columns} rows={shown} rowKey={(r) => r.productId} footer={footer} initialSort={{ key: "nr", dir: "desc" }} selectedKey={detailId} />
        )}
      </Card>

      <div className="grid gap-4 2xl:grid-cols-2">
        <CompareCard rows={rows} a={cmpA} b={cmpB} setA={setCmpA} setB={setCmpB} />
        <DetailCard productId={detailId} setProductId={setDetailId} row={rows.find((r) => r.productId === detailId)!} prev={prevById.get(detailId) ?? null} />
      </div>
    </div>
  );
}

function ProductSummaryTable({ rows }: { rows: ProductRow[] }) {
  const cols: Column<ProductRow>[] = [
    { key: "n", header: "Product", rowHeader: true, render: (r) => r.name },
    { key: "nr", header: "Net revenue", align: "right", render: (r) => money(r.netRevenue), sortValue: (r) => r.netRevenue },
    { key: "gp", header: "Gross profit", align: "right", render: (r) => money(r.grossProfit), sortValue: (r) => r.grossProfit },
    { key: "gm", header: "Gross margin", align: "right", render: (r) => pct(r.grossMargin), sortValue: (r) => r.grossMargin },
  ];
  return <DataTable caption="Net revenue and gross profit by product" columns={cols} rows={rows} rowKey={(r) => r.productId} dense />;
}

const COMPARE_METRICS: { label: string; get: (r: ProductRow) => number | null; fmt: (v: number | null) => string; diff: (a: number | null, b: number | null) => string }[] = [
  { label: "List price", get: (r) => r.listPrice, fmt: money, diff: (a, b) => (a === null || b === null ? "n/a" : signedMoney(b - a)) },
  { label: "Unit cost", get: (r) => r.unitCost, fmt: money, diff: (a, b) => (a === null || b === null ? "n/a" : signedMoney(b - a)) },
  { label: "Units sold", get: (r) => r.units, fmt: count, diff: (a, b) => (a === null || b === null ? "n/a" : `${b - a >= 0 ? "+" : "−"}${count(Math.abs(b - a))}`) },
  { label: "Unit return rate", get: (r) => r.returnRate, fmt: (v) => pct(v), diff: (a, b) => pp(ppDiff(b, a)) },
  { label: "Discount rate", get: (r) => r.discountRate, fmt: (v) => pct(v), diff: (a, b) => pp(ppDiff(b, a)) },
  { label: "Net revenue", get: (r) => r.netRevenue, fmt: money, diff: (a, b) => (a === null || b === null ? "n/a" : signedMoney(b - a)) },
  { label: "Gross profit", get: (r) => r.grossProfit, fmt: money, diff: (a, b) => (a === null || b === null ? "n/a" : signedMoney(b - a)) },
  { label: "Gross margin", get: (r) => r.grossMargin, fmt: (v) => pct(v), diff: (a, b) => pp(ppDiff(b, a)) },
  { label: "Share of net revenue", get: (r) => r.revenueShare, fmt: (v) => pct(v), diff: (a, b) => pp(ppDiff(b, a)) },
  { label: "Share of gross profit", get: (r) => r.grossProfitShare, fmt: (v) => pct(v), diff: (a, b) => pp(ppDiff(b, a)) },
];

function CompareCard({ rows, a, b, setA, setB }: { rows: ProductRow[]; a: string; b: string; setA: (v: string) => void; setB: (v: string) => void }) {
  const id = useId();
  const ra = rows.find((r) => r.productId === a)!;
  const rb = rows.find((r) => r.productId === b)!;
  return (
    <Card>
      <SectionHeading title="Compare two products" description="Side by side for the selected dates. Differences are the second product minus the first; rate differences are in percentage points (pp)." />
      <div className="mb-4 flex flex-wrap gap-4">
        {[
          { v: a, set: setA, label: "First product" },
          { v: b, set: setB, label: "Second product" },
        ].map((s, i) => (
          <div key={i} className="flex flex-col">
            <label htmlFor={`${id}-${i}`} className="mb-1 text-xs font-medium text-ink-2">
              {s.label}
            </label>
            <select id={`${id}-${i}`} value={s.v} onChange={(e) => s.set(e.target.value)} className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-sm">
              {rows.map((r) => (
                <option key={r.productId} value={r.productId}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Comparison of {ra.name} and {rb.name}
          </caption>
          <thead className="bg-sunken text-xs uppercase tracking-wide text-ink-2">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">Measure</th>
              <th scope="col" className="px-3 py-2 text-right">{ra.name}</th>
              <th scope="col" className="px-3 py-2 text-right">{rb.name}</th>
              <th scope="col" className="px-3 py-2 text-right">Difference</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_METRICS.map((m) => (
              <tr key={m.label} className="border-t border-line">
                <th scope="row" className="px-3 py-2 text-left font-medium text-ink">{m.label}</th>
                <td className="px-3 py-2 text-right text-ink-2 num">{m.fmt(m.get(ra))}</td>
                <td className="px-3 py-2 text-right text-ink-2 num">{m.fmt(m.get(rb))}</td>
                <td className="px-3 py-2 text-right text-ink-2 num">{a === b ? "—" : m.diff(m.get(ra), m.get(rb))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DetailCard({ productId, setProductId, row, prev }: { productId: string; setProductId: (v: string) => void; row: ProductRow; prev: ProductRow | null }) {
  const ds = useDataset();
  const { range, previous } = useDashboard();
  const id = useId();
  const trend = useMemo(() => productTrend(ds, productId, range), [ds, productId, range]);
  const data = trend.map((b) => ({ label: b.partial ? `${b.label}*` : b.label, period: formatRange(b) + (b.partial ? " (partial)" : ""), netRevenue: b.totals.netRevenue, grossProfit: b.totals.grossProfit }));
  const cols: Column<ProductTrendPoint>[] = [
    { key: "p", header: "Period", rowHeader: true, render: (b) => `${formatRange(b)}${b.partial ? " (partial)" : ""}` },
    { key: "u", header: "Units", align: "right", render: (b) => count(b.totals.units) },
    { key: "rr", header: "Return rate", align: "right", render: (b) => pct(b.returnRate) },
    { key: "dr", header: "Discount rate", align: "right", render: (b) => pct(b.discountRate) },
    { key: "nr", header: "Net revenue", align: "right", render: (b) => money(b.totals.netRevenue) },
    { key: "gp", header: "Gross profit", align: "right", render: (b) => money(b.totals.grossProfit) },
    { key: "gm", header: "Gross margin", align: "right", render: (b) => pct(b.grossMargin) },
  ];
  const nrChange = prev ? row.netRevenue - prev.netRevenue : null;
  return (
    <ChartCard
      title={`Product details: ${row.name}`}
      description={
        <>
          List price {money(row.listPrice)} · unit cost {money(row.unitCost)} · {count(row.units)} units sold in {formatRange(range)}
          {prev && previous && nrChange !== null && (
            <>
              {" "}
              · net revenue {signedMoney(nrChange)}
              {prev.netRevenue > 0 ? ` (${signedPct(nrChange / prev.netRevenue)})` : ""} vs {formatRange(previous)}
            </>
          )}
        </>
      }
      actions={
        <div className="flex flex-col">
          <label htmlFor={`${id}-p`} className="sr-only">
            Product to show details for
          </label>
          <select id={`${id}-p`} value={productId} onChange={(e) => setProductId(e.target.value)} className="h-8 rounded-md border border-line-strong bg-surface px-2 text-sm">
            {ds.products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      }
      chartLabel={`Line chart of ${row.name} net revenue and gross profit over time. Use the Table tab for units, return and discount rates.`}
      chart={
        <>
          <Legend
            items={[
              { name: "Net revenue", color: SERIES[1], dash: DASHES[1] },
              { name: "Gross profit", color: SERIES[0], dash: DASHES[0] },
            ]}
          />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
                <YAxis {...axisProps} tickFormatter={(v) => moneyShort(v)} width={64} />
                <Tooltip content={makeTooltip((v) => money(v), (_l, p) => String(p.period))} />
                <Line dataKey="netRevenue" name="Net revenue" stroke={SERIES[1]} strokeWidth={2} strokeDasharray={DASHES[1]} dot={{ r: 3, strokeWidth: 0, fill: SERIES[1] }} isAnimationActive={false} />
                <Line dataKey="grossProfit" name="Gross profit" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: SERIES[0] }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      }
      table={<DataTable caption={`${row.name} by period`} columns={cols} rows={trend} rowKey={(b) => b.key} dense />}
      footnote="Periods marked * are partial. Return and discount rates by period are in the Table tab."
    />
  );
}
