# Verification and limitations

## Automated checks (`npm test`, 29 checks across datasets A and B)

| Area | Check | Result |
|---|---|---|
| Financial totals | For each of the six months, all 13 overview measures (orders through contribution after marketing) are recalculated from records and compared with `monthly_summary.csv`. | Exact match (pence) |
| Financial totals | Full-period totals equal the sum of the monthly summaries. The monthly trend buckets match each month. | Pass |
| Formula identities | Net revenue = gross − discounts − refunds, gross profit = net revenue − COGS, and the contribution identity hold on every order. The net-revenue identity and returned ≤ dispatched hold on every line. | Pass |
| Bridge | The bridge deductions sum exactly to each subtotal. | Pass |
| Products | Every product × month matches `product_monthly_summary.csv`. Product totals reconcile to order totals (net revenue, gross profit, return handling). | Pass |
| Double counting | A naive order→line join overstates fulfilment. StoreScope's fulfilment equals £2.50 × orders. | Pass |
| Funnel | Purchasing sessions equal placed orders for every date × device. Stages are nested. Device subsets sum to placed orders in an arbitrary range. | Pass |
| Denominators | Checkout completion uses summed counts, which differ from an average of daily rates. | Pass |
| Marketing | Attributed orders, revenue and contribution equal order-level aggregates for every date × channel. Channel totals reconcile with Overview totals and spend. | Pass |
| ROAS / blanks | ROAS is given for paid channels only. Unpaid clicks stay `null`, not 0. | Pass |
| Experiment | Purchases equal tagged orders per variant. Visitors are at most store sessions each day. Purchases are at most clicks. Period is 1–14 Aug. The primary interval includes zero, which agrees with the supplied validation report. | Pass |
| Date filtering | Two disjoint ranges sum to the whole. An empty range gives n/a rates, not errors. | Pass |
| Dataset switching | A and B give different totals, and repeated calls are deterministic (no shared state). | Pass |
| Statistics | The Wilson interval matches the published example (81/263). The Newcombe interval matches Newcombe (1998) (56/70 vs 48/80 → 0.0524 to 0.3339). | Pass |
| Comparison periods | Month, multi-month and day-length comparisons are correct. No comparison is returned when the earlier period falls outside the data. | Pass |
| Buckets | Weekly buckets are contiguous and partial weeks are flagged. | Pass |

## Server and route checks (production build, `next start`)

| Check | Result |
|---|---|
| All five pages and `/researcher` return 200 | Pass |
| `/researcher_only/ANSWER_GUIDE.md`, `/generate_data.py`, `/DATA_DICTIONARY.md`, `/data/datasets/A.json` and `/dataset_A/dashboard_data.json` | 404. These files are not in the repository, and `data/` is not served. |
| `/api/dataset` serves only the configured dataset (A: 3,440 orders; after switching to B: 3,590) | Pass |
| AI off: `/api/ai/status` → 403, `/api/ai` → 403, and the "Ask the assistant" button is absent from the page | Pass |
| AI on with no key: `/api/ai` → 503 "AI is unavailable…", and the panel shows "AI unavailable" with no scripted text | Pass |
| A stale dataset ID in an AI request → 409 | Implemented in the route |
| Participant mode hides the researcher badge and link | Pass |
| `tsc --noEmit`, `next lint` and `next build` | Pass |

## Browser checks (headless Chromium, production build, 1440 px wide)

- All five pages render with no console or page errors. Screenshots were reviewed for layout, label collisions and table overflow; at 1440 px the product and channel tables fit without horizontal scrolling.
- Keyboard: the Tab order runs skip link → sidebar links → AI button → filters → definition tooltips, with a visible 3px focus outline at each stop. Arrow keys switch the Chart/Table tabs. Escape closes the AI panel and returns focus to its button.
- Filters:
  - A single-day custom range works.
  - An inverted range shows an inline error.
  - The selected range persists across pages.
- Condition switching:
  - Switching from A to B with the same filter shows B's figures (for example, net revenue on 3 Aug: A £538.60, B £543.40).
  - In AI-off and participant mode, the AI button and the researcher link are absent.
- With no key set, the AI panel shows "AI unavailable" and no generated text.

## Accessibility measures

- A skip link and landmarks (nav, header, main, aside) are provided.
- Every control is a native button, select, input or link, so it can be reached by keyboard. A 3px forest-green focus outline is shown on `:focus-visible`.
- Chart/Table tabs follow the ARIA tabs pattern (arrow keys). Each chart has a text alternative and a full data table.
- Sortable tables use `aria-sort`, buttons in the column headers, and row headers.
- Definition tooltips are buttons that open on hover, focus or click and close with Escape.
- Changes are shown with arrows, signs and words. Lines differ by dash pattern as well as colour. Status messages use icons and text labels.
- The series palette passed a colour-vision-deficiency validator. Text colours have at least 4.5:1 contrast against the backgrounds; the muted text is 5.0–5.5:1.
- Reduced-motion preferences are respected and chart animation is disabled.
- The AI panel moves focus to its heading when opened, closes with Escape, and returns focus to the button that opened it.

## Remaining limitations

- **No live AI test.** There is no API key in this environment, so the AI route was checked for availability, condition enforcement and errors, but not for answer quality. Before the study, pilot real answers with the example questions on both datasets, check them against the prompt rules, and adjust `ANTHROPIC_EFFORT` if responses are slow.
- **Refusal fallback is beta.** Server-side refusal fallback (`fallbacks: "default"`) needs the beta to be available on the API account. If requests return 400, remove those two lines.
- **Product profitability** stops at gross profit, because order-level costs have no allocation rule in the data.
- **The experiment** is analysed only over its full period. Subgroup or per-device analysis is deliberately not offered.
- **"What if" scenarios** hold behaviour fixed, for example the same units at a different discount. They are arithmetic illustrations, not predictions, and are labelled that way.
- **Desktop focus.** The layout is responsive, but it was designed and checked for desktop evaluation. The AI panel is a full-width overlay on narrow screens.
- **No logging.** The prototype has no research logging. Collect task answers, timings and similar data outside the app under the ethics protocol.
- **Researcher page access.** `/researcher` is not linked in participant mode but can still be reached by URL. Set `RESEARCHER_ACCESS_CODE` to require a code.
- **Not validated as equivalent.** A and B are candidate comparable scenarios, not validated equivalents, as the supplied README notes.
