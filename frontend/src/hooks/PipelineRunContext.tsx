import { createContext, useContext, type ReactNode } from "react";
import { usePipelineRun, type UsePipelineRunResult } from "@/hooks/usePipelineRun";

/**
 * Closes the gap STATE_MANAGEMENT.md / APPLICATION_ARCHITECTURE.md §6
 * flagged as the single most important missing piece: "no global state,
 * no contexts, no providers... the Backend Mode selector exists only in
 * the dashboard file; no stage file reads or reacts to it." Mounting
 * usePipelineRun() once here (instead of once per page) is what makes
 * Execution Mode, backend status, and the current run genuinely global.
 */
const PipelineRunContext = createContext<UsePipelineRunResult | null>(null);

export function PipelineRunProvider({ children }: { children: ReactNode }) {
  const value = usePipelineRun();
  return <PipelineRunContext.Provider value={value}>{children}</PipelineRunContext.Provider>;
}

export function usePipelineRunContext(): UsePipelineRunResult {
  const ctx = useContext(PipelineRunContext);
  if (!ctx) {
    throw new Error("usePipelineRunContext must be used within a PipelineRunProvider");
  }
  return ctx;
}
