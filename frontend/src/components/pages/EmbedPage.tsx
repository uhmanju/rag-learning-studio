import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { usePipelineRunContext } from "@/hooks/PipelineRunContext";
import { PipelineShell } from "@/components/layout/PipelineShell";
import { LearningCard } from "@/components/layout/LearningCard";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateBlocks";
import { chunkColorHex } from "@/components/stages/chunkColor";
import { AXIS_CHART_WIDTH, AXIS_CHART_HEIGHT, computeRobustAxisBounds, clampToBounds, toAxisCoords, axisTicks } from "@/components/stages/embedGeometry";
import type { Chunk, ChunkId } from "@/types/pipeline";

const LEARNING_ITEMS = [
  { heading: "What is this?", body: "Every chunk becomes a vector — a list of numbers capturing its meaning — placed near other chunks with similar meaning." },
  { heading: "Why is it needed?", body: "Retrieval can't compare text directly at scale; comparing vectors (distance/similarity) is what makes fast semantic search possible." },
  { heading: "Common mistakes", body: "Assuming embeddings capture exact keywords — they capture meaning, so paraphrases can be \"close\" even with zero shared words." },
  { heading: "Best practice", body: "Click any chunk in the map to see its real vector preview below." },
];

export function EmbedPage() {
  const navigate = useNavigate();
  const { run, executionMode } = usePipelineRunContext();
  const [selected, setSelected] = useState<ChunkId | null>(null);

  if (!run) {
    return (
      <PipelineShell
        learningCard={<LearningCard title="Embeddings" colorVar="--stage-embed" items={LEARNING_ITEMS} collapsedSummary="Teaches how chunk meaning becomes a vector." />}
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

  const embedResult = run.stages.embed;
  const chunks = run.stages.chunk.data?.chunks ?? [];
  const chunkById = new Map<ChunkId, Chunk>(chunks.map((c) => [c.id, c]));
  const projection = embedResult.data?.projection;
  const embeddings = embedResult.data?.embeddings ?? [];
  const model = embedResult.data?.model;
  const selectedEmbedding = selected ? embeddings.find((e) => e.chunkId === selected) : undefined;
  const selectedChunk = selected ? chunkById.get(selected) : undefined;

  const bounds = projection && projection.length ? computeRobustAxisBounds(projection.map((p) => ({ x: p.x, y: p.y }))) : null;

  return (
    <PipelineShell
      bgTint="rgba(139,92,246,.05)"
      learningCard={<LearningCard title="Embeddings" colorVar="--stage-embed" items={LEARNING_ITEMS} collapsedSummary="Teaches how chunk meaning becomes a vector." defaultCollapsed />}
    >
      <div className="mb-3.5 flex-none">
        <h1 className="m-0 text-xl font-bold">Chunks → Numeric Vectors</h1>
        {model && (
          <span className="text-[13px] text-text-muted">
            {model.name} · {model.dimensions} dimensions{model.normalized ? " · normalized" : ""}
          </span>
        )}
      </div>

      {embedResult.status === "loading" && <LoadingState label="Embedding chunks…" />}
      {(embedResult.status === "error" || embedResult.status === "failed") && (
        <ErrorState message={embedResult.reason ?? "Embedding failed."} />
      )}

      {embedResult.status === "done" && (
        <div className="grid min-h-0 flex-1 grid-cols-[1.4fr_1fr] gap-4 overflow-hidden">
          <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-bg-panel p-4 shadow-card">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-dim">
              2D projection {projection?.[0]?.method ? `(${projection[0].method})` : ""}
            </div>
            {!projection || projection.length === 0 ? (
              <EmptyState title="No projection available" message="This adapter doesn't currently return 2D positions for chunks." />
            ) : (
              <svg viewBox={`0 0 ${AXIS_CHART_WIDTH} ${AXIS_CHART_HEIGHT}`} className="w-full">
                {bounds &&
                  axisTicks(bounds.xMin, bounds.xMax).map((v, i) => {
                    const { px } = toAxisCoords(v, bounds.yMin, bounds);
                    return <line key={`x${i}`} x1={px} y1={14} x2={px} y2={AXIS_CHART_HEIGHT - 38} stroke="var(--border-soft)" />;
                  })}
                {bounds &&
                  axisTicks(bounds.yMin, bounds.yMax).map((v, i) => {
                    const { py } = toAxisCoords(bounds.xMin, v, bounds);
                    return <line key={`y${i}`} x1={46} y1={py} x2={AXIS_CHART_WIDTH - 20} y2={py} stroke="var(--border-soft)" />;
                  })}
                {bounds &&
                  projection.map((p) => {
                    const chunk = chunkById.get(p.chunkId);
                    if (!chunk) return null;
                    const { px, py } = toAxisCoords(clampToBounds(p.x, p.y, bounds).x, clampToBounds(p.x, p.y, bounds).y, bounds);
                    const color = chunkColorHex(chunk.index);
                    const isSelected = chunk.id === selected;
                    return (
                      <circle
                        key={p.chunkId}
                        cx={px}
                        cy={py}
                        r={isSelected ? 8 : 6}
                        fill={color.fg}
                        stroke={isSelected ? "var(--text)" : "none"}
                        strokeWidth={2}
                        className="cursor-pointer"
                        onClick={() => setSelected(chunk.id)}
                      >
                        <title>
                          Chunk #{chunk.index} · page {chunk.pageNumber}
                        </title>
                      </circle>
                    );
                  })}
              </svg>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-bg-panel p-4 shadow-card">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-dim">Real embedding preview</div>
            {!selectedChunk ? (
              <p className="text-[12.5px] text-text-muted">Click a point on the map to inspect its real vector.</p>
            ) : (
              <>
                <div className="mb-2 text-[13px] font-semibold">
                  Chunk #{selectedChunk.index} · page {selectedChunk.pageNumber}
                </div>
                <div className="mb-3 max-h-40 overflow-y-auto rounded-md bg-bg-elevated p-2.5 text-xs leading-relaxed text-text-muted">
                  {selectedChunk.text}
                </div>
                {selectedEmbedding && selectedEmbedding.vector.length > 0 ? (
                  <div className="rounded-md bg-bg-elevated p-2.5 font-mono text-[11px] leading-relaxed text-text">
                    [{selectedEmbedding.vector.slice(0, 24).map((v) => v.toFixed(3)).join(", ")}
                    {selectedEmbedding.vector.length > 24 ? `, … (${selectedEmbedding.vector.length} total)` : ""}]
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-border-strong bg-bg-elevated p-2.5 text-[11.5px] text-text-dim">
                    {executionMode === "offline"
                      ? "Raw vector preview is only available in Demo Mode — the local backend doesn't currently send vector values over HTTP."
                      : "This chunk's vector wasn't returned by the current adapter."}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </PipelineShell>
  );
}
