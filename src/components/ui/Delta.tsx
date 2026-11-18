import { Icon } from "./Icon";

/**
 * Change indicator: arrow + signed value + screen-reader word, never colour alone.
 * Deliberately neutral in colour: whether a change is good depends on context.
 */
export function Delta({ value, text, srPrefix = "Change" }: { value: number | null; text: string; srPrefix?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className="text-xs text-ink-2">No comparison</span>;
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const word = dir === "up" ? "increase" : dir === "down" ? "decrease" : "no change";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink num">
      <Icon name={dir} className="h-3.5 w-3.5" />
      <span className="sr-only">{`${srPrefix}: ${word}, `}</span>
      {text}
    </span>
  );
}
