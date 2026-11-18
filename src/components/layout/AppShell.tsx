"use client";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Sidebar, NAV } from "./Sidebar";
import { FilterBar } from "./FilterBar";
import { useStudy } from "@/components/providers/StudyProvider";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { AiPanel } from "@/components/ai/AiPanel";
import { Icon } from "@/components/ui/Icon";
import { formatRange } from "@/lib/metrics/dates";

export function AppShell({ children }: { children: React.ReactNode }) {
  const study = useStudy();
  const { load, retry, range, previous } = useDashboard();
  const pathname = usePathname();
  const current = NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href))) ?? NAV[0];
  const [aiOpen, setAiOpen] = useState(false);
  const aiButton = useRef<HTMLButtonElement>(null);
  const closeAi = useCallback(() => {
    setAiOpen(false);
    aiButton.current?.focus();
  }, []);

  return (
    <div className="min-h-screen p-3 lg:flex lg:gap-3">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow">
        Skip to main content
      </a>
      <aside className="mb-3 rounded-4xl bg-night lg:sticky lg:top-3 lg:mb-0 lg:h-[calc(100vh-1.5rem)] lg:w-60 lg:flex-none lg:overflow-y-auto">
        <Sidebar />
      </aside>
      <div className="min-w-0 flex-1 px-2 lg:px-5">
        <header className="pb-5 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterBar />
            <div className="flex flex-wrap items-center gap-2">
              {!study.participantMode && (
                <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2">
                  Researcher view: dataset {study.dataset}, AI {study.ai ? "on" : "off"}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-caution-bg px-3 py-1.5 text-xs font-semibold text-caution-ink">
                <Icon name="info" className="h-3.5 w-3.5" />
                Synthetic data
              </span>
              {study.ai && (
                <button
                  ref={aiButton}
                  type="button"
                  onClick={() => setAiOpen((o) => !o)}
                  aria-expanded={aiOpen}
                  aria-controls="ai-panel"
                  className="inline-flex items-center gap-2 rounded-full bg-night px-4 py-2 text-sm font-medium text-white hover:bg-night-2"
                >
                  <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-tile-blush text-ink">
                    <Icon name="sparkle" className="h-3.5 w-3.5" />
                  </span>
                  {aiOpen ? "Hide assistant" : "Ask the assistant"}
                </button>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
            <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-ink">{current.heading}</h1>
            <p className="pb-1 text-sm text-ink-muted" aria-live="polite">
              {current.label} for <span className="font-medium text-ink">{formatRange(range)}</span>
              {previous && <> compared with {formatRange(previous)}</>}
            </p>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="pb-8">
          {load.status === "loading" && <LoadingState />}
          {load.status === "error" && <ErrorState message={load.message} onRetry={retry} />}
          {load.status === "ready" && children}
        </main>
        {/* Kept mounted while hidden so the conversation survives page changes. Not rendered at all in the no-AI condition. */}
        {study.ai && load.status === "ready" && <AiPanel open={aiOpen} page={current.page} datasetId={study.dataset} onClose={closeAi} />}
      </div>
    </div>
  );
}
