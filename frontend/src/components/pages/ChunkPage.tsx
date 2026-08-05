import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { usePipelineRunContext } from "@/hooks/PipelineRunContext";
import { PipelineShell } from "@/components/layout/PipelineShell";
import { LearningCard } from "@/components/layout/LearningCard";
import { LegendTrigger } from "@/components/pages/parse-clean/LegendTrigger";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateBlocks";
import { chunkColorHex } from "@/components/stages/chunkColor";
import type { Chunk, ChunkParameters } from "@/types/pipeline";

const LEARNING_ITEMS = [
  { heading: "What is this?", body: "The cleaned document is split into overlapping pieces small enough to embed and search individually." },
  { heading: "Why is it needed?", body: "A whole document is too large and too unfocused to embed as one vector — chunks let retrieval find just the relevant part." },
  { heading: "Common mistakes", body: "Setting overlap to 0 — without it, a sentence split across two chunks can lose meaning at the boundary." },
  { heading: "Best practice", body: "Try it: drag chunk size down to ~200 below and watch a sentence get cut mid-thought — then bring overlap back up and see the seam get covered." },
];

const DEFAULT_PARAMS: ChunkParameters = { chunkSize: 500, chunkOverlap: 100 };

interface OverlapInfo {
  overlapLength: number;
  overlapText: string;
}

/** Real longest matching suffix/prefix between two consecutive same-page
 *  chunks — ported from the pre-existing DocumentChunkOverlay's
 *  computeOverlap. A boundary with genuinely no detectable overlap
 *  (e.g. overlap=0) is reported honestly as none, not hidden. */
function computeOverlap(prev: Chunk, curr: Chunk): OverlapInfo | null {
  const MAX_SEARCH = 400;
  const searchLen = Math.min(MAX_SEARCH, prev.text.length, curr.text.length);
  for (let k = searchLen; k > 0; k--) {
    if (prev.text.slice(-k) === curr.text.slice(0, k)) {
      return { overlapLength: k, overlapText: curr.text.slice(0, k) };
    }
  }
  return null;
}

export function ChunkPage() {
  const navigate = useNavigate();
  const { run, rebuildChunks, isLoading } = usePipelineRunContext();
  const chunkResult = run?.stages.chunk;
  const params = chunkResult?.data?.parameters ?? DEFAULT_PARAMS;

  const [draftSize, setDraftSize] = useState(params.chunkSize);
  const [draftOverlap, setDraftOverlap] = useState(params.chunkOverlap);
  const [hoveredChunk, setHoveredChunk] = useState<Chunk | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<Chunk | null>(null);

  if (!run) {
    return (
      <PipelineShell
        learningCard={<LearningCard title="Chunking" colorVar="--stage-chunk" items={LEARNING_ITEMS} collapsedSummary="Teaches why chunking exists and how overlap protects meaning at boundaries." />}
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

  const chunks = chunkResult?.data?.chunks;
  const displayed = hoveredChunk ?? selectedChunk;

  const pages = new Map<number, Chunk[]>();
  (chunks ?? []).forEach((c) => {
    const list = pages.get(c.pageNumber) ?? [];
    list.push(c);
    pages.set(c.pageNumber, list);
  });

  const avgChars = chunks && chunks.length ? Math.round(chunks.reduce((s, c) => s + c.charCount, 0) / chunks.length) : 0;
  const avgTokens = chunks && chunks.length ? Math.round(chunks.reduce((s, c) => s + c.estimatedTokenCount, 0) / chunks.length) : 0;

  const dirty = draftSize !== params.chunkSize || draftOverlap !== params.chunkOverlap;

  return (
    <PipelineShell
      bgTint="rgba(234,122,46,.05)"
      learningCard={<LearningCard title="Chunking" colorVar="--stage-chunk" items={LEARNING_ITEMS} collapsedSummary="Teaches why chunking exists and how overlap protects meaning at boundaries." defaultCollapsed />}
    >
      <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2.5 flex-none">
        <h1 className="m-0 text-xl font-bold">
          Entire Document → Colored Chunk Boundaries{" "}
          <span className="text-[13px] font-normal text-text-dim">
            (Strategy: <b className="font-medium text-text-muted">Recursive character splitting</b>)
          </span>
        </h1>
      </div>

      <div className="mb-2.5 flex flex-none flex-wrap items-center gap-4">
        <LegendTrigger
          chips={<span className="mr-2 inline-block h-4 w-4 rounded-sm" style={{ background: chunkColorHex(2).bg }} />}
          items={[
            { chip: <span className="inline-block h-4 w-4 rounded-sm" style={{ background: chunkColorHex(2).bg }} />, status: "real", text: "one chunk; background color only, text stays black" },
            { chip: <span className="text-base">⋈</span>, status: "real", text: "dashed box between cards — the actual shared text at a chunk boundary, and its real character count" },
          ]}
        />

        <label className="flex items-center gap-2 text-[12px] text-text-muted">
          Chunk size
          <input
            type="range"
            min={150}
            max={1200}
            step={50}
            value={draftSize}
            onChange={(e) => setDraftSize(Number(e.target.value))}
            className="accent-accent-fill"
          />
          <span className="font-mono text-[12px] font-semibold text-text">{draftSize} chars</span>
        </label>

        <label className="flex items-center gap-2 text-[12px] text-text-muted">
          Overlap
          <input
            type="range"
            min={0}
            max={Math.max(50, draftSize - 50)}
            step={20}
            value={draftOverlap}
            onChange={(e) => setDraftOverlap(Number(e.target.value))}
            className="accent-accent-fill"
          />
          <span className="font-mono text-[12px] font-semibold text-text">{draftOverlap} chars</span>
        </label>

        <button
          type="button"
          disabled={!dirty || isLoading}
          onClick={() => rebuildChunks({ chunkSize: draftSize, chunkOverlap: draftOverlap })}
          className="rounded-md border-none bg-gradient-to-br from-stage-chunk to-accent-fill px-4 py-1.5 text-[12.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? "Rebuilding…" : "Rebuild"}
        </button>
      </div>

      {chunkResult?.status === "loading" && <LoadingState label="Rebuilding chunks…" />}
      {(chunkResult?.status === "error" || chunkResult?.status === "failed") && (
        <ErrorState message={chunkResult.reason ?? "Rebuilding chunks failed."} />
      )}

      {chunks && (
        <>
          <div className="mb-2.5 flex flex-none flex-wrap items-center gap-2.5">
            <StatBox n={chunks.length} l="Chunks" />
            <StatBox n={avgChars} l="Avg chars" />
            <StatBox n={`~${avgTokens}`} l="Avg tokens" />
            <div className="min-w-0 flex-1 rounded-md border border-border bg-bg-panel px-3.5 py-2 text-[12px] text-text-muted">
              {displayed ? (
                <span>
                  Chunk <b className="text-text">#{displayed.index}</b> · Page <b className="text-text">{displayed.pageNumber}</b> ·{" "}
                  <b className="text-text">{displayed.charCount}</b> chars · ~<b className="text-text">{displayed.estimatedTokenCount}</b> tokens
                  {displayed.flags && displayed.flags.length > 0 && <span className="ml-2 text-[#8A6A16]">⚑ {displayed.flags[0]!.message}</span>}
                </span>
              ) : (
                "Hover any chunk below to see its details here."
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-bg-panel p-4 shadow-card">
            {[...pages.entries()].map(([pageNum, pageChunks]) => (
              <div key={pageNum} className="mb-5 last:mb-0">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-dim">Page {pageNum}</div>
                <div className="flex flex-col gap-2">
                  {pageChunks.map((chunk, i) => {
                    const prev = i > 0 ? pageChunks[i - 1] : undefined;
                    const overlap = prev ? computeOverlap(prev, chunk) : null;
                    const color = chunkColorHex(chunk.index);
                    return (
                      <div key={chunk.id}>
                        {overlap && (
                          <div className="mb-2 rounded-md border border-dashed border-border-strong bg-bg-elevated px-3 py-2 text-[11px] text-text-dim">
                            <span className="mr-2 font-semibold text-text-muted">
                              #{prev!.index} ⋈ #{chunk.index}
                            </span>
                            <span className="font-mono italic">
                              "{overlap.overlapText.slice(0, 140)}
                              {overlap.overlapText.length > 140 ? "…" : ""}"
                            </span>
                            <span className="ml-2">{overlap.overlapLength} chars overlap</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onMouseEnter={() => setHoveredChunk(chunk)}
                          onMouseLeave={() => setHoveredChunk(null)}
                          onClick={() => setSelectedChunk(chunk)}
                          className={`block w-full rounded-md px-3.5 py-3 text-left text-[13px] leading-relaxed ${
                            selectedChunk?.id === chunk.id ? "ring-2 ring-accent-border" : ""
                          }`}
                          style={{ background: color.bg, color: "var(--text-on-chunk)" }}
                        >
                          <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-bold" style={{ color: color.fg }}>
                            <span>CHUNK #{chunk.index}</span>
                            <span className="rounded-full bg-white/60 px-2 py-0.5">{chunk.charCount} chars</span>
                          </div>
                          {chunk.text}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!chunks && chunkResult?.status !== "loading" && (
        <EmptyState title="No chunks yet" message="Run Upload to generate the first chunk set." />
      )}
      </div>
    </PipelineShell>
  );
}

function StatBox({ n, l }: { n: number | string; l: string }) {
  return (
    <div className="flex-none rounded-md border border-border bg-bg-panel px-3 py-1.5 text-center">
      <div className="text-[15px] font-bold leading-tight text-text">{n}</div>
      <div className="text-[10px] text-text-dim">{l}</div>
    </div>
  );
}
