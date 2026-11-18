"use client";
/**
 * Shared chart styling. Series colours are validated for colour-vision deficiency
 * (adjacent pairs ΔE ≥ 8 under protan/deutan simulation) and ≥3:1 against the surface.
 * Identity is never colour-only: lines also differ by dash pattern and markers, and
 * every chart has a legend plus a table view.
 */
import type { TooltipProps } from "recharts";

export const SERIES = ["#1e7a4c", "#3b6fc0", "#c8602c", "#8a5cc2"] as const;
export const DASHES = ["0", "6 4", "2 3", "10 3 2 3"] as const;
export const GRID = "#ebe4d6";
export const AXIS = "#5d645d";
export const NEUTRAL = "#9a9283";

export const axisProps = {
  tick: { fill: AXIS, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "#cfc6b7" },
} as const;

export interface TooltipRow {
  name: string;
  value: string;
  color?: string;
  dash?: string;
}

export function ChartTooltip({ title, rows, note }: { title: string; rows: TooltipRow[]; note?: string }) {
  return (
    <div className="rounded-2xl bg-night px-3.5 py-2.5 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-white">{title}</p>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-night-text">
              {r.color && (
                <svg width="16" height="8" aria-hidden>
                  <line x1="0" y1="4" x2="16" y2="4" stroke={r.color} strokeWidth="2.5" strokeDasharray={r.dash && r.dash !== "0" ? r.dash : undefined} />
                </svg>
              )}
              {r.name}
            </span>
            <span className="font-semibold text-white num">{r.value}</span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-1 max-w-[16rem] text-night-muted">{note}</p>}
    </div>
  );
}

/** Generic Recharts tooltip adapter: formats each payload entry with `format`. */
export function makeTooltip(format: (v: number, key: string) => string, titleOf?: (label: string, payload: Record<string, unknown>) => string, noteOf?: (payload: Record<string, unknown>) => string | undefined) {
  return function TooltipContent({ active, payload, label }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    const p = (payload[0]?.payload ?? {}) as Record<string, unknown>;
    return (
      <ChartTooltip
        title={titleOf ? titleOf(String(label), p) : String(label)}
        rows={payload.map((e) => ({
          name: String(e.name),
          value: typeof e.value === "number" ? format(e.value, String(e.dataKey)) : Array.isArray(e.value) ? "" : String(e.value ?? "n/a"),
          color: (e.color as string) ?? undefined,
          dash: (e as unknown as { strokeDasharray?: string }).strokeDasharray,
        }))}
        note={noteOf?.(p)}
      />
    );
  };
}

/** Legend rendered as HTML so it is readable, wraps, and shows dash patterns. */
export function Legend({ items }: { items: { name: string; color: string; dash?: string; kind?: "line" | "box" }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2" aria-hidden>
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-1.5">
          {i.kind === "box" ? (
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: i.color }} />
          ) : (
            <svg width="22" height="10">
              <line x1="0" y1="5" x2="22" y2="5" stroke={i.color} strokeWidth="2.5" strokeDasharray={i.dash && i.dash !== "0" ? i.dash : undefined} />
              <circle cx="11" cy="5" r="3" fill={i.color} />
            </svg>
          )}
          {i.name}
        </li>
      ))}
    </ul>
  );
}
