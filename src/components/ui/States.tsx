import { Icon } from "./Icon";

export function LoadingState({ label = "Loading shop data…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-surface" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-line bg-surface" />
      <p className="text-sm text-ink-muted" aria-hidden>
        {label}
      </p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-danger-line bg-danger-bg p-6 text-danger-ink">
      <div className="flex items-center gap-2 font-semibold">
        <Icon name="warning" /> Something went wrong
      </div>
      <p className="mt-2 text-sm">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 rounded-md border border-danger-ink/40 bg-surface px-3 py-1.5 text-sm font-medium hover:bg-white">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-canvas px-4 py-8 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-muted">{children}</div>}
    </div>
  );
}
