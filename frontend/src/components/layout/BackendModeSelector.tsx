import type { BackendStatus, ExecutionMode } from "@/hooks/usePipelineRun";
import { BulbIcon, ServerIcon } from "@/components/common/icons";
import { isRunningLocally } from "@/utils/environment";

interface Props {
  mode: ExecutionMode;
  status: BackendStatus;
  checkingElapsedMs: number | null;
  onChange: (mode: ExecutionMode) => void;
}

function statusPillClasses(status: BackendStatus): string {
  if (status === "checking") return "bg-accent-bg text-accent-text";
  if (status === "unreachable") return "bg-[#FCE8E9] text-[#8A2A2E]";
  return "bg-[#EAF7EE] text-[#15803D]";
}

// Real local backends load an embedding model's weights on first start,
// which routinely takes 15-45+ seconds — past ~5s of no response yet,
// say so explicitly instead of leaving a bare "connecting" spinner that
// looks stuck.
function statusLabel(mode: ExecutionMode, status: BackendStatus, checkingElapsedMs: number | null): string {
  if (mode === "demo") return "Demo Mode";
  if (status === "checking") {
    if (checkingElapsedMs !== null && checkingElapsedMs > 5000) {
      return `Still starting up (${Math.round(checkingElapsedMs / 1000)}s) — loading model weights takes a while`;
    }
    return "Trying to connect… http://localhost:8000";
  }
  if (status === "unreachable") return "Local backend unreachable";
  return "Connected — Using Local Backend";
}

const DEMO_TOOLTIP =
  "Demo Mode: runs entirely in your browser against 5 bundled sample PDFs. No setup, no backend, no upload — pick a document and explore.";
const LOCAL_TOOLTIP =
  "Local Mode: talks to a real backend running on your own machine, on any PDF you upload. Requires starting backend/ locally first — see the README.";
const LOCAL_DISABLED_TOOLTIP =
  "Local Mode needs a backend running on your own machine, so it only works when this app itself is running locally too (npm run dev). Not available on a hosted deployment — run it locally to use your own documents.";

export function BackendModeSelector({ mode, status, checkingElapsedMs, onChange }: Props) {
  const localAvailable = isRunningLocally();

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] uppercase tracking-wide text-text-dim">Backend</span>
      <div className="flex gap-0.5 rounded-md bg-surface-1 p-[3px]">
        <button
          type="button"
          title={DEMO_TOOLTIP}
          onClick={() => onChange("demo")}
          className={`flex items-center gap-1.5 rounded-[6px] px-3.5 py-1.5 text-[12.5px] transition-colors ${
            mode === "demo" ? "bg-surface-2 font-medium text-text shadow-card" : "text-text-muted"
          }`}
        >
          <BulbIcon />
          Demo
        </button>
        <button
          type="button"
          title={localAvailable ? LOCAL_TOOLTIP : LOCAL_DISABLED_TOOLTIP}
          disabled={!localAvailable}
          onClick={() => onChange("offline")}
          className={`flex items-center gap-1.5 rounded-[6px] px-3.5 py-1.5 text-[12.5px] transition-colors ${
            mode === "offline" ? "bg-surface-2 font-medium text-text shadow-card" : "text-text-muted"
          } ${!localAvailable ? "cursor-not-allowed opacity-40" : ""}`}
        >
          <ServerIcon />
          Local
        </button>
      </div>
      <span
        title={mode === "demo" ? DEMO_TOOLTIP : localAvailable ? LOCAL_TOOLTIP : LOCAL_DISABLED_TOOLTIP}
        className={`flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[11.5px] font-medium ${statusPillClasses(status)}`}
      >
        <span
          className={`h-[7px] w-[7px] flex-none rounded-full bg-current ${status === "checking" ? "animate-pulse-dot" : ""}`}
        />
        {statusLabel(mode, status, checkingElapsedMs)}
      </span>
      {!localAvailable && (
        <span className="text-[10.5px] text-text-dim">(running locally enables Local Mode)</span>
      )}
    </div>
  );
}
