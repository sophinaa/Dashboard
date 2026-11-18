"use client";
import { useId, useRef, useState } from "react";
import { Card } from "./Card";
import { Icon } from "./Icon";

/**
 * A chart with an equivalent data table. Tabs follow the WAI-ARIA tabs pattern
 * (arrow keys move between "Chart" and "Table").
 */
export function ChartCard({
  title,
  description,
  chart,
  table,
  footnote,
  actions,
  className = "",
  chartLabel,
}: {
  title: string;
  description?: React.ReactNode;
  chart: React.ReactNode;
  table: React.ReactNode;
  footnote?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Text alternative summarising the chart for screen readers. */
  chartLabel: string;
}) {
  const [tab, setTab] = useState<"chart" | "table">("chart");
  const id = useId();
  const refs = [useRef<HTMLButtonElement>(null), useRef<HTMLButtonElement>(null)];
  const tabs = [
    { k: "chart" as const, label: "Chart", icon: "chart" },
    { k: "table" as const, label: "Table", icon: "table" },
  ];
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + 1) % 2;
    setTab(tabs[next].k);
    refs[next].current?.focus();
  };
  return (
    <Card className={className} aria-labelledby={`${id}-title`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
          {description && <div className="mt-0.5 text-sm leading-relaxed text-ink-muted">{description}</div>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <div role="tablist" aria-label={`${title}: view as`} className="inline-flex rounded-full bg-surface p-1">
            {tabs.map((t, i) => (
              <button
                key={t.k}
                ref={refs[i]}
                role="tab"
                type="button"
                id={`${id}-tab-${t.k}`}
                aria-selected={tab === t.k}
                aria-controls={`${id}-panel-${t.k}`}
                tabIndex={tab === t.k ? 0 : -1}
                onClick={() => setTab(t.k)}
                onKeyDown={(e) => onKey(e, i)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tab === t.k ? "bg-night text-white" : "text-ink-2 hover:text-ink"}`}
              >
                <Icon name={t.icon} className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div role="tabpanel" id={`${id}-panel-chart`} aria-labelledby={`${id}-tab-chart`} hidden={tab !== "chart"}>
        <figure aria-label={chartLabel} role="img" className="m-0 rounded-3xl bg-surface p-4">
          {chart}
        </figure>
      </div>
      <div role="tabpanel" id={`${id}-panel-table`} aria-labelledby={`${id}-tab-table`} hidden={tab !== "table"}>
        {table}
      </div>
      {footnote && <div className="mt-3 px-1 text-xs leading-relaxed text-ink-muted">{footnote}</div>}
    </Card>
  );
}
