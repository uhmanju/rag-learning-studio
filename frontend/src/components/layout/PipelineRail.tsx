import { useLocation, useNavigate } from "react-router-dom";
import { STAGES } from "./stageMeta";
import type { PipelineRun } from "@/types/pipeline";
import { stageStatusOf } from "@/types/pipeline";

interface Props {
  run: PipelineRun | null;
}

export function PipelineRail({ run }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeIndex = STAGES.findIndex((s) => s.path === location.pathname);

  return (
    <nav className="w-[21%] min-w-[230px] flex-none overflow-y-auto border-r border-border bg-gradient-to-b from-white to-[#faf8ff] py-[22px]">
      <div className="px-5 pb-[18px] text-[11px] font-bold uppercase tracking-wider text-text-dim">RAG Pipeline</div>
      {STAGES.map((stage, i) => {
        const isActive = i === activeIndex;
        const isDone = run ? stageStatusOf(run, stage.id) === "done" && i < activeIndex : false;
        // A stage is navigable once the run exists and every prior stage
        // is done (or it's Upload, always reachable).
        const reachable = stage.id === "upload" || (run !== null && i <= activeIndex + 1);
        return (
          <div key={stage.id} className="relative px-5">
            {i > 0 && <div className={`absolute left-[39px] -top-0.5 h-5 w-0.5 ${i <= activeIndex ? "" : "bg-border-strong"}`} style={i <= activeIndex ? { background: `var(${stage.colorVar})` } : undefined} />}
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && navigate(stage.path)}
              className={`group relative flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors ${
                isActive ? "" : "hover:bg-bg-hover"
              } ${!reachable ? "cursor-not-allowed opacity-40" : ""}`}
              style={
                isActive
                  ? {
                      background: `linear-gradient(135deg, color-mix(in srgb, var(${stage.colorVar}) 12%, white), color-mix(in srgb, var(${stage.colorVar}) 4%, white))`,
                    }
                  : undefined
              }
            >
              <span
                className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all"
                style={
                  isActive || isDone
                    ? { borderColor: `var(${stage.colorVar})`, background: `var(${stage.colorVar})`, color: "#fff" }
                    : { borderColor: "var(--border-strong)", background: "var(--bg-panel)", color: "var(--text-dim)" }
                }
              >
                {isDone ? "✓" : isActive ? "" : i + 1}
              </span>
              <span className={`text-[13px] ${isActive ? "font-bold text-text" : isDone ? "text-text" : "font-medium text-text-muted"}`}>
                {stage.label}
              </span>
              <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-text px-[11px] py-[7px] text-[11.5px] text-white opacity-0 shadow-card transition-opacity group-hover:opacity-100">
                {stage.tooltip}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
