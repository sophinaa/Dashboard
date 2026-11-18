import { Icon } from "./Icon";

export function LoadingState({ label = "Loading shop data…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl bg-panel" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-4xl bg-panel" />
      <p className="text-sm text-ink-muted" aria-hidden>
        {label}
      </p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-4xl border border-danger-line bg-danger-bg p-6 text-danger-ink">
      <div className="flex items-center gap-2 font-semibold">
        <Icon name="warning" /> Something went wrong
      </div>
      <p className="mt-2 text-sm">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 rounded-full bg-night px-4 py-2 text-sm font-medium text-white hover:bg-night-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line-strong bg-surface px-4 py-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-muted">{children}</div>}
    </div>
  );
}
