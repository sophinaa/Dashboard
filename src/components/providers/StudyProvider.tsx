"use client";
import { createContext, useContext } from "react";
import type { StudyConfig } from "@/lib/study/config";

const StudyContext = createContext<StudyConfig | null>(null);

export function StudyProvider({ config, children }: { config: StudyConfig; children: React.ReactNode }) {
  return <StudyContext.Provider value={config}>{children}</StudyContext.Provider>;
}

export function useStudy(): StudyConfig {
  const c = useContext(StudyContext);
  if (!c) throw new Error("useStudy must be used inside StudyProvider");
  return c;
}
