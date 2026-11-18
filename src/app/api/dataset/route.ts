import { NextResponse } from "next/server";
import { loadDataset } from "@/lib/data/load";
import { getStudyConfig } from "@/lib/study/server";

export const dynamic = "force-dynamic";

/**
 * Serves ONLY the dataset selected by the current study configuration.
 * Derived summary tables are omitted (the dashboard calculates from records).
 */
export async function GET() {
  const config = await getStudyConfig();
  try {
    const ds = await loadDataset(config.dataset);
    const body = {
      id: ds.id,
      products: ds.products,
      orders: ds.orders,
      order_items: ds.orderItems,
      daily_funnel: ds.funnel,
      marketing_daily: ds.marketing,
      experiments_daily: ds.experiments,
      monthly_summary: [],
      product_monthly_summary: [],
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Dataset load failed", e);
    return NextResponse.json({ error: "The shop data could not be loaded." }, { status: 500 });
  }
}
