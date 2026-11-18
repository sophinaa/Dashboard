import { getStudyConfig, aiKeyConfigured } from "@/lib/study/server";
import { ResearcherSetup } from "@/components/ResearcherSetup";

export const metadata = { title: "Researcher setup · StoreScope" };

export default async function Page() {
  const config = await getStudyConfig();
  return <ResearcherSetup config={config} aiKeyConfigured={aiKeyConfigured()} codeRequired={Boolean(process.env.RESEARCHER_ACCESS_CODE?.trim())} model={process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5"} />;
}
