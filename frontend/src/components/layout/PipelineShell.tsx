import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { usePipelineRunContext } from "@/hooks/PipelineRunContext";
import { PipelineRail } from "./PipelineRail";
import { BackendModeSelector } from "./BackendModeSelector";
import { LimitationsTrigger } from "@/components/common/LimitationsPanel";
import { FlaskIcon, AlertTriangleIcon } from "@/components/common/icons";

interface Props {
  learningCard: ReactNode;
  children: ReactNode;
  bgTint?: string; // e.g. "rgba(47,111,237,.05)" for the stage's radial-gradient wash
}

// Every pipeline stage page shares this shell.
//
// The header previously carried a per-page "topBarNote" string, each
// written to describe that page's real backend call (e.g. "Parse — real
// data from X.pdf"). In practice these turned into UI clutter without
// adding information a user actually needed — and forced a trip back to
// Upload just to remember which file was even loaded. Replaced with one
// thing computed here, consistently, from the actual run: which
// document is currently loaded. No page needs to pass its own note
// anymore.
export function PipelineShell({ learningCard, children, bgTint }: Props) {
  const navigate = useNavigate();
  const { run, executionMode, switchExecutionMode, backendStatus, checkingElapsedMs, fallbackMessage, isLoading } = usePipelineRunContext();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="relative flex flex-none items-center gap-3 border-b border-border bg-surface-2 px-4 py-1.5">
        {isLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden bg-bg-elevated">
            <div className="h-full w-1/3 animate-[loading-sweep_1.1s_ease-in-out_infinite] bg-accent-fill" />
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex flex-none items-center gap-1.5 text-[13px] font-medium text-text hover:text-accent-text"
        >
          <FlaskIcon className="h-4 w-4 text-accent-text" />
          RAG Learning Studio
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-[11.5px] text-text-dim">
          {run ? (
            <>
              Working with: <b className="font-medium text-text-muted">{run.document.fileName}</b>
            </>
          ) : (
            "No document loaded yet — start at Upload"
          )}
        </span>
        <LimitationsTrigger />
        <BackendModeSelector mode={executionMode} status={backendStatus} checkingElapsedMs={checkingElapsedMs} onChange={switchExecutionMode} />
      </header>

      {fallbackMessage && (
        <div className="animate-slide-down flex flex-none items-center gap-2.5 border-b border-[#EFDFB0] bg-[#FFF7E6] px-5 py-1.5 text-[12px] text-[#8A6A16]">
          <AlertTriangleIcon className="h-4 w-4 flex-none" />
          <span>{fallbackMessage}</span>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <PipelineRail run={run} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {learningCard}
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-3"
            style={bgTint ? { background: `radial-gradient(circle at 15% 0%, ${bgTint}, transparent 45%)` } : undefined}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
