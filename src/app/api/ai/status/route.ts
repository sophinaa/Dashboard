import { NextResponse } from "next/server";
import { aiKeyConfigured, getStudyConfig } from "@/lib/study/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getStudyConfig();
  if (!config.ai) return NextResponse.json({ enabled: false, available: false }, { status: 403 });
  return NextResponse.json({ enabled: true, available: aiKeyConfigured() });
}
