import { FileUploadIcon, FileTextIcon } from "@/components/common/icons";
import type { ExecutionMode } from "@/hooks/usePipelineRun";

interface Props {
  mode: ExecutionMode;
  onEnterPipeline: (intent: "upload" | "sample") => void;
}

// Upload only does anything real in Offline (Local backend) mode — Demo
// Mode's mock adapter always uses the selected built-in sample regardless
// of what file is picked. Conversely, the built-in samples only exist in
// Demo Mode's mock data — Offline Mode's real backend has no bundled
// sample documents to serve, so "start with a sample" has nothing to do
// there either. Each card is only enabled in the one mode it actually
// works in, rather than looking clickable and silently doing the wrong
// thing (or nothing) in the other mode.
export function JourneyPanel({ mode, onEnterPipeline }: Props) {
  const uploadEnabled = mode === "offline";
  const sampleEnabled = mode === "demo";

  return (
    <section className="rounded-lg bg-surface-1 px-4 py-8 text-center">
      <h2 className="dashboard-heading mb-5 text-xl">Choose your journey</h2>
      <div className="flex flex-wrap justify-center gap-4">
        <button
          type="button"
          disabled={!uploadEnabled}
          onClick={() => uploadEnabled && onEnterPipeline("upload")}
          className={`min-w-[180px] rounded-md border-[0.5px] border-border bg-surface-2 px-6 py-4 text-left transition-transform ${
            uploadEnabled ? "cursor-pointer hover:-translate-y-0.5" : "cursor-not-allowed opacity-50"
          }`}
        >
          <FileUploadIcon className="mb-2 h-6 w-6 text-accent-text" />
          <div className="text-[13px] font-medium">Upload your own PDF</div>
          {!uploadEnabled && (
            <div className="mt-1.5 text-[11px] font-normal text-text-dim">
              Switch to Local backend to upload a real document
            </div>
          )}
        </button>

        <button
          type="button"
          disabled={!sampleEnabled}
          onClick={() => sampleEnabled && onEnterPipeline("sample")}
          className={`min-w-[180px] rounded-md border-2 px-6 py-4 text-left transition-transform ${
            sampleEnabled
              ? "cursor-pointer border-accent-border bg-surface-2 hover:-translate-y-0.5"
              : "cursor-not-allowed border-border bg-surface-2 opacity-50"
          }`}
        >
          <FileTextIcon className="mb-2 h-6 w-6 text-accent-text" />
          <div className="text-[13px] font-medium">Start with a sample document</div>
          {!sampleEnabled && (
            <div className="mt-1.5 text-[11px] font-normal text-text-dim">
              Switch to Demo Mode to use a bundled sample
            </div>
          )}
        </button>
      </div>
    </section>
  );
}
