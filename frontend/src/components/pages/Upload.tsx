import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { usePipelineRunContext } from "@/hooks/PipelineRunContext";
import { PipelineShell } from "@/components/layout/PipelineShell";
import { LearningCard } from "@/components/layout/LearningCard";
import { SampleDocumentPicker } from "@/components/pages/upload/SampleDocumentPicker";

const LEARNING_ITEMS = [
  { heading: "What is this?", body: "The starting point — a PDF is handed to the pipeline before anything happens to it." },
  { heading: "Why is it needed?", body: "Every later stage depends on this document existing — nothing can be parsed, chunked, or searched without it." },
  { heading: "Common mistakes", body: "Assuming any PDF works equally well — scanned image-only PDFs behave very differently once you reach Parsing." },
  { heading: "Best practice", body: "Start with a real, text-based PDF so every later stage has something meaningful to show." },
];

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export function Upload() {
  const navigate = useNavigate();
  const { run, isLoading, error, uploadDocument, setUploadedFile, resetRun, executionMode } = usePipelineRunContext();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    void uploadDocument(file);
  };

  const handleSampleSelect = (realPdfFile: File | null) => {
    // uploadDocument() itself only tracks uploadedFile for genuine
    // non-empty files, so the dummy File it's called with here won't
    // set one — set the sample's real PDF (or null) separately once
    // fetched, so Parse can render it the same way it would a real
    // Offline Mode upload.
    void uploadDocument(new File([], "sample")).then(() => setUploadedFile(realPdfFile));
  };

  return (
    <PipelineShell
      learningCard={
        <LearningCard
          title="Upload"
          colorVar="--stage-upload"
          items={LEARNING_ITEMS}
          collapsedSummary="The starting point: a PDF is handed to the pipeline before anything happens to it."
        />
      }
    >
      {/* min-h-0 lets this scroll instead of being clipped when the file
         preview + document info panel push past the viewport height. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mb-4">
          <h1 className="m-0 text-xl font-bold">Upload a document</h1>
          <span className="text-[13px] text-text-muted">Step 1 of 9 — nothing else can run until this is done</span>
        </div>

        {!run && executionMode === "demo" && <SampleDocumentPicker isLoading={isLoading} onSelect={handleSampleSelect} />}

        {!run && executionMode === "offline" && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-[60px] text-center transition-colors ${
              dragOver ? "border-stage-upload bg-bg-elevated" : "border-border-strong bg-bg-panel hover:border-stage-upload hover:bg-bg-elevated"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="mb-3.5 text-3xl">📄</div>
            {isLoading ? (
              <>
                <h3 className="m-0 mb-1.5 text-[15px]">Uploading and running the pipeline…</h3>
                <p className="m-0 text-[12.5px] text-text-dim">
                  Parsing, cleaning, chunking, and embedding all run server-side. If this is the backend's first
                  request, it may also still be loading the embedding model — that alone can take 15–45 seconds.
                </p>
              </>
            ) : (
              <>
                <h3 className="m-0 mb-1.5 text-[15px]">Drop a PDF here, or click to browse</h3>
                <p className="m-0 text-[12.5px] text-text-dim">
                  Any text-based PDF works — scanned/image-only PDFs will look different once you reach Parsing.
                </p>
                <button
                  type="button"
                  className="mt-4 rounded-md border-none bg-gradient-to-br from-stage-upload to-accent-fill px-5 py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-accent)]"
                >
                  Browse files
                </button>
              </>
            )}

            {error && (
              <p className="mx-auto mt-4 max-w-sm rounded-md border border-[#E8B4B7] bg-[#FCE8E9] px-3 py-2 text-[12.5px] text-[#8A2A2E]">
                {error}
              </p>
            )}
          </div>
        )}

        {run && (
          <div className="grid grid-cols-[1.3fr_1fr] gap-5">
            <div className="rounded-lg border border-border bg-bg-panel p-[22px] shadow-card">
              <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-[10px] bg-gradient-to-br from-stage-upload to-accent-fill text-lg text-white">
                📄
              </div>
              <h3 className="m-0 mb-1 text-[15px]">{run.document.fileName}</h3>
              <div className="mb-4 font-mono text-xs text-text-muted">
                Uploaded {new Date(run.document.uploadedAt).toLocaleString()}
              </div>
              <div className="mb-4 flex items-center gap-2 text-[12.5px] text-stage-clean">
                ✓ Ready — Parsing already ran{executionMode === "demo" ? " (Demo Mode)" : ""}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/parse")}
                  className="rounded-md border-none bg-gradient-to-br from-stage-upload to-accent-fill px-5 py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-accent)]"
                >
                  Continue to Parsing →
                </button>
                <button
                  type="button"
                  onClick={resetRun}
                  className="rounded-md border border-border-strong px-5 py-2.5 text-[13px] font-medium text-text-muted hover:bg-bg-hover"
                >
                  {executionMode === "demo" ? "Choose a different sample" : "Upload a different file"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-bg-panel p-[18px] shadow-card">
              <div className="mb-3.5 text-[11px] font-bold uppercase tracking-wide text-text-dim">Document Info</div>
              <div className="flex justify-between border-t border-border-soft py-2.5 first:border-t-0">
                <span className="text-[12.5px] text-text-muted">File Size</span>
                <span className="font-mono text-[12.5px] font-semibold">{formatBytes(run.document.sizeBytes)}</span>
              </div>
              <div className="flex justify-between border-t border-border-soft py-2.5">
                <span className="text-[12.5px] text-text-muted">Number of Pages</span>
                <span className="font-mono text-[12.5px] font-semibold">{run.document.pageCount}</span>
              </div>
              <div className="flex justify-between border-t border-border-soft py-2.5">
                <span className="text-[12.5px] text-text-muted">Mode</span>
                <span className="font-mono text-[12.5px] font-semibold">{executionMode === "offline" ? "Local Backend" : "Demo"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </PipelineShell>
  );
}
