/**
 * Validates and normalises the raw dashboard_data.json bundle into typed records.
 * Pure (no file system access) so it can be unit-tested and reused by the loader.
 */
import {
  CHANNELS,
  DEVICES,
  type Channel,
  type Dataset,
  type DatasetId,
  type Device,
} from "@/lib/types";

export const STORE_PERIOD = { start: "2026-05-01", end: "2026-10-31" } as const;

export class DatasetError extends Error {}

type Raw = Record<string, unknown>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function table(raw: Raw, key: string): Raw[] {
  const v = raw[key];
  if (!Array.isArray(v)) throw new DatasetError(`Missing table "${key}"`);
  return v as Raw[];
}

function int(row: Raw, field: string, table: string): number {
  const v = row[field];
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new DatasetError(`${table}.${field} must be an integer (got ${JSON.stringify(v)})`);
  }
  return v;
}

function str(row: Raw, field: string, table: string): string {
  const v = row[field];
  if (typeof v !== "string") throw new DatasetError(`${table}.${field} must be a string`);
  return v;
}

function date(row: Raw, table: string): string {
  const v = str(row, "date", table);
  if (!ISO_DATE.test(v)) throw new DatasetError(`${table}.date is not ISO YYYY-MM-DD: ${v}`);
  return v;
}

function channel(row: Raw, t: string): Channel {
  const v = str(row, "channel", t);
  if (!CHANNELS.includes(v as Channel)) throw new DatasetError(`${t}.channel unknown: ${v}`);
  return v as Channel;
}

function device(row: Raw, t: string): Device {
  const v = str(row, "device", t);
  if (!DEVICES.includes(v as Device)) throw new DatasetError(`${t}.device unknown: ${v}`);
  return v as Device;
}

const ORDER_MONEY = [
  "gross_sales_pence",
  "discount_pence",
  "refund_pence",
  "net_revenue_pence",
  "cogs_pence",
  "gross_profit_pence",
  "return_handling_pence",
  "payment_fee_pence",
  "fulfilment_cost_pence",
  "contribution_before_marketing_pence",
] as const;

const LINE_MONEY = [
  "unit_list_price_pence",
  "unit_cost_pence",
  "gross_sales_pence",
  "discount_pence",
  "refund_pence",
  "net_revenue_pence",
  "cogs_pence",
  "gross_profit_pence",
  "return_handling_pence",
] as const;

export function parseDataset(id: DatasetId, raw: unknown): Dataset {
  if (!raw || typeof raw !== "object") throw new DatasetError("Dataset is not an object");
  const r = raw as Raw;

  const products = table(r, "products").map((p) => ({
    product_id: str(p, "product_id", "products"),
    name: str(p, "name", "products"),
    category: str(p, "category", "products"),
    list_price_pence: int(p, "list_price_pence", "products"),
    unit_cost_pence: int(p, "unit_cost_pence", "products"),
  }));

  const orders = table(r, "orders").map((o) => {
    const out: Record<string, unknown> = {
      order_id: str(o, "order_id", "orders"),
      date: date(o, "orders"),
      channel: channel(o, "orders"),
      device: device(o, "orders"),
      promotion_id: str(o, "promotion_id", "orders"),
      experiment_id: str(o, "experiment_id", "orders"),
      experiment_variant: str(o, "experiment_variant", "orders"),
    };
    for (const f of ORDER_MONEY) out[f] = int(o, f, "orders");
    return out as unknown as Dataset["orders"][number];
  });

  const orderItems = table(r, "order_items").map((l) => {
    const out: Record<string, unknown> = {
      order_id: str(l, "order_id", "order_items"),
      line_id: str(l, "line_id", "order_items"),
      date: date(l, "order_items"),
      product_id: str(l, "product_id", "order_items"),
      quantity: int(l, "quantity", "order_items"),
      discount_percent: int(l, "discount_percent", "order_items"),
      returned_quantity: int(l, "returned_quantity", "order_items"),
    };
    for (const f of LINE_MONEY) out[f] = int(l, f, "order_items");
    return out as unknown as Dataset["orderItems"][number];
  });

  const funnel = table(r, "daily_funnel").map((f) => ({
    date: date(f, "daily_funnel"),
    device: device(f, "daily_funnel"),
    sessions: int(f, "sessions", "daily_funnel"),
    sessions_with_basket: int(f, "sessions_with_basket", "daily_funnel"),
    sessions_with_checkout: int(f, "sessions_with_checkout", "daily_funnel"),
    purchasing_sessions: int(f, "purchasing_sessions", "daily_funnel"),
  }));

  const marketing = table(r, "marketing_daily").map((m) => {
    const clicksRaw = m["clicks"];
    let clicks: number | null;
    if (clicksRaw === "" || clicksRaw === null || clicksRaw === undefined) clicks = null;
    else clicks = int(m, "clicks", "marketing_daily");
    return {
      date: date(m, "marketing_daily"),
      channel: channel(m, "marketing_daily"),
      clicks,
      marketing_spend_pence: int(m, "marketing_spend_pence", "marketing_daily"),
      attributed_orders: int(m, "attributed_orders", "marketing_daily"),
      attributed_net_revenue_pence: int(m, "attributed_net_revenue_pence", "marketing_daily"),
      contribution_before_marketing_pence: int(m, "contribution_before_marketing_pence", "marketing_daily"),
    };
  });

  const experiments = table(r, "experiments_daily").map((e) => {
    const variant = str(e, "variant", "experiments_daily");
    if (variant !== "A" && variant !== "B") throw new DatasetError(`experiments_daily.variant unknown: ${variant}`);
    return {
      date: date(e, "experiments_daily"),
      experiment_id: str(e, "experiment_id", "experiments_daily"),
      variant: variant as "A" | "B",
      visitors: int(e, "visitors", "experiments_daily"),
      clicks: int(e, "clicks", "experiments_daily"),
      purchases: int(e, "purchases", "experiments_daily"),
    };
  });

  const monthlySummary = table(r, "monthly_summary").map((m) => {
    const out: Record<string, unknown> = { month: str(m, "month", "monthly_summary"), orders: int(m, "orders", "monthly_summary") };
    for (const f of [...ORDER_MONEY, "marketing_spend_pence", "contribution_after_marketing_pence"]) out[f] = int(m, f, "monthly_summary");
    return out as unknown as Dataset["monthlySummary"][number];
  });

  const productMonthlySummary = table(r, "product_monthly_summary").map((m) => {
    const out: Record<string, unknown> = {
      month: str(m, "month", "product_monthly_summary"),
      product_id: str(m, "product_id", "product_monthly_summary"),
      quantity: int(m, "quantity", "product_monthly_summary"),
      returned_quantity: int(m, "returned_quantity", "product_monthly_summary"),
    };
    for (const f of LINE_MONEY.filter((f) => !f.startsWith("unit_"))) out[f] = int(m, f, "product_monthly_summary");
    return out as unknown as Dataset["productMonthlySummary"][number];
  });

  if (orders.length === 0) throw new DatasetError("Dataset contains no orders");

  return {
    id,
    period: { ...STORE_PERIOD },
    products,
    orders,
    orderItems,
    funnel,
    marketing,
    experiments,
    monthlySummary,
    productMonthlySummary,
  };
}
