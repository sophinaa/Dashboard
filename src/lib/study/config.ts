/**
 * Evaluation-condition configuration (dataset A/B × AI on/off × participant mode).
 * Stored in an httpOnly cookie set from the researcher setup view, so the server
 * enforces the condition (e.g. the AI route refuses requests when AI is off).
 */
import type { DatasetId } from "@/lib/types";

export interface StudyConfig {
  dataset: DatasetId;
  ai: boolean;
  participantMode: boolean;
}

export const STUDY_COOKIE = "storescope_study";

export function defaultConfig(env: Record<string, string | undefined> = process.env): StudyConfig {
  return {
    dataset: env.STUDY_DEFAULT_DATASET?.toUpperCase() === "B" ? "B" : "A",
    ai: (env.STUDY_DEFAULT_AI ?? "on").toLowerCase() !== "off",
    participantMode: (env.STUDY_DEFAULT_PARTICIPANT_MODE ?? "off").toLowerCase() === "on",
  };
}

export function parseConfig(value: string | undefined, fallback: StudyConfig = defaultConfig()): StudyConfig {
  if (!value) return fallback;
  try {
    const v = JSON.parse(value) as Partial<StudyConfig>;
    return {
      dataset: v.dataset === "A" || v.dataset === "B" ? v.dataset : fallback.dataset,
      ai: typeof v.ai === "boolean" ? v.ai : fallback.ai,
      participantMode: typeof v.participantMode === "boolean" ? v.participantMode : fallback.participantMode,
    };
  } catch {
    return fallback;
  }
}

export function serializeConfig(c: StudyConfig): string {
  return JSON.stringify({ dataset: c.dataset, ai: c.ai, participantMode: c.participantMode });
}
