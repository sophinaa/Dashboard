# StoreScope

A research prototype that shows how a small online shop is performing, with an optional AI assistant that explains the figures in plain language. It was built for a dissertation on whether plain-language AI explanations help non-technical small e-commerce owners understand performance and make decisions.

The selected shop is **Willow & Co**, a fictional skincare shop. **All shop data is synthetic** and comes from the supplied `Willow_Co_Synthetic_Data` package (dataset A and dataset B).

- Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, Recharts 2, and the Anthropic SDK (server-side only).
- Pages: Overview, Products, Customer journey, Marketing, Experiments, plus a researcher setup view at `/researcher`.
- No database, authentication or store integration. Data comes from local JSON files.

## Setup

Requires Node.js 18.18 or later (developed on Node 22).

```bash
npm install
cp .env.example .env.local     # then edit; see below
npm run dev                    # http://localhost:3000
```

For a study session, use a production build:

```bash
npm run build
npm start                      # http://localhost:3000
```

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the calculation and reconciliation checks on both datasets (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

### Environment variables (`.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(empty)* | Model API key, read only on the server. If it is empty, the AI panel says **"AI unavailable"**. No scripted answers are ever substituted. |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Model used for explanations. |
| `ANTHROPIC_EFFORT` | `medium` | `low`, `medium` or `high`. Lower is faster and cheaper. |
| `STUDY_DEFAULT_DATASET` | `A` | Dataset used until a researcher saves a setting. |
| `STUDY_DEFAULT_AI` | `on` | AI condition used until a researcher saves a setting. |
| `STUDY_DEFAULT_PARTICIPANT_MODE` | `off` | Participant mode used until a researcher saves a setting. |
| `RESEARCHER_ACCESS_CODE` | *(empty)* | Optional code required to save settings on `/researcher`. |

Never prefix the API key with `NEXT_PUBLIC_`. That would expose it to the browser.

## Running a study session

1. Open `/researcher`.
2. Choose **Dataset A or B**, **AI enabled or disabled**, and **Participant mode** (on for real sessions).
3. Press **Save and open dashboard**. This triggers a full reload, which clears the filters and any AI conversation.

The four conditions (A/B × AI/no-AI) are set independently.

The condition is stored in an httpOnly cookie in that browser, and the server enforces it:
- `/api/dataset` serves only the selected dataset.
- `/api/ai` returns 403 when AI is off.
- `/api/ai` returns 409 if the page still holds a dataset that no longer matches the setting, which prevents stale results.

**What differs between conditions.** Only the AI assistant differs:
- In the no-AI condition, the "Ask the AI assistant" button and panel are not rendered, and the server refuses AI requests.
- Charts, tables, definitions, tooltips and filters are identical in both conditions.
- The dashboard has no generated summaries or hard-coded insight cards in either condition.

**What participant mode hides:**
- the "Researcher view · Dataset X · AI on/off" badge
- the sidebar link to the setup page

The setup page itself contains no answer guides or scenario descriptions. It is still reachable by URL, so set `RESEARCHER_ACCESS_CODE` if participants might type it in.

## Project structure

```
data/datasets/A.json, B.json      Supplied dashboard_data.json files (minified), outside /public
src/lib/types.ts                  Record types
src/lib/data/parse.ts             Validation and normalisation of the JSON bundle
src/lib/data/load.ts              Server-only file loader
src/lib/metrics/                  Calculations (pure functions shared by the UI and the AI route)
  core.ts                         Safe ratios, percentage-point and % changes
  dates.ts                        Ranges, presets, comparison periods, day/week/month buckets
  financials.ts                   Overview totals, trend, revenue→contribution bridge, promotions
  products.ts                     Product metrics and per-product trends
  funnel.ts                       Session funnel counts and rates by device
  marketing.ts                    Channel spend, attribution, ROAS, contribution
  experiment.ts                   Banner experiment, Wilson and Newcombe intervals
src/lib/format.ts                 Pence → £ and rate formatting (display only)
src/lib/definitions.ts            Metric definitions and data limitations (UI tooltips and AI)
src/lib/ai/context.ts             Builds the AI fact sheet from the metric functions
src/lib/ai/scenarios.ts           Deterministic "what if" calculations
src/lib/ai/prompt.ts              System prompt and scenario tool definition
src/lib/study/                    Study-condition cookie
src/app/api/                      dataset, study, ai, ai/status route handlers
src/components/                   Layout, pages, charts, UI primitives, AI panel
tests/reconciliation.test.ts      Verification suite
docs/CALCULATIONS.md              Formulas and methods
docs/VERIFICATION.md              Checks performed and known limitations
```

Each layer has its own folder:
- data loading: `lib/data`
- calculations: `lib/metrics`
- presentation: `components`
- AI: `lib/ai` and `app/api/ai`

Pages never compute metrics inline. They call `lib/metrics`.

## Researcher-only material

These files from the supplied package were **not copied into this repository**:
- `researcher_only/` (answer guide and evaluation guide)
- `generate_data.py`
- `START_HERE.html`

Their names are also in `.gitignore`. The dashboard, its public routes and the AI context have no access to them. Only the two `dashboard_data.json` bundles are used, from `data/datasets/`, which is not publicly served. The data dictionary's definitions are restated in `src/lib/definitions.ts` and `docs/CALCULATIONS.md`.

## AI assistant

The assistant can:
- explain the current page ("Explain this page")
- answer typed questions
- run hypothetical "what if" calculations

How it works:
1. The browser sends the page, date range, comparison mode and conversation text to `/api/ai`.
2. The server recalculates every figure with the same `lib/metrics` functions the dashboard uses. It builds a structured, pre-formatted fact sheet with current values, comparison values, changes, definitions and limitations, and sends it to the model with the system prompt in `src/lib/ai/prompt.ts`.
3. The prompt requires the model to:
   - state the observation with figures and the period they cover
   - explain trade-offs
   - separate evidence from possible causes
   - state uncertainty and missing information
   - suggest bounded checks or tests
   - never invent causes, forecasts or records
   - treat attribution as non-causal
   - read the experiment as "inconclusive", not "equivalent", when the interval includes zero
4. **What-if questions** use a `run_scenario` tool. The arithmetic happens in `src/lib/ai/scenarios.ts`, never in the model. There are three scenario types:
   - a different discount %
   - a different product return rate
   - a paid-channel spend change. This reports the break-even ROAS; the outcome under an assumed ROAS is calculated only if the user states one.

   Results appear in a card labelled **"Hypothetical scenario — not a prediction"**, with the assumptions listed.
5. Refusals, rate limits, network failures, auth errors and a missing key each show a clear message.

The request enables server-side refusal fallback (`fallbacks: "default"`). This is a beta feature, so if your account cannot use it, remove the `betas` and `fallbacks` lines in `src/app/api/ai/route.ts`.

## Research data and privacy

- StoreScope **does not record** names, emails, recordings, clicks, page views or chat logs. There is no logging feature.
- The only things stored in the browser are:
  - the study-condition cookie
  - the current tab's filter selection (`sessionStorage`), which is cleared when the condition is saved
- In the AI condition, the participant's typed questions and the calculated (synthetic) shop figures are sent to the model provider. Nothing else about the participant is sent. The panel tells participants this and asks them not to type personal information. Typed questions are participant research data, so handle them under your ethics approval.
