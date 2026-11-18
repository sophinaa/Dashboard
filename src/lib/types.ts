/**
 * Record types for the supplied Willow & Co synthetic dataset.
 * All monetary fields are integer GBP pence (VAT-exclusive), exactly as supplied.
 */

export type DatasetId = "A" | "B";
export const DATASET_IDS: DatasetId[] = ["A", "B"];

export type Channel = "paid_search" | "paid_social" | "email" | "organic_direct";
export const CHANNELS: Channel[] = ["paid_search", "paid_social", "email", "organic_direct"];
export const PAID_CHANNELS: Channel[] = ["paid_search", "paid_social"];

export type Device = "mobile" | "desktop";
export const DEVICES: Device[] = ["mobile", "desktop"];

export interface Product {
  product_id: string;
  name: string;
  category: string;
  list_price_pence: number;
  unit_cost_pence: number;
}

export interface Order {
  order_id: string;
  date: string;
  channel: Channel;
  device: Device;
  promotion_id: string;
  experiment_id: string;
  experiment_variant: string;
  gross_sales_pence: number;
  discount_pence: number;
  refund_pence: number;
  net_revenue_pence: number;
  cogs_pence: number;
  gross_profit_pence: number;
  return_handling_pence: number;
  payment_fee_pence: number;
  fulfilment_cost_pence: number;
  contribution_before_marketing_pence: number;
}

export interface OrderItem {
  order_id: string;
  line_id: string;
  date: string;
  product_id: string;
  quantity: number;
  unit_list_price_pence: number;
  unit_cost_pence: number;
  discount_percent: number;
  gross_sales_pence: number;
  discount_pence: number;
  returned_quantity: number;
  refund_pence: number;
  net_revenue_pence: number;
  cogs_pence: number;
  gross_profit_pence: number;
  return_handling_pence: number;
}

export interface FunnelDay {
  date: string;
  device: Device;
  sessions: number;
  sessions_with_basket: number;
  sessions_with_checkout: number;
  purchasing_sessions: number;
}

export interface MarketingDay {
  date: string;
  channel: Channel;
  /** Paid ad clicks; null (blank in source) for unpaid channels — not zero. */
  clicks: number | null;
  marketing_spend_pence: number;
  attributed_orders: number;
  attributed_net_revenue_pence: number;
  contribution_before_marketing_pence: number;
}

export interface ExperimentDay {
  date: string;
  experiment_id: string;
  variant: "A" | "B";
  visitors: number;
  clicks: number;
  purchases: number;
}

export interface MonthlySummary {
  month: string;
  orders: number;
  gross_sales_pence: number;
  discount_pence: number;
  refund_pence: number;
  net_revenue_pence: number;
  cogs_pence: number;
  gross_profit_pence: number;
  return_handling_pence: number;
  payment_fee_pence: number;
  fulfilment_cost_pence: number;
  contribution_before_marketing_pence: number;
  marketing_spend_pence: number;
  contribution_after_marketing_pence: number;
}

export interface ProductMonthlySummary {
  month: string;
  product_id: string;
  quantity: number;
  returned_quantity: number;
  gross_sales_pence: number;
  discount_pence: number;
  refund_pence: number;
  net_revenue_pence: number;
  cogs_pence: number;
  gross_profit_pence: number;
  return_handling_pence: number;
}

/** The full dataset bundle. Summary tables are derived views kept only for verification. */
export interface Dataset {
  id: DatasetId;
  period: { start: string; end: string };
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  funnel: FunnelDay[];
  marketing: MarketingDay[];
  experiments: ExperimentDay[];
  monthlySummary: MonthlySummary[];
  productMonthlySummary: ProductMonthlySummary[];
}
