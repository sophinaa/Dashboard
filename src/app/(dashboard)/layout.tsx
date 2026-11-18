import { DashboardProvider } from "@/components/providers/DashboardProvider";
import { AppShell } from "@/components/layout/AppShell";
import { getStudyConfig } from "@/lib/study/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const config = await getStudyConfig();
  // Keyed by dataset and condition: switching either remounts everything, so no stale data or chat survives.
  return (
    <DashboardProvider key={`${config.dataset}-${config.ai}`} datasetId={config.dataset}>
      <AppShell>{children}</AppShell>
    </DashboardProvider>
  );
}
