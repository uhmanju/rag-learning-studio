import { useNavigate } from "react-router-dom";
import { usePipelineRunContext } from "@/hooks/PipelineRunContext";
import { PipelineShell } from "@/components/layout/PipelineShell";
import { LearningCard } from "@/components/layout/LearningCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateBlocks";
import { chunkColorHex } from "@/components/stages/chunkColor";
import { AlertTriangleIcon } from "@/components/common/icons";

const LEARNING_ITEMS = [
  { heading: "What is this?", body: "The model reads the assembled prompt and produces an answer grounded in the retrieved context — or declines, if nothing supports one." },
  { heading: "Why is it needed?", body: "This is the payoff of the whole pipeline: a real, sourced answer instead of the model guessing from general training data." },
  { heading: "Common mistakes", body: "Treating a declined answer as a bug — abstaining when nothing supports a response is the correct, honest behavior." },
  { heading: "Best practice", body: "Click a source chip to jump back to the exact chunk the answer drew from." },
];

export function GeneratePage() {
  const navigate = useNavigate();
  const { run } = usePipelineRunContext();

  if (!run) {
    return (
      <PipelineShell
        learningCard={<LearningCard title="Generate" colorVar="--stage-generate" items={LEARNING_ITEMS} collapsedSummary="Teaches how the model turns context into a grounded answer." />}
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

  const genResult = run.stages.generate;
  const chunks = run.stages.chunk.data?.chunks ?? [];
  const generation = genResult.data;
  const uniqueChunkIds = generation ? [...new Set(generation.citations.map((c) => c.chunkId))] : [];
  const answerBody = generation ? generation.answer.replace(/\n*Sources:[\s\S]*$/i, "").trim() : "";

  return (
    <PipelineShell
      bgTint="rgba(13,148,136,.05)"
      learningCard={<LearningCard title="Generate" colorVar="--stage-generate" items={LEARNING_ITEMS} collapsedSummary="Teaches how the model turns context into a grounded answer." defaultCollapsed />}
    >
      <div className="mb-3.5 flex-none">
        <h1 className="m-0 text-xl font-bold">Prompt → Grounded Answer</h1>
      </div>

      {genResult.status === "loading" && <LoadingState label="Generating answer…" />}
      {(genResult.status === "error" || genResult.status === "failed") && (
        <ErrorState message={genResult.reason ?? "Generation failed."} />
      )}
      {!generation ? (
        <EmptyState
          title="No answer yet"
          message="Ask a question in Retrieve to generate an answer."
          action={
            <button type="button" onClick={() => navigate("/retrieve")} className="mt-3 rounded-md border border-border-strong px-4 py-1.5 text-[12.5px]">
              Go to Retrieve
            </button>
          }
        />
      ) : generation.blockedNoKey ? (
        // A real, explicit blocked state — no answer text at all, real or
        // extractive. Retrieval genuinely found relevant chunks (shown
        // below so that part of the pipeline stays visible), but no LLM
        // was reachable to actually write an answer from them. This
        // replaced a silent extractive-fallback that more than one person
        // testing this app mistook for a real (but wrong) generated
        // answer — better to stop and say so plainly than produce
        // anything that could be misread as a model's output.
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="rounded-lg border border-[#EFDFB0] bg-[#FFF7E6] p-5">
            <div className="mb-2 flex items-center gap-2 text-[#8A6A16]">
              <AlertTriangleIcon className="h-5 w-5 flex-none" />
              <span className="text-[14px] font-semibold">No answer generated — no LLM available</span>
            </div>
            <p className="m-0 mb-3 text-[13px] leading-relaxed text-[#8A6A16]">
              Retrieval found relevant context (see the chunks below), but there's no model available to write an
              answer from it. Add your own Groq API key from the Dashboard to enable real answers.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-md border border-[#8A6A16] px-3.5 py-1.5 text-[12.5px] font-medium text-[#8A6A16] hover:bg-[#FFF1D1]"
            >
              Go to Dashboard →
            </button>
          </div>

          {uniqueChunkIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {uniqueChunkIds.map((chunkId) => {
                const chunk = chunks.find((c) => c.id === chunkId);
                if (!chunk) return null;
                const color = chunkColorHex(chunk.index);
                return (
                  <span key={chunkId} className="inline-flex items-center gap-1.5 rounded-full bg-bg-elevated px-3 py-1 text-[11.5px] text-text-muted">
                    <span className="h-2 w-2 rounded-sm" style={{ background: color.fg }} />
                    chunk #{chunk.index} · pg {chunk.pageNumber}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="rounded-lg border border-border bg-bg-panel p-5 shadow-card">
            <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-text">{answerBody}</div>

            {uniqueChunkIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border-soft pt-4">
                {uniqueChunkIds.map((chunkId) => {
                  const chunk = chunks.find((c) => c.id === chunkId);
                  if (!chunk) return null;
                  const color = chunkColorHex(chunk.index);
                  return (
                    <span key={chunkId} className="inline-flex items-center gap-1.5 rounded-full bg-bg-elevated px-3 py-1 text-[11.5px] text-text-muted">
                      <span className="h-2 w-2 rounded-sm" style={{ background: color.fg }} />
                      chunk #{chunk.index} · pg {chunk.pageNumber}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {generation.abstained && (
            <p className="mt-3 text-[12.5px] text-text-dim">
              This is a deliberate, correct outcome — not an error. See Retrieve for the diagnosis of why nothing
              qualified as context.
            </p>
          )}

          {generation.modelUsed && <p className="mt-2 text-[11.5px] text-text-dim">Model: {generation.modelUsed}</p>}
        </div>
      )}
    </PipelineShell>
  );
}
