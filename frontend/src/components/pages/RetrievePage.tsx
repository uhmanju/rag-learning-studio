import { useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { usePipelineRunContext } from "@/hooks/PipelineRunContext";
import { PipelineShell } from "@/components/layout/PipelineShell";
import { LearningCard } from "@/components/layout/LearningCard";
import { ErrorState, EmptyState } from "@/components/common/StateBlocks";
import { ParamSlider } from "@/components/common/ParamSlider";
import { chunkColorHex } from "@/components/stages/chunkColor";
import { PARAMETER_EXPLANATIONS } from "@/components/stages/parameterExplanations";
import { AXIS_CHART_WIDTH, AXIS_CHART_HEIGHT, computeRobustAxisBounds, clampToBounds, toAxisCoords, axisTicks } from "@/components/stages/embedGeometry";
import { highlightRelevantSnippet } from "@/services/termHighlight";
import type { RetrievalResult } from "@/types/pipeline";

const LEARNING_ITEMS = [
  { heading: "What is this?", body: "Your question becomes a vector, compared against every chunk's vector, and the closest ones are recalled." },
  { heading: "Why is it needed?", body: "This is the actual \"retrieval\" in Retrieval-Augmented Generation — it decides what context the model gets to see." },
  { heading: "Common mistakes", body: "Setting the threshold too strict — a correct chunk can be dropped for being just barely outside the cutoff." },
  { heading: "Best practice", body: "Try it: ask the same question twice, tightening the threshold the second time — watch a previously-kept chunk get dropped, and see why in the diagnosis panel." },
];

function RetrievalDiagnosis({ result, onLoosen }: { result: RetrievalResult; onLoosen: (t: number) => void }) {
  const closest = result.candidates.length ? [...result.candidates].sort((a, b) => a.score - b.score)[0] : undefined;
  const suggested = closest ? Math.ceil(closest.score * 10) / 10 : undefined;
  const nothingReturnedAtAll = result.candidates.length === 0;

  return (
    <div className="mb-3 flex-none rounded-md border border-[#EFDFB0] bg-[#FFF7E6] p-3.5">
      <div className="mb-1.5 text-[12.5px] font-semibold text-[#8A6A16]">
        {nothingReturnedAtAll
          ? "⚑ No candidates were returned at all for this question"
          : "⚑ Nothing cleared the threshold — here's what to check"}
      </div>
      {closest ? (
        <p className="m-0 mb-2 text-[12.5px] text-text-muted">
          The closest candidate was{" "}
          <b className="text-text">
            {closest.scoreDirection === "higher-is-better" ? "similarity" : "distance"} {closest.score.toFixed(2)}
          </b>
          , against a threshold of <b className="text-text">{result.parameters.threshold}</b>.
          {suggested !== undefined && (
            <button
              type="button"
              onClick={() => onLoosen(suggested)}
              className="ml-2 rounded-md border border-[#8A6A16] px-2 py-0.5 text-[11px] font-medium text-[#8A6A16]"
            >
              Try threshold {suggested} →
            </button>
          )}
        </p>
      ) : (
        <p className="m-0 mb-2 text-[12.5px] text-text-muted">
          This document may not have any chunk that's even loosely related to this question — try rephrasing it, or
          check the document itself covers the topic you're asking about.
        </p>
      )}
      <ul className="m-0 list-disc pl-[18px] text-[12px] leading-relaxed text-text-muted">
        <li>Extraction quality — check Parse for low-confidence pages.</li>
        <li>Chunk boundaries — check Chunk for flagged short/boundary-risk chunks.</li>
        <li>Embedding model fit — the model may not place the question near its answer.</li>
        <li>Document coverage — the document may simply not contain an answer.</li>
      </ul>
    </div>
  );
}

export function RetrievePage() {
  const navigate = useNavigate();
  const { run, askQuestion, rebuildRetrieval, isLoading, error } = usePipelineRunContext();
  const result = run?.stages.retrieve.data;
  const [draftQuestion, setDraftQuestion] = useState(result?.question ?? "");
  const [draftTopK, setDraftTopK] = useState(result?.parameters.topK ?? 5);
  const [draftThreshold, setDraftThreshold] = useState(result?.parameters.threshold ?? 1.6);

  if (!run) {
    return (
      <PipelineShell
        learningCard={<LearningCard title="Retrieve" colorVar="--stage-retrieve" items={LEARNING_ITEMS} collapsedSummary="Teaches how a question becomes a vector search." />}
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

  const chunks = run.stages.chunk.data?.chunks ?? [];
  const projection = run.stages.embed.data?.projection;
  const chunkById = new Map(chunks.map((c) => [c.id, c]));
  const keptCandidates = result?.candidates.filter((c) => c.kept) ?? [];
  const maxScore = result && result.candidates.length ? Math.max(2.2, ...result.candidates.map((c) => c.score)) : 2.2;
  const scoreLabel = result?.candidates[0]?.scoreDirection === "higher-is-better" ? "Similarity" : "Distance";

  const bounds = projection && projection.length ? computeRobustAxisBounds(projection.map((p) => ({ x: p.x, y: p.y }))) : null;
  const questionPoint2D =
    projection && keptCandidates.length
      ? (() => {
          let sx = 0, sy = 0, n = 0;
          for (const cand of keptCandidates) {
            const p = projection.find((pr) => pr.chunkId === cand.chunkId);
            if (!p) continue;
            sx += p.x; sy += p.y; n++;
          }
          return n > 0 ? { x: sx / n, y: sy / n } : null;
        })()
      : null;
  const clampedQuestionPoint2D = bounds && questionPoint2D ? clampToBounds(questionPoint2D.x, questionPoint2D.y, bounds) : null;
  const questionPoint = bounds && clampedQuestionPoint2D ? toAxisCoords(clampedQuestionPoint2D.x, clampedQuestionPoint2D.y, bounds) : null;

  return (
    <PipelineShell
      bgTint="rgba(229,72,77,.05)"
      learningCard={<LearningCard title="Retrieve" colorVar="--stage-retrieve" items={LEARNING_ITEMS} collapsedSummary="Teaches how a question becomes a vector search." defaultCollapsed />}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-3 flex-none">
          <h1 className="m-0 text-xl font-bold">Question → Nearest Chunks</h1>
        </div>

        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (draftQuestion.trim()) void askQuestion(draftQuestion.trim(), { topK: draftTopK, threshold: draftThreshold });
          }}
          className="mb-3 flex flex-none gap-2"
        >
          <input
            type="text"
            value={draftQuestion}
            onChange={(e) => setDraftQuestion(e.target.value)}
            placeholder="Ask a question about this document…"
            disabled={isLoading}
            className="flex-1 rounded-md border border-border bg-bg-elevated px-3 py-2.5 text-[13px] text-text disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || !draftQuestion.trim()}
            className="flex items-center gap-1.5 rounded-md border-none bg-gradient-to-br from-stage-retrieve to-accent-fill px-4 py-2.5 text-[12.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading && <span className="h-3 w-3 flex-none animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {isLoading ? "Asking…" : "Ask"}
          </button>
        </form>

        <div className="mb-3 flex flex-none flex-wrap items-center gap-4">
          <ParamSlider label="Top K" value={draftTopK} min={1} max={10} step={1} explanation={PARAMETER_EXPLANATIONS.topK.purpose} disabled={isLoading} onChange={setDraftTopK} />
          <ParamSlider label="Threshold" value={draftThreshold} min={0.5} max={2.2} step={0.1} explanation={PARAMETER_EXPLANATIONS.threshold.purpose} disabled={isLoading} onChange={setDraftThreshold} />
          {result && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => rebuildRetrieval({ topK: draftTopK, threshold: draftThreshold })}
              className="rounded-md border border-border-strong px-3 py-1.5 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Re-run retrieval
            </button>
          )}
        </div>

        {error && <ErrorState message={error} />}

        {!result ? (
          <EmptyState title="No question asked yet" message="Ask a question above to see retrieval in action." />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[340px_1fr]">
            {projection && projection.length > 0 && (
              <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-bg-panel p-4 shadow-card">
                <div className="mb-2 flex flex-col gap-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-text-dim">Question in vector space</div>
                  <div className="flex items-center gap-4 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#5dcaa5]" /> Chunks
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#e5484d]" /> Question
                    </span>
                  </div>
                </div>
                <svg viewBox={`0 0 ${AXIS_CHART_WIDTH} ${AXIS_CHART_HEIGHT}`} className="w-full">
                  {bounds &&
                    axisTicks(bounds.xMin, bounds.xMax).map((v, i) => {
                      const { px } = toAxisCoords(v, bounds.yMin, bounds);
                      return (
                        <g key={`x${i}`}>
                          <line x1={px} y1={14} x2={px} y2={AXIS_CHART_HEIGHT - 38} stroke="var(--border-soft)" />
                          <text x={px} y={AXIS_CHART_HEIGHT - 22} fontSize={10} fill="var(--text-dim)" textAnchor="middle">
                            {v.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}
                  {bounds &&
                    axisTicks(bounds.yMin, bounds.yMax).map((v, i) => {
                      const { py } = toAxisCoords(bounds.xMin, v, bounds);
                      return (
                        <g key={`y${i}`}>
                          <line x1={46} y1={py} x2={AXIS_CHART_WIDTH - 20} y2={py} stroke="var(--border-soft)" />
                          <text x={38} y={py + 3} fontSize={10} fill="var(--text-dim)" textAnchor="end">
                            {v.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}
                  {bounds && <line x1={46} y1={14} x2={46} y2={AXIS_CHART_HEIGHT - 38} stroke="var(--border-strong)" />}
                  {bounds && <line x1={46} y1={AXIS_CHART_HEIGHT - 38} x2={AXIS_CHART_WIDTH - 20} y2={AXIS_CHART_HEIGHT - 38} stroke="var(--border-strong)" />}

                  {questionPoint &&
                    bounds &&
                    keptCandidates.map((cand) => {
                      const p = projection.find((pr) => pr.chunkId === cand.chunkId);
                      if (!p) return null;
                      const clamped = clampToBounds(p.x, p.y, bounds);
                      const { px, py } = toAxisCoords(clamped.x, clamped.y, bounds);
                      return (
                        <line
                          key={`line-${cand.chunkId}`}
                          x1={questionPoint.px}
                          y1={questionPoint.py}
                          x2={px}
                          y2={py}
                          stroke="var(--text-dim)"
                          strokeWidth={1}
                          strokeDasharray="4 3"
                        />
                      );
                    })}

                  {bounds &&
                    chunks.map((chunk) => {
                      const p = projection.find((pr) => pr.chunkId === chunk.id);
                      if (!p) return null;
                      const clamped = clampToBounds(p.x, p.y, bounds);
                      const wasClamped = clamped.x !== p.x || clamped.y !== p.y;
                      const { px, py } = toAxisCoords(clamped.x, clamped.y, bounds);
                      const kept = keptCandidates.some((c) => c.chunkId === chunk.id);
                      return (
                        <circle
                          key={chunk.id}
                          cx={px}
                          cy={py}
                          r={kept ? 7 : 5.5}
                          fill="#5dcaa5"
                          opacity={kept ? 1 : 0.75}
                          stroke={wasClamped ? "var(--text-dim)" : "#0f6e56"}
                          strokeWidth={wasClamped ? 1.5 : 1.5}
                          strokeDasharray={wasClamped ? "2 2" : undefined}
                        >
                          <title>
                            Chunk #{chunk.index} · page {chunk.pageNumber} {kept ? "(kept)" : "(not kept)"}
                            {wasClamped ? " — an outlier, shown pinned to the chart edge" : ""}
                          </title>
                        </circle>
                      );
                    })}
                  {questionPoint && (
                    <g>
                      <circle cx={questionPoint.px} cy={questionPoint.py} r={9} fill="none" stroke="#e5484d" strokeWidth={2} opacity={0.4} />
                      <circle cx={questionPoint.px} cy={questionPoint.py} r={5} fill="#e5484d" stroke="white" strokeWidth={1.5}>
                        <title>Your question — positioned at the center of its real kept candidates</title>
                      </circle>
                    </g>
                  )}
                </svg>
                {!questionPoint && (
                  <p className="mt-2 text-[11.5px] text-text-dim">
                    No chunks cleared the threshold, so there's no kept-candidate centroid to plot the question at.
                  </p>
                )}
              </div>
            )}

            <div className="min-h-0 overflow-y-auto">
            {result.candidates.every((c) => !c.kept) && (
              <RetrievalDiagnosis result={result} onLoosen={(t) => rebuildRetrieval({ ...result.parameters, threshold: t })} />
            )}

            <div className="flex flex-col gap-2.5">
              {result.candidates.map((cand) => {
                const chunk = chunkById.get(cand.chunkId);
                if (!chunk) return null;
                const color = chunkColorHex(chunk.index);
                const pct = Math.min(100, (cand.score / maxScore) * 100);
                const snippet = highlightRelevantSnippet(result.question, chunk.text);
                return (
                  <div
                    key={cand.chunkId}
                    className={`rounded-md border p-3.5 ${cand.kept ? "border-border" : "border-border opacity-50"}`}
                    style={{ background: cand.kept ? color.bg : "var(--bg-elevated)", color: cand.kept ? "var(--text-on-chunk)" : undefined }}
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] text-text-dim">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color.fg }} />
                      <span className="font-mono">Chunk {chunk.index} · page {chunk.pageNumber}</span>
                      <span className="ml-auto rounded-full bg-white/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-text">
                        {scoreLabel} {cand.score.toFixed(2)}
                      </span>
                      <span>{cand.kept ? "kept" : "dropped"}</span>
                    </div>
                    <div className="mb-2 h-1.5 rounded-full bg-white/60">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color.fg }} />
                    </div>
                    <div className="text-[12.5px] leading-relaxed">
                      {snippet.segments.map((seg, i) =>
                        seg.match ? (
                          <mark key={i} className="rounded-sm bg-yellow-200/70 px-0.5">
                            {seg.text}
                          </mark>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        ),
                      )}
                    </div>
                    {cand.matchExplanation && <div className="mt-1.5 text-[11px] text-text-dim">{cand.matchExplanation}</div>}
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}
      </div>
    </PipelineShell>
  );
}
