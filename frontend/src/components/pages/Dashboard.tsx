import { useNavigate } from "react-router-dom";
import { usePipelineRunContext } from "@/hooks/PipelineRunContext";
import { BackendModeSelector } from "@/components/layout/BackendModeSelector";
import { FlaskIcon, AlertTriangleIcon, GitHubIcon } from "@/components/common/icons";
import { PipelineAnimation } from "@/components/pages/dashboard/PipelineAnimation";
import { HowRagWorksTimeline } from "@/components/pages/dashboard/HowRagWorksTimeline";
import { LearnGrid } from "@/components/pages/dashboard/LearnGrid";
import { JourneyPanel } from "@/components/pages/dashboard/JourneyPanel";
import { HowThisWorksPanel } from "@/components/pages/dashboard/HowThisWorksPanel";
import { LimitationsTrigger } from "@/components/common/LimitationsPanel";
import { LLMKeySettings } from "@/components/common/LLMKeySettings";
import { GITHUB_REPO_URL } from "@/config/site";

export function Dashboard() {
  const navigate = useNavigate();
  const { executionMode, switchExecutionMode, backendStatus, checkingElapsedMs, fallbackMessage } = usePipelineRunContext();

  const handleEnterPipeline = (_intent: "upload" | "sample") => {
    // Dashboard selection carries through automatically: Demo Mode uses
    // the bundled sample instantly; Offline Mode uploads through the real
    // backend API. executionMode lives in PipelineRunProvider (app-wide),
    // so /upload reads the same mode without re-deriving it.
    navigate("/upload");
  };

  return (
    <div>
      <header className="flex items-center justify-between border-b border-border bg-surface-2 px-7 py-3.5">
        <div className="flex items-center gap-2 text-[15px] font-medium">
          <FlaskIcon className="h-5 w-5 text-accent-text" />
          RAG Learning Studio
        </div>
        <div className="flex items-center gap-2">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            title="View source on GitHub"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border-strong bg-bg-elevated text-text-muted hover:bg-bg-hover"
          >
            <GitHubIcon className="h-4 w-4" />
          </a>
          <LimitationsTrigger />
          <LLMKeySettings />
          <BackendModeSelector mode={executionMode} status={backendStatus} checkingElapsedMs={checkingElapsedMs} onChange={switchExecutionMode} />
        </div>
      </header>

      {fallbackMessage && (
        <div className="animate-slide-down flex items-center gap-2.5 border-b border-[#EFDFB0] bg-[#FFF7E6] px-7 py-2.5 text-[12.5px] text-[#8A6A16]">
          <AlertTriangleIcon className="h-4 w-4" />
          <span>{fallbackMessage}</span>
        </div>
      )}

      <div className="mx-auto max-w-[960px] px-6 pb-[72px] pt-14">
        <section className="mb-14 text-center">
          <h1 className="dashboard-heading mb-3.5 text-[40px]">RAG Learning Studio</h1>
          <p className="mx-auto mb-6 max-w-[480px] text-base text-text-muted">
            Learn Retrieval-Augmented Generation by seeing every stage happen visually.
          </p>
          <div className="mt-1.5 text-[13px] text-text-dim">No prior AI knowledge required. Learn by experimenting.</div>
        </section>

        <div className="mb-8">
          <HowThisWorksPanel />
        </div>

        <PipelineAnimation />
        <HowRagWorksTimeline />
        <LearnGrid />
        <JourneyPanel mode={executionMode} onEnterPipeline={handleEnterPipeline} />

        <div className="mt-8">
          <LimitationsTrigger variant="expanded" />
        </div>
      </div>
    </div>
  );
}
