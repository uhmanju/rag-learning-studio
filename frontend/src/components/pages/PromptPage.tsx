import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { usePipelineRunContext } from "@/hooks/PipelineRunContext";
import { PipelineShell } from "@/components/layout/PipelineShell";
import { LearningCard } from "@/components/layout/LearningCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateBlocks";
import { CopyButton } from "@/components/common/CopyButton";
import { chunkColorHex } from "@/components/stages/chunkColor";
import type { PromptSection } from "@/types/pipeline";

const LEARNING_ITEMS = [
  { heading: "What is this?", body: "The retrieved chunks, the question, and system instructions get assembled into the one prompt the model actually sees." },
  { heading: "Why is it needed?", body: "The model has no memory of your document — everything it \"knows\" for this answer has to be right here, in this text." },
  { heading: "Common mistakes", body: "Assuming more context is always better — an overstuffed prompt can bury the relevant chunk in noise." },
  { heading: "Best practice", body: "Click a context section to jump back to its source chunk." },
];

function sectionColor(kind: PromptSection["kind"]): { bg: string; fg: string } {
  switch (kind) {
    case "system":
      return { bg: "#eaf1fe", fg: "#2054b0" };
    case "context":
      return { bg: "#fdf1ea", fg: "#b35a1e" };
    case "question":
      return { bg: "#fceef3", fg: "#b0356a" };
    default:
      return { bg: "var(--bg-elevated)", fg: "var(--text)" };
  }
}

export function PromptPage() {
  const navigate = useNavigate();
  const { run } = usePipelineRunContext();
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  if (!run) {
    return (
      <PipelineShell
        learningCard={<LearningCard title="Prompt" colorVar="--stage-prompt" items={LEARNING_ITEMS} collapsedSummary="Teaches how context and question become one prompt." />}
      >
        <EmptyState
          title="No document yet"
          message="Upload a document first."
          action={
            <button type="button" onClick={() => navigate("/upload")} className="mt-3 rounded-md border border-border-strong px-4 py-1.5 text-[12.5px]">
              Go to Upload
            </button>
          }
        />
      </PipelineShell>
    );
  }

  const promptResult = run.stages.prompt;
  const chunks = run.stages.chunk.data?.chunks ?? [];

  return (
    <PipelineShell
      bgTint="rgba(99,102,241,.05)"
      learningCard={<LearningCard title="Prompt" colorVar="--stage-prompt" items={LEARNING_ITEMS} collapsedSummary="Teaches how context and question become one prompt." defaultCollapsed />}
    >
      <div className="mb-3.5 flex-none">
        <h1 className="m-0 text-xl font-bold">Retrieved Context → Assembled Prompt</h1>
      </div>

      {promptResult.status === "loading" && <LoadingState label="Assembling prompt…" />}
      {(promptResult.status === "error" || promptResult.status === "failed") && (
        <ErrorState message={promptResult.reason ?? "Prompt assembly failed."} />
      )}
      {!promptResult.data ? (
        <EmptyState
          title="No prompt assembled yet"
          message="Ask a question in Retrieve to see the prompt built here."
          action={
            <button type="button" onClick={() => navigate("/retrieve")} className="mt-3 rounded-md border border-border-strong px-4 py-1.5 text-[12.5px]">
              Go to Retrieve
            </button>
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {promptResult.data.sections.map((section, i) => {
            const color = sectionColor(section.kind);
            const chunk = section.sourceChunkId ? chunks.find((c) => c.id === section.sourceChunkId) : undefined;
            const chunkColor = chunk ? chunkColorHex(chunk.index) : null;
            return (
              <div key={i} className="mb-2.5 overflow-hidden rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [i]: !c[i] }))}
                  className="flex w-full items-center px-3.5 py-2 text-left text-[12.5px] font-semibold"
                  style={{ background: color.bg, color: color.fg }}
                >
                  {i + 1} · {section.label}
                </button>
                {!collapsed[i] && (
                  <div className="bg-bg-panel px-3.5 py-3 text-[12.5px] leading-relaxed">
                    {chunk && chunkColor ? (
                      <div className="rounded-md p-2.5 font-mono text-[12px]" style={{ background: chunkColor.bg, color: "var(--text)" }}>
                        {section.content}
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{section.content}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="overflow-hidden rounded-md border border-border">
            <div className="flex items-center justify-between bg-bg-elevated px-3.5 py-2 text-[12.5px] font-semibold">
              Final Prompt
              <CopyButton text={promptResult.data.finalPrompt} />
            </div>
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap bg-bg-panel px-3.5 py-3 font-mono text-[12px] leading-relaxed">
              {promptResult.data.finalPrompt}
            </div>
          </div>
        </div>
      )}
    </PipelineShell>
  );
}
