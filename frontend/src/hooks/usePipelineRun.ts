import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChunkParameters, PipelineRun, RetrievalParameters } from "@/types/pipeline";
import { PipelineDataSourceError, type PipelineDataSource } from "@/services/pipelineDataSource";
import { mockPipelineDataSource } from "@/services/mockPipelineDataSource";
import { httpPipelineDataSource } from "@/services/httpPipelineDataSource";
import { isRunningLocally } from "@/utils/environment";
import { saveRunState, loadRunState } from "@/services/runPersistence";
import { listSampleDocumentOptions } from "@/services/mockPipelineDataSource";

/**
 * "Demo Mode" runs entirely against mockPipelineDataSource (real
 * in-browser pipeline logic). "Offline Mode" talks to this project's own
 * real backend over HTTP. The adapter FILES keep their original names
 * (mockPipelineDataSource.ts / httpPipelineDataSource.ts) — only the
 * user-facing concept and this hook's own state were renamed from "Mock
 * Mode" to "Execution Mode."
 */
export type ExecutionMode = "demo" | "offline";

function adapterForMode(mode: ExecutionMode): PipelineDataSource {
  return mode === "offline" ? httpPipelineDataSource : mockPipelineDataSource;
}

/**
 * The ONLY place in the app that chooses which PipelineDataSource
 * implementation is active. Every component reaches pipeline data
 * through this hook (or through props threaded from it) — never by
 * importing an adapter directly.
 */
export type BackendStatus = "checking" | "ready" | "unreachable";

// How long to keep quietly retrying before giving up and falling back to
// Demo Mode.
//
// This was originally set to 3s to match the Dashboard mockup's
// single-shot health check. That was wrong for the real backend: a real
// uvicorn process loading an embedding model's weights from Hugging Face
// routinely takes 15-45+ seconds on first start (confirmed against a real
// terminal log — "Loading weights: 100%|...", "Started server process",
// "Application startup complete" all happen well after 3 seconds). At
// 3s, this hook was auto-bouncing back to Demo Mode before a perfectly
// healthy backend had even finished starting up — the exact "never leave
// the app in a broken state" goal working against the actual local dev
// workflow it needs to support.
//
// 60s gives real startup room to finish. The UI (BackendModeSelector)
// shows elapsed time and an explicit "still starting up" message past
// the first few seconds, so nobody is left staring at a bare spinner
// wondering if it's stuck.
const QUIET_RETRY_WINDOW_MS = 60_000;
const RETRY_INTERVAL_MS = 1_500;

export interface UsePipelineRunResult {
  run: PipelineRun | null;
  isLoading: boolean;
  error: string | null;
  /** "demo" | "offline" — the live-switchable Execution Mode. */
  executionMode: ExecutionMode;
  /** Switches modes at runtime: no reload, and clears the current run
   *  (and any error/loading state) since a run's data belongs to
   *  whichever pipeline produced it — switching modes starts fresh. */
  switchExecutionMode: (mode: ExecutionMode) => void;
  /** Derived from executionMode === "demo". */
  isMockMode: boolean;
  /** "ready" immediately in Demo Mode. In Offline Mode, starts
   *  "checking" and only becomes "ready" once a real health check
   *  succeeds — never falls back to Demo until QUIET_RETRY_WINDOW_MS of
   *  failed attempts have passed. */
  backendStatus: BackendStatus;
  /** Milliseconds since the current connection attempt started, while
   *  backendStatus === "checking" in Offline Mode. Null otherwise — lets
   *  the UI distinguish "just started checking" from "been trying for
   *  30s, this is taking a while, it's probably loading model weights." */
  checkingElapsedMs: number | null;
  /** One-line message to show as a toast when Offline Mode auto-fell back
   *  to Demo Mode after a failed connection attempt. Null otherwise. Set
   *  to null again as soon as the person picks a mode themselves. */
  fallbackMessage: string | null;
  uploadDocument: (file: File) => Promise<void>;
  /** The real File object from the most recent genuine upload (Offline
   *  Mode only — Demo Mode's sample picker doesn't have a real PDF
   *  binary to hand over, so this stays null there). Lets Parse render
   *  the actual original PDF instead of only its extracted text. Cleared
   *  on mode switch and resetRun(), same as run itself. */
  uploadedFile: File | null;
  /** Lets the Demo Mode sample picker attach the sample's real PDF
   *  (fetched from its static asset) so Parse can render it the same
   *  way it does for a genuine Offline Mode upload — samples now ship
   *  with real PDF files, not just extracted text. */
  setUploadedFile: (file: File | null) => void;
  /** Clears the current run without changing Execution Mode — lets
   *  someone upload a second document in the same mode instead of being
   *  stuck re-viewing the first one forever. */
  resetRun: () => void;
  rebuildChunks: (params: ChunkParameters) => Promise<void>;
  askQuestion: (question: string, retrievalParams?: Partial<RetrievalParameters>) => Promise<void>;
  rebuildRetrieval: (params: RetrievalParameters) => Promise<void>;
}

function initialExecutionMode(): ExecutionMode {
  // Safety net beneath the UI-level gating in BackendModeSelector: even
  // if VITE_PIPELINE_DATA_SOURCE=http got set on a hosted deployment by
  // mistake, never actually start in Offline Mode anywhere but a real
  // local dev environment — see utils/environment.ts.
  const persisted = loadRunState();
  if (persisted && (persisted.executionMode === "demo" || isRunningLocally())) {
    return persisted.executionMode;
  }
  if (!isRunningLocally()) return "demo";
  const envMode = import.meta.env.VITE_PIPELINE_DATA_SOURCE;
  return envMode === "http" ? "offline" : "demo";
}

function initialRun(mode: ExecutionMode): PipelineRun | null {
  const persisted = loadRunState();
  if (persisted && persisted.executionMode === mode) return persisted.run;
  return null;
}

export function usePipelineRun(): UsePipelineRunResult {
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(initialExecutionMode);
  const isMockMode = executionMode === "demo";
  const dataSource = useMemo(() => adapterForMode(executionMode), [executionMode]);

  const [run, setRun] = useState<PipelineRun | null>(() => initialRun(executionMode));
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(isMockMode ? "ready" : "checking");
  const [checkStartedAt, setCheckStartedAt] = useState(() => Date.now());
  const [checkingElapsedMs, setCheckingElapsedMs] = useState<number | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

  // Persist whenever the run actually changes — see runPersistence.ts for
  // exactly what is and isn't saved, and why.
  useEffect(() => {
    saveRunState(run, executionMode);
  }, [run, executionMode]);

  // The real PDF File object can't survive a reload (see
  // runPersistence.ts), so a restored run always starts with
  // uploadedFile === null. For Demo Mode specifically, that gap is
  // closeable: the restored run's document.fileName deterministically
  // matches one of the 5 known bundled samples ("${sample.name}.pdf" —
  // see mockPipelineDataSource.ts and SampleDocumentPicker, which both
  // construct it the same way), so the matching sample's real PDF can
  // just be re-fetched automatically. Offline Mode uploads have no such
  // fallback — a genuinely user-picked file can't be silently re-read
  // after a reload, by browser design, not a gap this app can close.
  //
  // Deliberately runs only once, on mount — not reactively on every run
  // change — so it can't race with SampleDocumentPicker's own fetch on a
  // fresh selection (which sets uploadedFile itself, immediately).
  const didAttemptRestoreFetch = useRef(false);
  useEffect(() => {
    if (didAttemptRestoreFetch.current) return;
    didAttemptRestoreFetch.current = true;
    if (executionMode !== "demo" || !run || uploadedFile) return;
    const sample = listSampleDocumentOptions().find((s) => `${s.name}.pdf` === run.document.fileName);
    if (!sample) return;
    fetch(sample.pdfUrl)
      .then((res) => res.blob())
      .then((blob) => setUploadedFile(new File([blob], run.document.fileName, { type: "application/pdf" })))
      .catch(() => {
        // Leave uploadedFile null — Parse's own fallback messaging
        // handles this (a genuine fetch failure, not the common case).
      });
    // Intentionally empty deps — see comment above, this must run at
    // most once regardless of subsequent run/mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchExecutionMode = useCallback(
    (mode: ExecutionMode) => {
      if (mode === "offline" && !isRunningLocally()) return; // see initialExecutionMode
      if (mode === executionMode) return;
      setExecutionMode(mode);
      setRun(null);
      setUploadedFile(null);
      setError(null);
      setIsLoading(false);
      setFallbackMessage(null);
      setBackendStatus(mode === "demo" ? "ready" : "checking");
      setCheckStartedAt(Date.now());
    },
    [executionMode],
  );

  const resetRun = useCallback(() => {
    setRun(null);
    setUploadedFile(null);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isMockMode) {
      setCheckingElapsedMs(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const reachable = await dataSource.checkHealth();
      if (cancelled) return;
      if (reachable) {
        setBackendStatus("ready");
        setCheckingElapsedMs(null);
        return; // stop polling once reachable
      }
      const elapsed = Date.now() - checkStartedAt;
      if (elapsed >= QUIET_RETRY_WINDOW_MS) {
        // Give up and fall back to Demo Mode rather than leaving the
        // app stuck on "unreachable" indefinitely.
        setBackendStatus("ready");
        setCheckingElapsedMs(null);
        setFallbackMessage("Local backend unavailable. Switched to Demo Mode.");
        setExecutionMode("demo");
        setCheckStartedAt(Date.now());
        return;
      }
      setBackendStatus("checking");
      setCheckingElapsedMs(elapsed);
      timer = setTimeout(poll, RETRY_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [dataSource, isMockMode, checkStartedAt]);

  const runAction = useCallback(
    async (action: () => Promise<PipelineRun>) => {
      setIsLoading(true);
      setError(null);
      try {
        const next = await action();
        setRun(next);
      } catch (err) {
        // A failed action while the UI claims "Connected" can genuinely
        // happen: the health check that set that status might be up to
        // RETRY_INTERVAL_MS stale, and a backend restart (--reload
        // picking up a code change, for instance) can happen in that
        // window — the socket briefly isn't there, or isn't fully ready,
        // even though the last poll succeeded. Rather than leave the
        // status pill showing a "Connected" that's no longer true,
        // re-verify immediately and, if it's actually unreachable right
        // now, restart the normal checking/fallback cycle so the UI
        // reflects reality instead of a stale success.
        if (!isMockMode) {
          const stillReachable = await dataSource.checkHealth();
          if (!stillReachable) {
            setBackendStatus("checking");
            setCheckStartedAt(Date.now());
            setError(
              "Lost connection to the local backend right as this request was made — it may have just restarted. Retrying the connection now; try again in a few seconds.",
            );
            return;
          }
        }
        const message = err instanceof PipelineDataSourceError ? err.message : "Something went wrong talking to the pipeline backend.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [dataSource, isMockMode],
  );

  const uploadDocument = useCallback(
    (file: File) => {
      // The Demo Mode sample picker calls this with an empty dummy File
      // (the mock adapter ignores it entirely) — only keep a reference
      // when it's a real, non-empty upload, since only Offline Mode ever
      // has an actual PDF binary worth rendering.
      setUploadedFile(file.size > 0 ? file : null);
      return runAction(() => dataSource.uploadDocument(file));
    },
    [dataSource, runAction],
  );

  const rebuildChunks = useCallback(
    (params: ChunkParameters) => {
      if (!run) return Promise.resolve();
      return runAction(() => dataSource.rebuildChunks(run.id, params));
    },
    [dataSource, run, runAction],
  );

  const askQuestion = useCallback(
    (question: string, retrievalParams?: Partial<RetrievalParameters>) => {
      if (!run) return Promise.resolve();
      return runAction(() => dataSource.askQuestion(run.id, question, retrievalParams));
    },
    [dataSource, run, runAction],
  );

  const rebuildRetrieval = useCallback(
    (params: RetrievalParameters) => {
      if (!run) return Promise.resolve();
      return runAction(() => dataSource.rebuildRetrieval(run.id, params));
    },
    [dataSource, run, runAction],
  );

  return {
    run,
    isLoading,
    error,
    executionMode,
    switchExecutionMode,
    isMockMode,
    backendStatus,
    checkingElapsedMs,
    fallbackMessage,
    uploadDocument,
    uploadedFile,
    setUploadedFile,
    resetRun,
    rebuildChunks,
    askQuestion,
    rebuildRetrieval,
  };
}
