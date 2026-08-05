import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePipelineRunContext } from "@/hooks/PipelineRunContext";
import { PipelineShell } from "@/components/layout/PipelineShell";
import { LearningCard } from "@/components/layout/LearningCard";
import { SyncedDocumentView } from "@/components/common/SyncedDocumentView";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateBlocks";
import { markCleaningChanges, type CleanMarkSegment } from "@/services/cleaningMarks";

const LEARNING_ITEMS = [
  { heading: "What is this?", body: "A narrow, specific step: trailing whitespace stripped, runs of 3+ blank lines collapsed to one. Nothing else." },
  { heading: "Why is it needed?", body: "Small whitespace noise wastes tokens later and can subtly affect chunk boundaries — cheap to fix once, here." },
  { heading: "Common mistakes", body: "Assuming \"cleaning\" means OCR correction or header/footer removal — this pipeline doesn't do either, on purpose, shown honestly rather than pretended." },
  { heading: "Best practice", body: "If a document shows no marks here, that's a real result, not a broken page — some documents genuinely need no cleanup." },
];

function WsMark() {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative mx-0.5 inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="trailing whitespace removed here"
        className="inline-block h-2.5 w-2.5 rounded-sm bg-[#9b958a] align-middle"
      />
      {open && (
        <span className="absolute left-0 top-full z-20 mt-1 block w-64 whitespace-normal rounded-md border border-border bg-bg-panel p-2.5 text-[11.5px] leading-snug text-text-muted shadow-card">
          <b className="text-text">Why: </b>
          This line had trailing spaces or tabs after its last visible character — invisible on the page, but real
          extra characters that would otherwise waste tokens later. Removed, nothing else changed.
        </span>
      )}
    </span>
  );
}

function BlankNote({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative mx-0.5 inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-[5px] border border-border-strong bg-bg-elevated px-[7px] py-px text-[10.5px] font-semibold text-text-muted"
      >
        ⋯ {count} blank line(s) collapsed to 1
      </button>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-1 block w-64 whitespace-normal rounded-md border border-border bg-bg-panel p-2.5 text-[11.5px] leading-snug text-text-muted shadow-card">
          <b className="text-text">Why: </b>
          {count + 1} consecutive blank lines were found here — collapsed to a single blank line.
        </span>
      )}
    </span>
  );
}

function renderMarkedSegments(segments: CleanMarkSegment[]) {
  return segments.map((seg, i) => {
    if (seg.type === "ws-mark") return <WsMark key={i} />;
    if (seg.type === "blank-note") return <BlankNote key={i} count={seg.count} />;
    return <span key={i}>{seg.text}</span>;
  });
}

const ILLUSTRATIVE_EXAMPLE = "Widget CLI reads configuration from    \n\n\n\nthe current directory.";

export function Clean() {
  const navigate = useNavigate();
  const { run } = usePipelineRunContext();
  const [showIllustrative, setShowIllustrative] = useState(false);

  const parsePages = run?.stages.parse.data;
  const marked = useMemo(() => {
    if (!parsePages) return [];
    return parsePages.map((p) => ({ pageNumber: p.pageNumber, ...markCleaningChanges(p.rawText) }));
  }, [parsePages]);

  if (!run) {
    return (
      <PipelineShell
        learningCard={<LearningCard title="Clean" colorVar="--stage-clean" items={LEARNING_ITEMS} collapsedSummary="Teaches exactly what this pipeline's cleaning step does." />}
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

  const cleanResult = run.stages.clean;
  const anyChangeAnywhere = marked.some((m) => m.anyChange);

  return (
    <PipelineShell
      bgTint="rgba(22,163,74,.05)"
      learningCard={<LearningCard title="Clean" colorVar="--stage-clean" items={LEARNING_ITEMS} collapsedSummary="Teaches exactly what this pipeline's cleaning step does." defaultCollapsed />}
    >
      <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2.5 flex-none">
        <h1 className="m-0 text-xl font-bold">Parsed Markdown → Cleaned Markdown</h1>
        <span className="text-[13px] text-text-muted">Scroll either side — they move together</span>
      </div>

      {cleanResult.status === "loading" && <LoadingState label="Cleaning document…" />}
      {(cleanResult.status === "error" || cleanResult.status === "failed") && (
        <ErrorState message={cleanResult.reason ?? "Cleaning failed for an unknown reason."} />
      )}
      {cleanResult.status === "done" && parsePages && (
        <>
          {!anyChangeAnywhere && (
            <div className="mb-3 flex-none rounded-md border border-border bg-bg-elevated px-4 py-3">
              <p className="m-0 text-[12.5px] text-text-muted">
                No whitespace issues found anywhere in this document — it was already clean. That's a real result,
                not a broken page.
              </p>
              <button
                type="button"
                onClick={() => setShowIllustrative((v) => !v)}
                className="mt-2 text-[11.5px] font-medium text-accent-text underline"
              >
                {showIllustrative ? "Hide illustrative example ▾" : "Show an illustrative example ▸"}
              </button>
              {showIllustrative && (
                <div className="mt-2.5 rounded-md border border-dashed border-[#EFDFB0] bg-[#FFFCF3] p-3 font-mono text-[12px] leading-relaxed text-text-muted">
                  <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8A6A16]">
                    ⚠ Illustrative only — not from this document
                  </div>
                  {renderMarkedSegments(markCleaningChanges(ILLUSTRATIVE_EXAMPLE).segments)}
                </div>
              )}
            </div>
          )}

          <SyncedDocumentView
            leftLabel="Parsed Markdown"
            rightLabel={
              <>
                Cleaned Markdown{" "}
                {!anyChangeAnywhere && <span className="font-normal text-text-dim">(identical — nothing to clean)</span>}
              </>
            }
            rightVariant="markdown"
            pages={parsePages.map((p) => {
              const m = marked.find((x) => x.pageNumber === p.pageNumber);
              return {
                pageNumber: p.pageNumber,
                leftContent: <span>{p.rawText}</span>,
                rightContent: <span>{m ? renderMarkedSegments(m.segments) : p.rawText}</span>,
              };
            })}
          />
        </>
      )}
      </div>
    </PipelineShell>
  );
}
