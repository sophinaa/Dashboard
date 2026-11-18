"use client";
import { useId, useState } from "react";
import Link from "next/link";
import type { StudyConfig } from "@/lib/study/config";
import { Icon } from "@/components/ui/Icon";

/**
 * Researcher-only view for setting the evaluation condition. Not linked in participant
 * mode. Contains no answer guides or scenario descriptions.
 */
export function ResearcherSetup({ config, aiKeyConfigured, codeRequired, model }: { config: StudyConfig; aiKeyConfigured: boolean; codeRequired: boolean; model: string }) {
  const id = useId();
  const [dataset, setDataset] = useState(config.dataset);
  const [ai, setAi] = useState(config.ai);
  const [participantMode, setParticipantMode] = useState(config.participantMode);
  const [code, setCode] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "saving" | "error"; msg?: string }>({ kind: "idle" });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "saving" });
    try {
      const res = await fetch("/api/study", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataset, ai, participantMode, accessCode: code }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save.");
      try {
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
      // Full navigation so every provider, cached dataset and AI conversation is discarded.
      window.location.assign("/");
    } catch (err) {
      setState({ kind: "error", msg: err instanceof Error ? err.message : "Could not save." });
    }
  }

  const option = (name: string, value: string, checked: boolean, onChange: () => void, label: string, hint: string) => (
    <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${checked ? "border-forest bg-forest-50" : "border-line bg-surface"}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1 h-4 w-4 accent-forest" />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
    </label>
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm font-medium text-forest underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink">Researcher setup</h1>
      <p className="mt-2 text-sm text-ink-2">
        Choose the condition before a session. Saving reloads the dashboard and clears filters and any AI conversation. Current: dataset {config.dataset}, AI {config.ai ? "on" : "off"}, participant mode{" "}
        {config.participantMode ? "on" : "off"}.
      </p>

      <form onSubmit={save} className="mt-6 space-y-6">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-ink">Dataset</legend>
          {option(`${id}-ds`, "A", dataset === "A", () => setDataset("A"), "Dataset A", "Synthetic Willow & Co data, scenario A.")}
          {option(`${id}-ds`, "B", dataset === "B", () => setDataset("B"), "Dataset B", "Synthetic Willow & Co data, scenario B (same schema, different records).")}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-ink">AI condition</legend>
          {option(`${id}-ai`, "on", ai, () => setAi(true), "AI enabled", "AI assistant panel available: page explanations, questions and hypothetical scenarios.")}
          {option(`${id}-ai`, "off", !ai, () => setAi(false), "AI disabled", "No AI panel, no generated text; the AI endpoint refuses requests. Charts, tables, definitions and filters are identical.")}
          {ai && !aiKeyConfigured && (
            <p className="flex items-center gap-2 rounded-md border border-caution-line bg-caution-bg px-3 py-2 text-xs text-caution-ink">
              <Icon name="warning" className="h-4 w-4" /> No ANTHROPIC_API_KEY is set on the server: participants will see &quot;AI unavailable&quot;.
            </p>
          )}
          {ai && aiKeyConfigured && <p className="text-xs text-ink-muted">Model: {model}</p>}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-ink">Participant mode</legend>
          {option(`${id}-pm`, "on", participantMode, () => setParticipantMode(true), "On", "Hides the researcher link and the dataset/condition badge. This page stays reachable at /researcher.")}
          {option(`${id}-pm`, "off", !participantMode, () => setParticipantMode(false), "Off", "Shows the condition badge and a link to this page (for piloting).")}
        </fieldset>
        {codeRequired && (
          <div>
            <label htmlFor={`${id}-code`} className="mb-1 block text-sm font-semibold text-ink">
              Researcher access code
            </label>
            <input id={`${id}-code`} type="password" value={code} onChange={(e) => setCode(e.target.value)} className="h-9 w-64 rounded-md border border-line-strong bg-surface px-2 text-sm" autoComplete="off" />
          </div>
        )}
        {state.kind === "error" && (
          <p role="alert" className="rounded-md border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-ink">
            {state.msg}
          </p>
        )}
        <button type="submit" disabled={state.kind === "saving"} className="rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-60">
          {state.kind === "saving" ? "Saving…" : "Save and open dashboard"}
        </button>
      </form>

      <section className="mt-10 rounded-lg border border-line bg-surface p-4 text-xs leading-relaxed text-ink-2">
        <h2 className="text-sm font-semibold text-ink">Data collection</h2>
        <p className="mt-1">
          StoreScope records no names, emails, recordings or interaction logs. The condition is kept in a browser cookie only. In the AI condition, typed questions and calculated shop figures are sent to the model
          provider to generate answers and are not stored by StoreScope; handle them as described in your ethics approval.
        </p>
      </section>
    </main>
  );
}
