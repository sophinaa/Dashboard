/**
 * Metric definitions shown in tooltips and given to the AI. Wording follows the
 * supplied DATA_DICTIONARY.md. Shared by both study conditions.
 */
export const DEFINITIONS: Record<string, string> = {
  "Net revenue": "Gross sales − discounts − refunds. Excludes VAT and shipping income. Refunds are assigned to the original order date.",
  "Placed orders": "Count of orders placed, including orders later fully refunded.",
  "Average order value": "Net revenue ÷ placed orders. Refunded orders stay in the denominator.",
  "Gross profit": "Net revenue − cost of goods sold (COGS). Not net profit.",
  "Gross margin": "Gross profit ÷ net revenue. Unavailable when net revenue is zero.",
  "COGS": "Dispatched units × unit product cost. Returned skincare is not resold, so its cost stays in COGS.",
  "Contribution before marketing": "Gross profit − return handling (£1 per returned unit) − payment fees (2% of discounted order value + 20p) − fulfilment (£2.50 per order). Excludes fixed overheads.",
  "Contribution after marketing": "Contribution before marketing − marketing spend. Not net profit: rent, salaries, VAT, tax and other overheads are not in the data.",
  "Marketing spend": "Paid click costs plus a £3/day email cost. Organic/direct has no assigned cost. Staff time is not included.",
  "Unit return rate": "Returned units ÷ dispatched units. This is not an order return rate.",
  "Discount rate": "Discounts ÷ gross sales.",
  "Basket rate": "Sessions with basket ÷ sessions.",
  "Checkout start rate": "Sessions with checkout ÷ sessions with basket.",
  "Checkout completion": "Purchasing sessions ÷ sessions with checkout.",
  "Store purchase conversion": "Purchasing sessions ÷ sessions.",
  "Attributed orders / revenue": "Each order is assigned to exactly one channel by a simulation rule. Attribution does not prove the channel caused the sale (it does not measure incremental sales).",
  "Paid ROAS": "Attributed net revenue ÷ paid ad spend, for paid search and paid social only. A revenue ratio, not profit and not causal lift.",
  "Channel contribution after marketing": "The channel's attributed contribution before marketing − the channel's marketing spend.",
  "Banner click-through rate": "Banner clicks ÷ exposed visitors (secondary experiment outcome).",
  "Banner purchase conversion": "Purchases ÷ exposed visitors (pre-specified primary experiment outcome).",
  "Percentage-point (pp) change": "The difference between two rates: 100 × (rate B − rate A). A rise from 2.0% to 2.5% is +0.5 pp (a 25% relative increase).",
};

export const LIMITATIONS: string[] = [
  "All data is synthetic and covers 1 May – 31 October 2026 only; there is no data before or after.",
  "No stock/inventory, cash-flow, repeat-customer identity, customer lifetime value, supplier terms or fixed-overhead data exists.",
  "Contribution is not net profit (no rent, salaries, VAT, tax, shipping income).",
  "The funnel uses constructed stage counts, not user event histories; it cannot show why visitors drop out.",
  "Marketing attribution is a single-channel simulation convention and cannot show incremental (caused) sales or how results would change at different spend levels.",
  "When several things change in the same period (for example a promotion, the product or channel mix, or return rates), the data shows their accounting effect but cannot isolate the cause of any single change.",
  "Promotions are recorded by order (promotion ID); occasional small discounts also occur outside promotions.",
  "Banner experiment: 1–14 August 2026, simulated random exclusive allocation; visitor identities are not supplied.",
];
