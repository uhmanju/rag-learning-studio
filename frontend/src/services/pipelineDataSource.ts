import type {
  ChunkParameters,
  DocumentId,
  PipelineRun,
  RetrievalParameters,
} from "@/types/pipeline";

/**
 * The one interface every component in this app is allowed to depend on
 * for pipeline data. No component may import a specific adapter directly
 * (see hooks/usePipelineRun.ts, which is the only place an adapter gets
 * chosen) — that's what makes swapping backends a one-file change.
 *
 * V1 ships two implementations:
 *   - mockPipelineDataSource: deterministic fixture data for local
 *     development and for running this app with no backend at all.
 *   - httpPipelineDataSource: calls a real backend over HTTP. The
 *     endpoint contract is documented in httpPipelineDataSource.ts and
 *     in docs/architecture-diagram.md. It is NOT wired to a live server
 *     in this repo — see that file's top comment.
 *
 * Per the "no fake interactions" rule: httpPipelineDataSource never
 * falls back to fixture data on failure. A failed request surfaces a
 * real StageResult with status "error", which the UI renders via
 * <ErrorState> / <PipelineHealth> — never silently substituted content.
 */
export interface PipelineDataSource {
  /** Upload a document and start a new run. Resolves once parsing has
   *  been kicked off — parse/clean/chunk/embed happen asynchronously and
   *  are read back via getRun / subscribeToRun. */
  uploadDocument(file: File): Promise<PipelineRun>;

  /** Re-run chunking with new parameters against an existing run's
   *  document. This is what powers the Interactive Chunk Explorer's
   *  "Rebuild" control — it must re-run chunk, embed, and (if a
   *  question is set) retrieve, prompt, and generate, since all of
   *  those stages depend on chunk boundaries. */
  rebuildChunks(runId: PipelineRun["id"], params: ChunkParameters): Promise<PipelineRun>;

  /** Ask a question against an existing run's already-embedded chunks.
   *  Runs retrieve → prompt → generate → evaluate. */
  askQuestion(
    runId: PipelineRun["id"],
    question: string,
    retrievalParams?: Partial<RetrievalParameters>,
  ): Promise<PipelineRun>;

  /** Re-run retrieval only (e.g. after changing top-k or threshold),
   *  without re-generating — used when a user is specifically exploring
   *  retrieval behavior in isolation. */
  rebuildRetrieval(runId: PipelineRun["id"], params: RetrievalParameters): Promise<PipelineRun>;

  /** Fetch the current state of a run — used for polling/refresh. */
  getRun(runId: PipelineRun["id"]): Promise<PipelineRun>;

  /** List previously ingested documents, for the document rail —
   *  independent of any single run. */
  listDocuments(): Promise<DocumentId[]>;

  /** Lightweight reachability check — used only to decide whether to show
   *  a "connecting..." state before the first real request, never to gate
   *  actual pipeline actions. The mock adapter is always reachable by
   *  definition; the HTTP adapter calls the backend's existing /api/health
   *  endpoint (unused by the frontend until now). */
  checkHealth(): Promise<boolean>;
}

/** Thrown by adapters on any failure that isn't a normal StageResult
 *  "failed" outcome (e.g. network unreachable, 500 response). Components
 *  should catch this at the hook level, not in individual stage views. */
export class PipelineDataSourceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PipelineDataSourceError";
  }
}
