"use client";
import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { InfoTip } from "./InfoTip";

export interface Column<T> {
  key: string;
  header: string;
  /** Definition shown in a tooltip next to the header. */
  help?: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  /** Provide to make the column sortable. Null values sort last. */
  sortValue?: (row: T) => number | string | null;
  /** Mark as the row header (first column, read by screen readers per row). */
  rowHeader?: boolean;
}

interface Props<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  footer?: React.ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
  captionHidden?: boolean;
  selectedKey?: string | null;
  dense?: boolean;
}

export function DataTable<T>({ caption, columns, rows, rowKey, footer, initialSort, captionHidden = true, selectedKey, dense }: Props<T>) {
  const [sort, setSort] = useState(initialSort ?? null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const f = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = f(a);
      const vb = f(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const cmp = typeof va === "string" ? va.localeCompare(String(vb)) : va - (vb as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const pad = dense ? "px-2.5 py-1" : "px-2.5 py-1.5";

  return (
    <div className="overflow-x-auto rounded-3xl bg-surface p-1.5" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full border-collapse text-sm">
        <caption className={captionHidden ? "sr-only" : "px-3 py-2 text-left text-sm font-medium text-ink"}>{caption}</caption>
        <thead className="text-xs text-ink-muted">
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const ariaSort = active ? (sort!.dir === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined;
              return (
                <th key={c.key} scope="col" aria-sort={ariaSort} className={`${pad} align-bottom font-medium leading-snug ${c.align === "right" ? "text-right" : "text-left"}`}>
                  <span className={`inline-flex items-center gap-0.5 ${c.align === "right" ? "flex-row-reverse" : ""}`}>
                    {c.sortValue ? (
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 rounded font-medium hover:text-ink ${c.align === "right" ? "text-right" : "text-left"}`}
                        onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "desc" ? "asc" : "desc" } : { key: c.key, dir: "desc" }))}
                      >
                        {c.header}
                        <Icon name={active ? (sort!.dir === "asc" ? "sortAsc" : "sortDesc") : "sortNone"} className="h-3.5 w-3.5 flex-none" />
                        <span className="sr-only">{active ? `, sorted ${sort!.dir === "asc" ? "ascending" : "descending"}. Activate to reverse.` : ", activate to sort"}</span>
                      </button>
                    ) : (
                      c.header
                    )}
                    {c.help && <InfoTip text={c.help} label={c.header} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const k = rowKey(row);
            const selected = selectedKey === k;
            return (
              <tr key={k} className={`border-t border-line/70 ${selected ? "bg-tile-sage/50" : ""}`}>
                {columns.map((c) => {
                  const cls = `${pad} ${c.align === "right" ? "text-right num" : "text-left"} align-top`;
                  return c.rowHeader ? (
                    <th key={c.key} scope="row" className={`${cls} font-medium text-ink`}>
                      {c.render(row)}
                    </th>
                  ) : (
                    <td key={c.key} className={`${cls} text-ink-2`}>
                      {c.render(row)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        {footer && <tfoot className="bg-panel/70 font-medium text-ink">{footer}</tfoot>}
      </table>
    </div>
  );
}
