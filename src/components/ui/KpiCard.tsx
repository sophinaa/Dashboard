import { Delta } from "./Delta";
import { InfoTip } from "./InfoTip";

export function KpiCard({
  label,
  value,
  help,
  delta,
  deltaText,
  previousText,
  sub,
}: {
  label: string;
  value: string;
  help: string;
  delta?: number | null;
  deltaText?: string;
  previousText?: string | null;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-surface p-3.5 shadow-card">
      <div className="flex items-center text-sm font-medium text-ink-2">
        {label}
        <InfoTip text={help} label={label} />
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight text-ink num">{value}</p>
      {delta !== undefined && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Delta value={delta ?? null} text={deltaText ?? ""} srPrefix={`${label} change`} />
          {previousText && <span className="text-xs text-ink-muted num">{previousText}</span>}
        </div>
      )}
      {sub && <div className="mt-2 text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}
