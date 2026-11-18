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

export function AppShell({ children }: { children: React.ReactNode }) {
  const study = useStudy();
  const { load, retry } = useDashboard();
  const pathname = usePathname();
  const current = NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href))) ?? NAV[0];
  const [aiOpen, setAiOpen] = useState(false);
  const aiButton = useRef<HTMLButtonElement>(null);
  const closeAi = useCallback(() => {
    setAiOpen(false);
    aiButton.current?.focus();
  }, []);

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow">
        Skip to main content
      </a>
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-52 lg:flex-none lg:border-b-0 lg:border-r">
        <Sidebar />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-b border-line bg-surface/95 px-5 py-3 backdrop-blur lg:sticky lg:top-0 lg:z-20 lg:px-7">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-semibold tracking-tight text-ink">{current.label}</h1>
              <span className="text-ink-muted" aria-hidden>
                ·
              </span>
              <span className="text-sm font-medium text-ink-2">
                Shop: <span className="text-ink">Willow &amp; Co</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-caution-line bg-caution-bg px-2.5 py-0.5 text-xs font-semibold text-caution-ink">
                <Icon name="info" className="h-3.5 w-3.5" />
                Synthetic data
              </span>
              {!study.participantMode && (
                <span className="rounded-full border border-line bg-sunken px-2.5 py-0.5 text-xs font-medium text-ink-2">
                  Researcher view · Dataset {study.dataset} · AI {study.ai ? "on" : "off"}
                </span>
              )}
            </div>
            {study.ai && (
              <button
                ref={aiButton}
                type="button"
                onClick={() => setAiOpen((o) => !o)}
                aria-expanded={aiOpen}
                aria-controls="ai-panel"
                className="inline-flex items-center gap-2 rounded-lg bg-forest px-3.5 py-2 text-sm font-medium text-white hover:bg-forest-700"
              >
                <Icon name="sparkle" className="h-4 w-4" />
                {aiOpen ? "Hide AI assistant" : "Ask the AI assistant"}
              </button>
            )}
          </div>
          <FilterBar />
        </header>
        <div>
          <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-5 py-5 lg:px-7 lg:py-5">
            {load.status === "loading" && <LoadingState />}
            {load.status === "error" && <ErrorState message={load.message} onRetry={retry} />}
            {load.status === "ready" && children}
          </main>
          {/* Kept mounted while hidden so the conversation survives page changes. Not rendered at all in the no-AI condition. */}
          {study.ai && load.status === "ready" && <AiPanel open={aiOpen} page={current.page} datasetId={study.dataset} onClose={closeAi} />}
        </div>
      </div>
    </div>
  );
}
