# Calculations

All monetary inputs are **integer GBP pence**, VAT-exclusive, and are summed as integers. They are converted to pounds only at display time (`src/lib/format.ts`).

Every rate is calculated from **summed numerators and denominators** for the selected period, never by averaging daily rates. Every ratio goes through `safeRatio`, which returns *n/a* when the denominator is zero.

## Sources and joins

| Metric family | Source table | Notes |
|---|---|---|
| Store financials | `orders` | Order-level costs (payment fees, fulfilment) are summed from `orders` only, with no join to lines, so they cannot be double-counted. |
| Marketing spend | `marketing_daily` | The only source of spend. Added to the order totals by date. |
| Products | `order_items` ⋈ `products` (on `product_id`) | Line-level fields only. Payment fees and fulfilment are **not allocated** to products, because the data has no allocation rule. |
| Funnel | `daily_funnel` | Already at date × device grain. |
| Channels | `marketing_daily` | Already at date × channel grain. Unpaid clicks are blank (`null`), not zero. |
| Experiment | `experiments_daily`, plus `orders` for reconciliation | |
| `monthly_summary`, `product_monthly_summary` | — | Derived views. Used **only** in tests to verify the calculations, never added to totals. |

## Store financials (Overview)

```
Net revenue                    = gross sales − discounts − refunds
Gross profit                   = net revenue − COGS
Contribution before marketing  = gross profit − return handling − payment fees − fulfilment
Contribution after marketing   = contribution before marketing − marketing spend
Average order value            = net revenue ÷ placed orders            (refunded orders stay in the denominator)
Gross margin                   = gross profit ÷ net revenue              (n/a if net revenue = 0)
Discount rate                  = discounts ÷ gross sales
```

Neither contribution measure is net profit. The data has no rent, salaries, VAT, tax or shipping income.

The **revenue → contribution bridge** lists each step in order. A test checks that the deductions sum exactly to each subtotal.

**Orders by promotion** groups orders by `promotion_id`.

## Products

```
Unit return rate   = returned units ÷ dispatched units        (not an order return rate)
Discount rate      = discounts ÷ gross sales
Gross margin       = gross profit ÷ net revenue
Revenue share      = product net revenue ÷ all-product net revenue      (only when the total > 0)
Gross-profit share = product gross profit ÷ all-product gross profit    (only when the total > 0)
```

Revenue rank and gross-profit rank are shown side by side, so a product that sells a lot can be told apart from one that makes a lot of profit.

## Customer journey

```
Basket rate               = sessions with basket ÷ sessions
Checkout start rate       = sessions with checkout ÷ sessions with basket
Checkout completion       = purchasing sessions ÷ sessions with checkout
Store purchase conversion = purchasing sessions ÷ sessions
```

The UI prints each rate with its counts ("x ÷ y").

## Marketing

```
Paid ROAS                       = attributed net revenue ÷ paid spend          (paid search and paid social only)
Spend per attributed order      = spend ÷ attributed orders                    (paid only)
Channel contribution after mktg = channel contribution before marketing − channel spend
```

- Email has a fixed £3/day cost and is not treated as ad spend for ROAS.
- Organic/direct has no assigned cost.
- Attribution is a single-channel simulation rule and is **not incremental**.
- No projection or extrapolation of spend is shown anywhere.

## Experiment (BANNER_01)

```
Click-through rate (secondary)   = clicks ÷ exposed visitors
Purchase conversion (primary)    = purchases ÷ exposed visitors
Difference                       = 100 × (rate B − rate A)  percentage points
Relative difference              = rate B ÷ rate A − 1      (n/a when A = 0)
```

**Uncertainty:**
- Each variant's rate has a 95% **Wilson score** interval.
- The difference B − A has a 95% **Newcombe hybrid score** interval (Newcombe 1998, method 10).

Both methods hold up well with small counts. A test reproduces Newcombe's published worked example (56/70 vs 48/80 gives 0.0524 to 0.3339).

**Reading the result:**
- The interval is entirely above zero → "Evidence that B is higher".
- The interval is entirely below zero → "Evidence that A is higher".
- Otherwise → **"Inconclusive"**.

"Equivalent" is never shown, because no equivalence margin was set in advance.

The analysis always covers the **full experiment period (1–14 Aug 2026)**, whatever store dates are selected. The page states whether the selected dates overlap the experiment.

For comparison, the supplied `validation_report.json` gives an approximate (Wald-type) interval for A's purchase difference of −1.18 to +1.34 pp. StoreScope's Newcombe interval is −1.21 to +1.38 pp. Both include zero.

## Date ranges and comparisons

- Ranges are inclusive ISO dates, calculated in UTC. They are clamped to the data period (1 May – 31 Oct 2026).
- **Previous period:**
  - For a selection of whole calendar months, it is the same number of preceding calendar months.
  - Otherwise, it is the immediately preceding period of equal length.
  - If any part of it would fall before 1 May 2026, no comparison is shown. A partial comparison would be misleading.
- **Trend granularity** depends on the range length:
  - 31 days or fewer: daily
  - 92 days or fewer: Monday-start weeks
  - longer: calendar months

  Partial buckets are marked "(partial)" or "*".
- **Amount changes** are shown as an absolute change and a % change. The % change is omitted when the earlier value is zero or negative, or the current value is negative (the £ change is still shown).
- **Rate changes** are shown in percentage points.

## Hypothetical scenarios (AI condition only)

These are in `src/lib/ai/scenarios.ts`. Each one holds everything else in the selected period fixed and lists its assumptions:

- **Discount.** Every line carries discount `d`. Units and returned units are unchanged. Refunds are recalculated at `list price × (1 − d)` per returned unit. Payment fees are recalculated as `round(2% × discounted order value) + 20p` per order.
- **Return rate.** Returned units = dispatched units × r. Refund per returned unit = the product's actual average in the period. Handling is £1 per unit. COGS is unchanged (returned stock is not resold).
- **Paid spend change.** Δspend = spend × p. The channel's historical ratio of contribution before marketing to attributed revenue gives the break-even ROAS = 1 ÷ that ratio. An outcome is calculated only if the user supplies an assumed ROAS, and it is labelled as an assumption.
