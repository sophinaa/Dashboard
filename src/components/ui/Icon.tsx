/** Minimal inline icon set (stroke icons, 20px grid). Decorative unless a label is given. */
const PATHS: Record<string, string> = {
  overview: "M3 13h4v5H3zM8.5 8h4v10h-4zM14 3h4v15h-4z",
  products: "M4 7l6-3 6 3v7l-6 3-6-3zM4 7l6 3 6-3M10 10v7",
  journey: "M3 5h14l-5 6v5l-4 2v-7z",
  marketing: "M3 9v3h3l6 4V5L6 9zM15 7.5a3 3 0 010 5",
  experiments: "M8 3v5L4 16a1.5 1.5 0 001.3 2h9.4A1.5 1.5 0 0016 16l-4-8V3M7 3h6",
  info: "M10 18a8 8 0 100-16 8 8 0 000 16zM10 9v5M10 6.2v.1",
  warning: "M10 3l8 14H2zM10 8v4M10 14.5v.1",
  up: "M10 15V5M5 10l5-5 5 5",
  down: "M10 5v10M5 10l5 5 5-5",
  flat: "M4 10h12",
  sparkle: "M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8zM16 14l.7 1.8 1.8.7-1.8.7L16 19l-.7-1.8-1.8-.7 1.8-.7z",
  close: "M5 5l10 10M15 5L5 15",
  send: "M3 10l14-7-5 14-2-6z",
  settings: "M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4",
  check: "M4 10.5l4 4 8-9",
  calendar: "M3 5h14v12H3zM3 8h14M7 3v4M13 3v4",
  sortAsc: "M10 4l4 5H6z",
  sortDesc: "M10 16l4-5H6z",
  sortNone: "M10 3l3.5 4.5h-7zM10 17l3.5-4.5h-7z",
  table: "M3 4h14v12H3zM3 8h14M3 12h14M8 4v12",
  chart: "M3 17h14M5 14l4-5 3 3 4-6",
  external: "M11 3h6v6M17 3l-8 8M14 11v6H3V6h6",
  pound: "M13.5 5.5A3 3 0 008 6.5V15M5.5 15h9M5.5 10.5h6",
  bag: "M4 7h12l-1 10H5zM7.5 7V5.5a2.5 2.5 0 015 0V7",
  receipt: "M5 3h10v14l-2-1.3L11 17l-2-1.3L7 17l-2-1.3zM8 7h4M8 10h4",
  leaf: "M4 16C4 9 9 4 16 4c0 7-5 12-12 12zM4 16l6-6",
  percent: "M5 15L15 5M6.5 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM13.5 15a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  scale: "M10 3v14M6 17h8M4 6h12M4 6l-2 5a2.5 2.5 0 004 0zM16 6l-2 5a2.5 2.5 0 004 0z",
  clicks: "M7 3v3M3 7h3M4.5 4.5l2 2M9 9l7 3-3 1-1 3z",
  store: "M3 8l1.5-4h11L17 8M3 8h14M3 8v8h14V8M8 16v-4h4v4",
};

export function Icon({ name, className = "h-5 w-5", label }: { name: keyof typeof PATHS | string; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}
