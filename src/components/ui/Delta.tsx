import { Icon } from "./Icon";

/**
 * Change indicator. Direction is shown with an arrow and a signed value (never colour
 * alone). Deltas are deliberately neutral in colour: whether a change is "good" depends
 * on context (e.g. higher spend), which the owner should judge.
 */
export function Delta({ value, text, srPrefix = "Change" }: { value: number | null; text: string; srPrefix?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className="text-xs text-ink-muted">No comparison</span>;
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const word = dir === "up" ? "increase" : dir === "down" ? "decrease" : "no change";
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 text-xs font-medium text-ink-2 num">
      <Icon name={dir} className="h-3.5 w-3.5" />
      <span className="sr-only">{`${srPrefix}: ${word}, `}</span>
      {text}
    </span>
  );
}
