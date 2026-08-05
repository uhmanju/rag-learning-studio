import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePipelineRunContext } from "@/hooks/PipelineRunContext";
import { PipelineShell } from "@/components/layout/PipelineShell";
import { LearningCard } from "@/components/layout/LearningCard";
import { SyncedDocumentView } from "@/components/common/SyncedDocumentView";
import { ParseAnnotatedText, ParseOriginalText } from "@/components/pages/parse-clean/ParseAnnotatedText";
import { PdfPageViewer } from "@/components/pages/parse-clean/PdfPageViewer";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateBlocks";

const LEARNING_ITEMS = [
  { heading: "What is this?", body: "The PDF's real content becomes structured Markdown — headings, lists, tables — using the backend's real parser." },
  { heading: "Why is it needed?", body: "Every later stage works on this Markdown, not the original PDF — what's preserved or dropped here shapes everything after." },
  { heading: "Common mistakes", body: "Assuming images survive parsing — this parser never writes or embeds them into its output, by design." },
  { heading: "Best practice", body: "Check the parsed side for anything unexpectedly missing before trusting later stages." },
];

export function Parse() {
  const navigate = useNavigate();
  const { run, uploadedFile, executionMode } = usePipelineRunContext();

  // A fresh createObjectURL() on every render would leak — the browser
  // never frees these until explicitly revoked (or the page unloads).
  // One URL per actual file, revoked the moment it's no longer needed.
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!uploadedFile) {
      setDownloadUrl(null);
      return;
    }
    const url = URL.createObjectURL(uploadedFile);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadedFile]);

  if (!run) {
    return (
      <PipelineShell
        learningCard={<LearningCard title="Parse" colorVar="--stage-parse" items={LEARNING_ITEMS} collapsedSummary="Teaches how a PDF becomes structured Markdown." />}
      >
        <EmptyState
          title="No document yet"
          message="Upload a document first — Parse results come back as part of that same request."
          action={
            <button type="button" onClick={() => navigate("/upload")} className="mt-3 rounded-md border border-border-strong px-4 py-1.5 text-[12.5px]">
              Go to Upload
            </button>
          }
        />
      </PipelineShell>
    );
  }

  const parseResult = run.stages.parse;

  return (
    <PipelineShell
      bgTint="rgba(47,111,237,.05)"
      learningCard={<LearningCard title="Parse" colorVar="--stage-parse" items={LEARNING_ITEMS} collapsedSummary="Teaches how a PDF becomes structured Markdown." defaultCollapsed />}
    >
      <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2.5 flex-none">
        <h1 className="m-0 text-xl font-bold">Original PDF → Parsed Markdown</h1>
        <span className="text-[13px] text-text-muted">Scroll either side — they move together</span>
      </div>

      {parseResult.status === "loading" && <LoadingState label="Parsing document…" />}
      {(parseResult.status === "error" || parseResult.status === "failed") && (
        <ErrorState message={parseResult.reason ?? "Parsing failed for an unknown reason."} />
      )}
      {parseResult.status === "done" && parseResult.data && (
        <>
          {!uploadedFile && parseResult.data.every((p) => (p.extractedText ?? p.rawText) === p.rawText) && (
            <div className="mb-2 flex-none rounded-md border border-[#EFDFB0] bg-[#FFF7E6] px-3.5 py-2 text-[12px] text-[#8A6A16]">
              {executionMode === "offline" ? (
                <>
                  <b>The original PDF can't be shown right now.</b> Browsers don't allow a page to silently re-read
                  a file you previously picked — after a reload, that reference is gone by design, not a bug. Go to
                  Upload and select the file again to see the real PDF render.
                </>
              ) : (
                <>
                  <b>Couldn't load the sample's PDF for rendering.</b> This backend's parser also produces markdown
                  directly with no separate "before markdown" text, so both columns below show the same real parsed
                  output for now. Try selecting the sample again from Upload.
                </>
              )}
            </div>
          )}
          <SyncedDocumentView
            leftLabel={
              uploadedFile ? (
                <span className="flex items-center justify-between gap-2">
                  Original PDF (real render)
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      download={run.document.fileName}
                      className="rounded-md border border-border-strong px-2 py-0.5 text-[10.5px] font-normal text-text-muted hover:bg-bg-hover"
                    >
                      ↓ Download
                    </a>
                  )}
                </span>
              ) : (
                "Original PDF"
              )
            }
            rightLabel="Parsed Markdown"
            rightVariant="markdown"
            pages={parseResult.data.map((page) => ({
              pageNumber: page.pageNumber,
              leftContent: uploadedFile ? (
                <PdfPageViewer file={uploadedFile} pageNumber={page.pageNumber} />
              ) : (
                <ParseOriginalText text={page.rawText} />
              ),
              rightContent: <ParseAnnotatedText text={page.extractedText ?? page.rawText} />,
            }))}
          />
        </>
      )}
      </div>
    </PipelineShell>
  );
}
