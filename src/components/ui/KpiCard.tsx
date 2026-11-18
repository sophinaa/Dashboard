import { Delta } from "./Delta";
import { Icon } from "./Icon";
import { InfoTip } from "./InfoTip";

export type Tone = "sage" | "sky" | "butter" | "blush" | "lilac" | "sand";

const TONE: Record<Tone, string> = {
  sage: "bg-tile-sage",
  sky: "bg-tile-sky",
  butter: "bg-tile-butter",
  blush: "bg-tile-blush",
  lilac: "bg-tile-lilac",
  sand: "bg-tile-sand",
};

/**
 * Headline figure tile. The tile colour identifies the measure (it is the same colour on
 * every page and in every period); it never signals good or bad.
 */
export function KpiCard({
  label,
  value,
  help,
  delta,
  deltaText,
  previousText,
  sub,
  tone = "sand",
  icon = "info",
}: {
  label: string;
  value: string;
  help: string;
  delta?: number | null;
  deltaText?: string;
  previousText?: string | null;
  sub?: React.ReactNode;
  tone?: Tone;
  icon?: string;
}) {
  return (
    <div className={`flex flex-col rounded-3xl p-4 ${TONE[tone]}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <span aria-hidden className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-surface/80 text-ink">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="leading-tight">{label}</span>
        <span className="ml-auto">
          <InfoTip text={help} label={label} />
        </span>
      </div>
      <p className="mt-3 text-[1.75rem] font-semibold leading-none tracking-tight text-ink num">{value}</p>
      {delta !== undefined && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Delta value={delta ?? null} text={deltaText ?? ""} srPrefix={`${label} change`} />
          {previousText && <span className="text-xs text-ink-2 num">{previousText}</span>}
        </div>
      )}
      {sub && <div className="mt-2 text-xs text-ink-2">{sub}</div>}
    </div>
  );
}
