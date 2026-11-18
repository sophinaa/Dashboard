import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { serializeConfig, STUDY_COOKIE, type StudyConfig } from "@/lib/study/config";

export const dynamic = "force-dynamic";

/** Researcher setup: saves the evaluation condition. Not linked from participant mode. */
export async function POST(req: NextRequest) {
  let body: Partial<StudyConfig> & { accessCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const required = process.env.RESEARCHER_ACCESS_CODE?.trim();
  if (required && body.accessCode !== required) {
    return NextResponse.json({ error: "Incorrect researcher access code." }, { status: 401 });
  }
  if ((body.dataset !== "A" && body.dataset !== "B") || typeof body.ai !== "boolean" || typeof body.participantMode !== "boolean") {
    return NextResponse.json({ error: "dataset must be A or B; ai and participantMode must be booleans." }, { status: 400 });
  }
  const config: StudyConfig = { dataset: body.dataset, ai: body.ai, participantMode: body.participantMode };
  const jar = await cookies();
  jar.set(STUDY_COOKIE, serializeConfig(config), { httpOnly: true, sameSite: "strict", path: "/", secure: process.env.NODE_ENV === "production" });
  return NextResponse.json({ ok: true, config });
}
