import "server-only";
import { cookies } from "next/headers";
import { parseConfig, STUDY_COOKIE, type StudyConfig } from "./config";

export async function getStudyConfig(): Promise<StudyConfig> {
  const jar = await cookies();
  return parseConfig(jar.get(STUDY_COOKIE)?.value);
}

export function aiKeyConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
}
