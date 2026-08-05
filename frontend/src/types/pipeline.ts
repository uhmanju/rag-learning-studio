/**
 * Framework-agnostic RAG pipeline model.
 *
 * Nothing in this file (or in anything that imports it) may reference
 * LangChain, LlamaIndex, Haystack, a specific vector database, or a
 * specific model provider. Every concept here is described in terms
 * any RAG implementation shares: documents become chunks, chunks
 * become vectors, vectors get searched, search results build a
 * prompt, a prompt produces an answer, and the answer can be scored.
 *
 * Why this matters: the UI (PipelineStepper, ChunkExplorer,
 * RetrievalExplorer, etc.) is written entirely against these types.
 * Swapping the backend from a LangChain + Chroma implementation to
 * a LlamaIndex + Pinecone implementation — or to a hand-rolled
 * pipeline with no framework at all — should require writing one
 * new PipelineDataSource adapter (see services/pipelineDataSource.ts)
 * and touching zero component code.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** Opaque IDs. Branded so a ChunkId can't accidentally be passed where a
 *  PageId is expected, even though both are strings at runtime. */
export type DocumentId = string & { readonly __brand: "DocumentId" };
export type PageId = string & { readonly __brand: "PageId" };
export type ChunkId = string & { readonly __brand: "ChunkId" };
export type RunId = string & { readonly __brand: "RunId" };

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

/** The nine stages every RAG pipeline goes through, regardless of the
 *  framework or vector store implementing them. This list is the backbone
 *  of the Pipeline Journey UI (PipelineStepper) and of PipelineHealth. */
export const PIPELINE_STAGES = [
  "upload",
  "parse",
  "clean",
  "chunk",
  "embed",
  "retrieve",
  "prompt",
  "generate",
  "evaluate",
] as const;

export type StageId = (typeof PIPELINE_STAGES)[number];

export type StageStatus =
  | "pending" // not reached yet this run
  | "loading" // request in flight
  | "done" // completed successfully
  | "failed" // completed, but the stage's own success condition wasn't met
  | "error"; // the request itself failed (network/backend error)

/** The status + a human-readable explanation of *why*, satisfying the
 *  "every failure should explain why" principle at the type level —
 *  a StageResult can never be `"failed"` without a reason attached. */
export interface StageResult<TData> {
  status: StageStatus;
  /** One-line summary for the Pipeline Journey rail, e.g. "Split into 28 chunks". */
  summary?: string;
  /** Required when status is "failed" or "error". */
  reason?: string;
  /** Suggested next step shown in PipelineHealth, per the brief's
   *  "explain why + suggested next step" requirement. */
  suggestedNextStep?: string;
  /** How long this stage took, in milliseconds — powers the Evaluation
   *  Summary's latency breakdown. */
  durationMs?: number;
  data?: TData;
}

// ---------------------------------------------------------------------------
// Documents & pages
// ---------------------------------------------------------------------------

export interface SourceDocument {
  id: DocumentId;
  fileName: string;
  pageCount: number;
  /** Bytes, if known — purely informational. */
  sizeBytes?: number;
  uploadedAt: string; // ISO 8601
}

export interface ParsedPage {
  id: PageId;
  documentId: DocumentId;
  pageNumber: number;
  /** Raw text as extracted, before any cleaning. */
  rawText: string;
  /** Extracted markdown/structured text, if the backend produces one
   *  distinct from rawText. Falls back to rawText when absent. */
  extractedText?: string;
  /** 0–1. How confident the parser is that this page's text is complete
   *  and correctly structured. Drives the extraction-quality indicator. */
  extractionConfidence: number;
  /** Machine-readable flags the backend attaches, e.g. "low_text_density". */
  flags?: PipelineFlag[];
}

export interface CleanedPage {
  pageId: PageId;
  cleanedText: string;
  /** Named, human-readable rules that were applied, e.g.
   *  "strip trailing whitespace". Framework-agnostic on purpose —
   *  this is NOT a diff of a specific text-splitter's internals. */
  rulesApplied: string[];
  /** Fraction of raw characters removed by cleaning, 0–1. */
  charsRemovedRatio: number;
  flags?: PipelineFlag[];
}

// ---------------------------------------------------------------------------
// Chunks
// ---------------------------------------------------------------------------

export interface ChunkParameters {
  /** Characters per chunk. Framework-agnostic unit — a specific splitter's
   *  token-vs-character behavior is an implementation detail of the adapter. */
  chunkSize: number;
  chunkOverlap: number;
}

export interface Chunk {
  id: ChunkId;
  documentId: DocumentId;
  pageId: PageId;
  pageNumber: number;
  /** Position among all chunks for this document, in document order. */
  index: number;
  text: string;
  charCount: number;
  /** Approximate — the real token count depends on the model's tokenizer,
   *  which is a backend/adapter concern, not a UI concern. */
  estimatedTokenCount: number;
  flags?: PipelineFlag[];
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

export interface EmbeddingModelInfo {
  name: string;
  dimensions: number;
  normalized: boolean;
}

export interface ChunkEmbedding {
  chunkId: ChunkId;
  /** The vector itself — real, provider-computed values (see
   *  services/embeddingProviders/). The Embedding page's "Real Embedding"
   *  panel explicitly shows a preview of this on purpose (to teach "an
   *  embedding is just a list of numbers"), expandable to the full
   *  vector. May be empty for adapters that don't populate it (e.g. the
   *  real backend currently doesn't transmit raw vectors over HTTP —
   *  see backend/api.py) — callers should handle vector.length === 0. */
  vector: number[];
  model: EmbeddingModelInfo;
  createdAt: string;
}

/** A 2D point for *display only*. Any adapter producing this MUST make
 *  clear (both in code and in the UI) that this is a dimensionality
 *  reduction for visualization, not the space retrieval actually
 *  operates in. See EmbeddingExplorer's DimensionalityReductionNotice. */
export interface EmbeddingProjection2D {
  chunkId: ChunkId;
  x: number;
  y: number;
  /** Name of the reduction technique used, e.g. "PCA", "UMAP" — shown
   *  verbatim in the UI so the caveat is never generic. */
  method: string;
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

export interface RetrievalParameters {
  topK: number;
  /** Distance/similarity cutoff. Whether lower-is-better (distance) or
   *  higher-is-better (similarity) is declared per-result via
   *  `RetrievalCandidate.scoreDirection` so the UI never has to guess. */
  threshold: number;
}

export type ScoreDirection = "lower-is-better" | "higher-is-better";

export interface RetrievalCandidate {
  chunkId: ChunkId;
  pageNumber: number;
  score: number;
  scoreDirection: ScoreDirection;
  /** Whether this candidate cleared the threshold and was passed to the
   *  prompt. Kept candidates AND dropped ones should both be returned by
   *  a well-behaved adapter — see the "never just show no results" goal
   *  in RetrievalExplorer / PipelineHealth. */
  kept: boolean;
  /** Short, plain-language reason this chunk matched, e.g. shared terms
   *  or concepts. Framework-agnostic: an adapter might derive this from
   *  word overlap, from the vector store's own explanation feature, or
   *  from an LLM — the UI doesn't need to know which. */
  matchExplanation?: string;
  /** 0–1, if the adapter can produce one distinct from raw score. */
  confidence?: number;
}

export interface RetrievalResult {
  question: string;
  candidates: RetrievalCandidate[];
  parameters: RetrievalParameters;
}

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

export interface PromptSection {
  /** e.g. "system", "context", "question" — an adapter can add more. */
  kind: "system" | "context" | "question" | string;
  label: string;
  content: string;
  /** For "context" sections: which chunk this piece of context came from,
   *  so the UI can color-link it back to Chunking/Retrieval. */
  sourceChunkId?: ChunkId;
}

export interface PromptAssembly {
  sections: PromptSection[];
  /** The literal, fully assembled string sent to the model. */
  finalPrompt: string;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export interface Citation {
  /** Character range in `GenerationResult.answer` this citation covers. */
  start: number;
  end: number;
  chunkId: ChunkId;
  pageNumber: number;
}

export interface GenerationResult {
  answer: string;
  /** True when the model declined to answer because nothing in context
   *  supported a response — a deliberate, correct outcome, not an error. */
  abstained: boolean;
  /** True when no real LLM could be reached at all (no user key, no
   *  working default) — a completely different situation from
   *  `abstained`. Retrieval worked and found real context, but there's
   *  no model available to write an answer from it. `answer` is empty
   *  in this case; the UI shows a blocking message pointing at where to
   *  add a key rather than any generated-looking text, real or
   *  extractive — see Dashboard's LLM settings. */
  blockedNoKey?: boolean;
  citations: Citation[];
  sourcePages: number[];
  /** Which generation method actually produced this answer, e.g.
   *  "Groq (llama-3.1-8b-instant)". When `blockedNoKey` is true, this
   *  instead carries the specific reason no model was reachable.
   *  Optional and adapter-specific — the real backend doesn't set this
   *  (it always uses one real LLM call, so the question doesn't arise);
   *  Demo Mode sets it since which of several possible methods actually
   *  ran is itself educational. */
  modelUsed?: string;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export interface EvaluationMetric {
  key: string;
  label: string;
  /** 0–1 for score-like metrics, or a raw unit (ms, tokens) for others —
   *  see `unit`. */
  value: number;
  unit?: string;
  /** One sentence, plain language — shown directly under the metric,
   *  per the "short explanations only" requirement. */
  explanation: string;
  /** False for metrics the connected backend doesn't compute yet.
   *  The UI renders these as "Coming soon" rather than a fabricated
   *  number — see EvaluationSummary. */
  available: boolean;
}

export interface StageLatency {
  stage: StageId;
  durationMs: number;
}

export interface EvaluationResult {
  metrics: EvaluationMetric[];
  latencyBreakdown: StageLatency[];
  totalLatencyMs: number;
}

// ---------------------------------------------------------------------------
// Flags — the framework-agnostic "why something needs a closer look" signal
// ---------------------------------------------------------------------------

export type FlagSeverity = "info" | "warning";

export interface PipelineFlag {
  code: string; // e.g. "low_text_density", "short_chunk", "boundary_risk"
  severity: FlagSeverity;
  message: string;
}

// ---------------------------------------------------------------------------
// A full pipeline run — everything the UI needs for one document + one question
// ---------------------------------------------------------------------------

export interface PipelineRun {
  id: RunId;
  document: SourceDocument;
  question?: string;
  stages: {
    parse: StageResult<ParsedPage[]>;
    clean: StageResult<CleanedPage[]>;
    chunk: StageResult<{ chunks: Chunk[]; parameters: ChunkParameters }>;
    embed: StageResult<{
      embeddings: ChunkEmbedding[];
      projection?: EmbeddingProjection2D[];
      model: EmbeddingModelInfo;
    }>;
    retrieve: StageResult<RetrievalResult>;
    prompt: StageResult<PromptAssembly>;
    generate: StageResult<GenerationResult>;
    evaluate: StageResult<EvaluationResult>;
  };
}

/** Convenience helper — most components only need "is this stage green,
 *  and if not, what do I show." */
export function stageStatusOf(run: PipelineRun, stage: StageId): StageStatus {
  if (stage === "upload") return "done"; // upload precedes stages{}; if we have a run, upload succeeded
  return run.stages[stage].status;
}
