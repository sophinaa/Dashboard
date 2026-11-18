"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useDashboard } from "@/components/providers/DashboardProvider";
import { Icon } from "@/components/ui/Icon";
import { formatRange } from "@/lib/metrics/dates";
import type { PageId } from "@/lib/ai/context";
import type { ScenarioResult } from "@/lib/ai/scenarios";
import type { DatasetId } from "@/lib/types";

const PAGE_NAMES: Record<PageId, string> = {
  overview: "Overview",
  products: "Products",
  journey: "Customer journey",
  marketing: "Marketing",
  experiments: "Experiments",
};

const SUGGESTIONS = [
  "Revenue increased, but did profitability improve?",
  "What should I consider before changing my marketing budget?",
  "Which products need attention, and what evidence supports that?",
  "What can we conclude from this banner experiment?",
];

interface Turn {
  role: "user" | "assistant";
  content: string;
  scenarios?: ScenarioResult[];
  /** The page and period the answer was generated for. */
  context?: string;
  truncated?: boolean;
}

type Status = { kind: "checking" } | { kind: "ready" } | { kind: "unavailable"; reason: string };

const MAX_CHARS = 2000;

export function AiPanel({ open, page, datasetId, onClose }: { open: boolean; page: PageId; datasetId: DatasetId; onClose: () => void }) {
  const { range, comparison, previous } = useDashboard();
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/ai/status", { cache: "no-store" })
      .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
      .then(({ ok, b }) => {
        if (ok && b.available) setStatus({ kind: "ready" });
        else setStatus({ kind: "unavailable", reason: "No AI model is configured on the server, so explanations and chat cannot be generated in this session." });
      })
      .catch(() => setStatus({ kind: "unavailable", reason: "The AI service could not be reached." }));
  }, []);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const contextLabel = `${PAGE_NAMES[page]} · ${formatRange(range)}${previous ? ` vs ${formatRange(previous)}` : ""}`;

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy || status.kind !== "ready") return;
    if (q.length > MAX_CHARS) return setError(`Please keep questions under ${MAX_CHARS} characters.`);
    setError(null);
    const history: Turn[] = [...turns, { role: "user", content: q, context: contextLabel }];
    setTurns(history);
    setInput("");
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          datasetId,
          page,
          range,
          comparison,
          // Only the conversation text is sent; the server recalculates all figures.
          messages: history.slice(-12).map((t) => ({ role: t.role, content: t.content })),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `The AI request failed (HTTP ${res.status}).`);
      setTurns((t) => [...t, { role: "assistant", content: body.text, scenarios: body.scenarios, context: contextLabel, truncated: body.truncated }]);
    } catch (e) {
      if (ac.signal.aborted) return;
      setError(e instanceof Error ? e.message : "The AI request failed.");
      setTurns((t) => t.slice(0, -1));
      setInput(q);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      id="ai-panel"
      hidden={!open}
      aria-labelledby="ai-panel-title"
      className="fixed inset-y-0 right-0 z-40 w-full border-l border-line bg-surface shadow-2xl sm:w-[440px]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="ai-panel-title" ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-base font-semibold text-ink">
              <Icon name="sparkle" className="h-4 w-4 text-forest" /> AI assistant
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">Explains the figures on screen. It can make mistakes — check answers against the charts.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-ink-muted hover:bg-sunken hover:text-ink" aria-label="Close AI assistant">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4" aria-live="polite" aria-busy={busy}>
          {status.kind === "checking" && <p className="text-sm text-ink-muted">Checking AI availability…</p>}
          {status.kind === "unavailable" && (
            <div className="rounded-lg border border-caution-line bg-caution-bg p-4 text-sm text-caution-ink">
              <p className="flex items-center gap-2 font-semibold">
                <Icon name="warning" className="h-4 w-4" /> AI unavailable
              </p>
              <p className="mt-1">{status.reason} The dashboard itself works normally.</p>
            </div>
          )}
          {status.kind === "ready" && turns.length === 0 && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => send(`Explain what the ${PAGE_NAMES[page]} page shows for the selected period.`)}
                className="w-full rounded-lg border border-forest bg-forest-50 px-4 py-3 text-left text-sm font-medium text-forest hover:bg-forest-100"
              >
                Explain this page
                <span className="block text-xs font-normal text-ink-2">{contextLabel}</span>
              </button>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Example questions</p>
                <ul className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => send(s)} className="w-full rounded-lg border border-line px-3 py-2 text-left text-sm text-ink-2 hover:border-forest hover:text-ink">
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <ol className="space-y-4">
            {turns.map((t, i) => (
              <li key={i} className={t.role === "user" ? "ml-8" : ""}>
                {t.role === "user" ? (
                  <div className="rounded-lg bg-sunken px-3 py-2 text-sm text-ink">
                    <span className="sr-only">You asked: </span>
                    {t.content}
                  </div>
                ) : (
                  <div className="rounded-lg border border-line px-4 py-3">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-forest">
                      <Icon name="sparkle" className="h-3.5 w-3.5" /> AI-generated answer
                    </p>
                    <p className="mb-2 text-xs text-ink-muted">Based on: {t.context}</p>
                    <div className="prose-ai text-sm leading-relaxed text-ink-2">
                      <ReactMarkdown>{t.content}</ReactMarkdown>
                    </div>
                    {t.truncated && <p className="mt-2 text-xs text-caution-ink">This answer was cut short.</p>}
                    {t.scenarios?.map((s, j) => <ScenarioCard key={j} s={s} />)}
                  </div>
                )}
              </li>
            ))}
          </ol>
          {busy && (
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted" role="status">
              <span className="h-2 w-2 animate-pulse rounded-full bg-forest" aria-hidden /> Working on an answer… this can take up to a minute.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-md border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-ink">
              {error}
            </p>
          )}
          <div ref={endRef} />
        </div>

        {status.kind === "ready" && (
          <form
            className="border-t border-line px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="ai-input" className="mb-1 block text-xs font-medium text-ink-2">
              Ask about {PAGE_NAMES[page].toLowerCase()} or the shop
            </label>
            <div className="flex gap-2">
              <textarea
                id="ai-input"
                rows={2}
                maxLength={MAX_CHARS}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                aria-describedby="ai-privacy"
                className="min-h-[44px] flex-1 resize-y rounded-md border border-line-strong bg-surface px-3 py-2 text-sm"
                placeholder="e.g. Why did gross margin change?"
              />
              <button type="submit" disabled={busy || !input.trim()} className="inline-flex items-center gap-1.5 self-end rounded-md bg-forest px-3 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-50">
                <Icon name="send" className="h-4 w-4" />
                Send
              </button>
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <p id="ai-privacy" className="text-xs leading-relaxed text-ink-muted">
                Questions and the shop figures are sent to an AI provider to generate answers. StoreScope does not save them. Please don&apos;t include personal information.
              </p>
              {turns.length > 0 && (
                <button type="button" onClick={() => { abortRef.current?.abort(); setTurns([]); setError(null); setBusy(false); }} className="flex-none text-xs font-medium text-ink-2 underline hover:text-ink">
                  Clear chat
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </aside>
  );
}

function ScenarioCard({ s }: { s: ScenarioResult }) {
  return (
    <div className="mt-3 rounded-lg border border-caution-line bg-caution-bg/60 p-3 text-xs text-ink-2">
      <p className="flex items-center gap-1.5 font-semibold text-caution-ink">
        <Icon name="warning" className="h-3.5 w-3.5" /> Hypothetical scenario — not a prediction
      </p>
      <p className="mt-1 font-medium text-ink">{s.title}</p>
      <p className="text-ink-muted">Calculated by the dashboard for {s.period}</p>
      <p className="mt-2 font-semibold">Assumptions</p>
      <ul className="ml-4 list-disc space-y-0.5">
        {s.assumptions.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{s.title}: actual versus scenario</caption>
        <thead>
          <tr className="border-b border-caution-line">
            <th scope="col" className="py-1 font-semibold">Measure</th>
            <th scope="col" className="py-1 text-right font-semibold">Actual</th>
            <th scope="col" className="py-1 text-right font-semibold">Scenario</th>
            <th scope="col" className="py-1 text-right font-semibold">Difference</th>
          </tr>
        </thead>
        <tbody>
          {s.rows.map((r) => (
            <tr key={r.label} className="border-b border-caution-line/50">
              <th scope="row" className="py-1 font-normal">{r.label}</th>
              <td className="py-1 text-right num">{r.actual}</td>
              <td className="py-1 text-right num">{r.scenario}</td>
              <td className="py-1 text-right num">{r.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 italic">{s.caveat}</p>
    </div>
  );
}
