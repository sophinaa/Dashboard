import { Icon } from "./Icon";

const STYLES = {
  info: { box: "border-info-line bg-info-bg text-info-ink", icon: "info", label: "Note" },
  caution: { box: "border-caution-line bg-caution-bg text-caution-ink", icon: "warning", label: "Caution" },
  danger: { box: "border-danger-line bg-danger-bg text-danger-ink", icon: "warning", label: "Problem" },
} as const;

/** Message box that carries meaning with an icon and a text label, not colour alone. */
export function Callout({ tone = "info", title, children, className = "" }: { tone?: keyof typeof STYLES; title?: string; children: React.ReactNode; className?: string }) {
  const s = STYLES[tone];
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed ${s.box} ${className}`} role={tone === "danger" ? "alert" : undefined}>
      <Icon name={s.icon} className="mt-0.5 h-5 w-5 flex-none" />
      <div>
        <p className="font-semibold">{title ?? s.label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}
