import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { loadDataset } from "@/lib/data/load";
import { aiKeyConfigured, getStudyConfig } from "@/lib/study/server";
import { buildAiContext, PAGE_TITLES, type PageId } from "@/lib/ai/context";
import { SCENARIO_TOOL, SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { discountScenario, returnRateScenario, spendScenario, ScenarioError, type ScenarioResult } from "@/lib/ai/scenarios";
import { clampToStore, isValidRange, type ComparisonMode, type DateRange } from "@/lib/metrics/dates";
import type { Channel, Dataset } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;
const MAX_TOOL_ROUNDS = 3;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface AiRequest {
  datasetId: string;
  page: PageId;
  range: DateRange;
  comparison: ComparisonMode;
  messages: ChatTurn[];
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function runScenario(ds: Dataset, range: DateRange, input: Record<string, unknown>): ScenarioResult {
  const num = (k: string) => (typeof input[k] === "number" ? (input[k] as number) : NaN);
  switch (input.scenario) {
    case "discount":
      return discountScenario(ds, range, num("discount_percent"));
    case "return_rate":
      return returnRateScenario(ds, range, String(input.product_id ?? "all"), num("return_rate_percent"));
    case "marketing_spend":
      return spendScenario(ds, range, input.channel as Channel, num("spend_change_percent"), typeof input.assumed_roas === "number" ? input.assumed_roas : null);
    default:
      throw new ScenarioError("Unknown scenario type");
  }
}

/**
 * AI explanations. Enforces the study condition server-side: when the AI condition is
 * off this route refuses every request. Nothing is logged or stored. Only shop facts
 * and the participant's typed question(s) are sent to the model provider.
 */
export async function POST(req: NextRequest) {
  const config = await getStudyConfig();
  if (!config.ai) return bad("AI assistance is not part of this session.", 403);
  if (!aiKeyConfigured()) return bad("AI is unavailable: no model API key is configured on the server.", 503);

  let body: AiRequest;
  try {
    body = (await req.json()) as AiRequest;
  } catch {
    return bad("Invalid request body.");
  }
  if (body.datasetId !== config.dataset) return bad("The dashboard data has changed. Please reload the page.", 409);
  if (!(body.page in PAGE_TITLES)) return bad("Unknown page.");
  if (!body.range || !isValidRange(body.range)) return bad("Invalid date range.");
  const range = clampToStore(body.range);
  if (!range) return bad("The selected dates contain no shop data.");
  const comparison: ComparisonMode = body.comparison === "none" ? "none" : "previous";
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) return bad("Invalid conversation.");
  for (const m of body.messages) {
    if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content.trim() || m.content.length > 8000) return bad("Invalid message.");
  }
  const last = body.messages[body.messages.length - 1];
  if (last.role !== "user" || last.content.length > MAX_CHARS) return bad(`Questions must be under ${MAX_CHARS} characters.`);

  const ds = await loadDataset(config.dataset);
  const facts = buildAiContext(ds, { page: body.page, range, comparison });

  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";
  const effortEnv = process.env.ANTHROPIC_EFFORT?.trim();
  const effort = effortEnv === "low" || effortEnv === "high" ? effortEnv : "medium";

  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = body.messages.map((m) => ({ role: m.role, content: m.content }));
  const scenarios: ScenarioResult[] = [];

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort },
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          { type: "text", text: `FACT SHEET (calculated by the dashboard)\n${JSON.stringify(facts, null, 1)}` },
        ],
        tools: round < MAX_TOOL_ROUNDS ? [SCENARIO_TOOL] : [],
        messages,
      });

      if (response.stop_reason === "refusal") {
        return bad("The AI declined to answer this question. Please try rephrasing it.", 422);
      }

      const toolUses = response.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use");
      if (response.stop_reason === "tool_use" && toolUses.length > 0) {
        messages.push({ role: "assistant", content: response.content as Anthropic.Beta.Messages.BetaContentBlockParam[] });
        const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = toolUses.map((tu) => {
          try {
            const result = runScenario(ds, range, (tu.input ?? {}) as Record<string, unknown>);
            scenarios.push(result);
            return { type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result) };
          } catch (e) {
            const msg = e instanceof ScenarioError ? e.message : "Scenario calculation failed.";
            return { type: "tool_result", tool_use_id: tu.id, content: msg, is_error: true };
          }
        });
        messages.push({ role: "user", content: results });
        continue;
      }

      const text = response.content
        .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n\n")
        .trim();
      if (!text) return bad("The AI returned an empty answer. Please try again.", 502);
      return NextResponse.json({ text, scenarios, truncated: response.stop_reason === "max_tokens" }, { headers: { "Cache-Control": "no-store" } });
    }
    return bad("The AI could not complete the calculation. Please try a simpler question.", 502);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return bad("AI is unavailable: the server's API key was rejected.", 503);
    if (e instanceof Anthropic.RateLimitError) return bad("The AI service is busy. Please wait a moment and try again.", 429);
    if (e instanceof Anthropic.APIConnectionError) return bad("Could not reach the AI service. Check the network connection.", 503);
    if (e instanceof Anthropic.APIError) {
      console.error("AI API error", e.status, e.message);
      return bad("The AI service returned an error. Please try again.", 502);
    }
    console.error("AI route error", e);
    return bad("Something went wrong while generating the explanation.", 500);
  }
}
