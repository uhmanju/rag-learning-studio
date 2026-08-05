import type {
  Chunk,
  ChunkEmbedding,
  ChunkId,
  ChunkParameters,
  CleanedPage,
  DocumentId,
  EvaluationResult,
  GenerationResult,
  ParsedPage,
  PageId,
  PipelineRun,
  PromptAssembly,
  RetrievalParameters,
  RetrievalResult,
  RunId,
  SourceDocument,
} from "@/types/pipeline";
import type { PipelineDataSource } from "@/services/pipelineDataSource";
import { SAMPLE_DOCUMENTS, DEFAULT_SAMPLE_DOCUMENT_ID, type SampleDocumentDefinition } from "@/services/fixtures/sampleDocuments";
import { splitText, estimateTokenCount } from "@/services/textSplitter";
import { mockDistance, mockProject2D } from "@/services/mockRelevance";
import { createEmbeddingProviderRegistry, getEmbeddingProvider } from "@/services/embeddingProviders/registry";
import type { EmbeddingProvider } from "@/services/embeddingProviders/embeddingProvider";
import { InMemoryVectorStore } from "@/services/vectorStore/inMemoryVectorStore";
import { createLLMProviderRegistry, getLLMProvider, pickPreferredProvider } from "@/services/llmProviders/registry";
import type { LLMProvider } from "@/services/llmProviders/llmProvider";
import { LLMProviderError } from "@/services/llmProviders/llmProvider";

const DEFAULT_CHUNK_PARAMS: ChunkParameters = { chunkSize: 500, chunkOverlap: 100 };
const DEFAULT_RETRIEVAL_PARAMS: RetrievalParameters = { topK: 5, threshold: 1.6 };

// ---------------------------------------------------------------------------
// Embedding provider selection (Demo Mode only). Mirrors the sample-
// document selection pattern above: mock-adapter-local state, not part of
// the generic PipelineDataSource interface, since the real backend has no
// equivalent "pick a browser model" concept. Defaults to the first
// registry entry (LexicalTfIdfEmbeddingProvider) — always available, no
// network, no download — so Demo Mode never depends on a provider that
// might fail to load.
// ---------------------------------------------------------------------------
const embeddingProviderRegistry = createEmbeddingProviderRegistry();
let activeEmbeddingProviderId: string = embeddingProviderRegistry[0]!.id;

function getActiveEmbeddingProvider(): EmbeddingProvider {
  return getEmbeddingProvider(embeddingProviderRegistry, activeEmbeddingProviderId);
}

export function setMockEmbeddingProvider(id: string): void {
  if (embeddingProviderRegistry.some((p) => p.id === id)) activeEmbeddingProviderId = id;
}

export function listEmbeddingProviderOptions(): { id: string; name: string; description: string }[] {
  return embeddingProviderRegistry.map(({ id, name, description }) => ({ id, name, description }));
}

// ---------------------------------------------------------------------------
// LLM provider selection (Demo Mode only). Same pattern as the embedding
// provider above. Defaults to whichever provider is actually configured
// (pickPreferredProvider: a real provider like Groq if a key is present,
// otherwise the always-available ExtractiveFallbackProvider) so Demo
// Mode's Generate stage never has nothing to show.
// ---------------------------------------------------------------------------
const llmProviderRegistry = createLLMProviderRegistry();
let activeLLMProviderId: string = pickPreferredProvider(llmProviderRegistry).id;

function getActiveLLMProvider(): LLMProvider {
  return getLLMProvider(llmProviderRegistry, activeLLMProviderId);
}

export function setMockLLMProvider(id: string): void {
  if (llmProviderRegistry.some((p) => p.id === id)) activeLLMProviderId = id;
}

export function getActiveLLMProviderName(): string {
  return getActiveLLMProvider().name;
}

export function listLLMProviderOptions(): { id: string; name: string; configured: boolean; configurationHint: string }[] {
  return llmProviderRegistry.map((p) => ({ id: p.id, name: p.name, configured: p.isConfigured(), configurationHint: p.configurationHint }));
}

// ---------------------------------------------------------------------------
// Sample document selection (Demo Mode only — see components/layout/
// SampleDocumentPicker.tsx). Not part of the generic PipelineDataSource
// interface on purpose: the real backend has no "built-in sample" concept,
// so this capability lives entirely in this mock-only module and the UI
// that's conditionally rendered when the mock adapter is active.
// ---------------------------------------------------------------------------
let currentSampleId: string = DEFAULT_SAMPLE_DOCUMENT_ID;

function currentSample(): SampleDocumentDefinition {
  return SAMPLE_DOCUMENTS.find((d) => d.id === currentSampleId) ?? SAMPLE_DOCUMENTS[0]!;
}

export function setMockSampleDocument(id: string): void {
  if (SAMPLE_DOCUMENTS.some((d) => d.id === id)) currentSampleId = id;
}

export function getMockSampleDocumentId(): string {
  return currentSampleId;
}

export function listSampleDocumentOptions(): Pick<SampleDocumentDefinition, "id" | "icon" | "name" | "description" | "teaches" | "pdfUrl" | "difficulty" | "difficultyNote">[] {
  return SAMPLE_DOCUMENTS.map(({ id, icon, name, description, teaches, pdfUrl, difficulty, difficultyNote }) => ({
    id,
    icon,
    name,
    description,
    teaches,
    pdfUrl,
    difficulty,
    difficultyNote,
  }));
}

function currentDocumentId(): DocumentId {
  return `doc-${currentSampleId}` as DocumentId;
}

function currentRunId(): RunId {
  return `run-${currentSampleId}` as RunId;
}

function currentSourceDocument(): SourceDocument {
  const sample = currentSample();
  return {
    id: currentDocumentId(),
    fileName: `${sample.name}.pdf`,
    pageCount: Object.keys(sample.pages).length,
    uploadedAt: new Date().toISOString(),
  };
}

function makeChunkId(index: number): ChunkId {
  return `chunk-${index}` as ChunkId;
}
function makePageId(pageNumber: number): PageId {
  return `page-${pageNumber}` as PageId;
}

function buildParsedPages(): ParsedPage[] {
  return Object.entries(currentSample().pages).map(([num, text]) => {
    const pageNumber = Number(num);
    // A page whose extracted text is unusually short relative to the
    // document's typical page is flagged — a real backend would derive
    // this from actual OCR/text-density signals; here it's a simple
    // length heuristic against this document's own average.
    return {
      id: makePageId(pageNumber),
      documentId: currentDocumentId(),
      pageNumber,
      rawText: text,
      extractedText: text,
      extractionConfidence: text.length < 50 ? 0.2 : 0.97,
      flags:
        text.length < 50
          ? [{ code: "low_text_density", severity: "warning", message: "Very little text extracted from this page." }]
          : undefined,
    };
  });
}

function cleanText(raw: string): { cleaned: string; ratio: number } {
  const cleaned = raw
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const ratio = raw.length === 0 ? 0 : (raw.length - cleaned.length) / raw.length;
  return { cleaned, ratio: Math.max(0, ratio) };
}

function buildCleanedPages(pages: ParsedPage[]): CleanedPage[] {
  return pages.map((p) => {
    const { cleaned, ratio } = cleanText(p.extractedText ?? p.rawText);
    return {
      pageId: p.id,
      cleanedText: cleaned,
      rulesApplied: [
        "strip trailing whitespace",
        "collapse 3+ blank lines to 1",
        "trim leading/trailing whitespace",
      ],
      charsRemovedRatio: ratio,
      flags:
        ratio > 0.2
          ? [{ code: "heavy_cleanup", severity: "info", message: `Cleanup removed ${(ratio * 100).toFixed(0)}% of this page's characters — worth a look.` }]
          : undefined,
    };
  });
}

function buildChunks(pages: CleanedPage[], parsedByPageId: Map<PageId, ParsedPage>, params: ChunkParameters): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;
  for (const page of pages) {
    const parsed = parsedByPageId.get(page.pageId)!;
    const pieces = splitText(page.cleanedText, params.chunkSize, params.chunkOverlap);
    for (const text of pieces) {
      const charCount = text.length;
      chunks.push({
        id: makeChunkId(index),
        documentId: currentDocumentId(),
        pageId: page.pageId,
        pageNumber: parsed.pageNumber,
        index,
        text,
        charCount,
        estimatedTokenCount: estimateTokenCount(text),
        flags: buildChunkFlags(text, charCount),
      });
      index++;
    }
  }
  return chunks;
}

function buildChunkFlags(text: string, charCount: number): Chunk["flags"] {
  const flags: NonNullable<Chunk["flags"]> = [];
  if (charCount < 300) {
    flags.push({ code: "short_chunk", severity: "warning", message: "Under ~300 characters — may be too short to give the model useful standalone context." });
  }
  if (/^[a-z]/.test(text.trim()) || /(as follows:|including:|the following)\s*$/i.test(text.trim())) {
    flags.push({ code: "boundary_risk", severity: "warning", message: "This chunk's boundary may have split a sentence or a lead-in phrase awkwardly." });
  }
  return flags.length ? flags : undefined;
}

/**
 * Populates real vector values via the embedding-provider registry
 * (services/embeddingProviders/) — previously this field was always an
 * intentionally-empty array. Uses whichever provider is currently active
 * (see getActiveEmbeddingProvider below); defaults to
 * LexicalTfIdfEmbeddingProvider, which needs no network and no download.
 *
 * Deliberately does NOT feed these vectors into runRetrieval()'s
 * threshold/kept logic below — that stays on the existing, already-
 * verified mockDistance heuristic unchanged. These real vectors power
 * the Embedding page's exploration views (real vector preview, real
 * nearest-neighbor lookups via InMemoryVectorStore) without changing
 * Retrieval's contract, its threshold semantics, or its UI at all.
 */
async function buildEmbeddings(chunks: Chunk[]): Promise<{ embeddings: ChunkEmbedding[]; vectorStore: InMemoryVectorStore; model: { name: string; dimensions: number; normalized: boolean } }> {
  const provider = getActiveEmbeddingProvider();
  await provider.load();
  const vectors = await provider.embed(chunks.map((c) => c.text));

  const vectorStore = new InMemoryVectorStore();
  vectorStore.add(chunks.map((c, i) => ({ id: c.id, vector: vectors[i] ?? [], metadata: { pageNumber: c.pageNumber } })));

  const model = { name: provider.name, dimensions: provider.dimensions, normalized: true };
  const embeddings: ChunkEmbedding[] = chunks.map((c, i) => ({
    chunkId: c.id,
    vector: vectors[i] ?? [],
    model,
    createdAt: new Date().toISOString(),
  }));

  return { embeddings, vectorStore, model };
}

function runRetrieval(chunks: Chunk[], question: string, params: RetrievalParameters): RetrievalResult {
  const scored = chunks.map((c) => ({
    chunkId: c.id,
    pageNumber: c.pageNumber,
    score: mockDistance(question, c.text),
    scoreDirection: "lower-is-better" as const,
    kept: false,
    matchExplanation: undefined as string | undefined,
  }));
  scored.sort((a, b) => a.score - b.score);
  const top = scored.slice(0, Math.max(params.topK, 1));
  for (const cand of top) {
    cand.kept = cand.score <= params.threshold;
    cand.matchExplanation = cand.kept
      ? `Shares enough terms/phrasing with the question to be treated as relevant (distance ${cand.score.toFixed(2)}).`
      : `Over the ${params.threshold} threshold — dropped even though it was among the top ${params.topK} candidates.`;
  }
  return { question, candidates: top, parameters: params };
}

function buildPrompt(chunks: Chunk[], retrieval: RetrievalResult): PromptAssembly {
  const kept = retrieval.candidates.filter((c) => c.kept);
  const systemText = [
    "You are an expert document question-answering assistant.",
    "",
    "Answer ONLY from the supplied context.",
    "",
    "Guidelines:",
    "- Synthesize information from multiple retrieved sources into a coherent response.",
    "- Preserve names, dates, numbers, technologies, organizations and locations exactly as written.",
    "- Never use outside knowledge. Never invent information.",
    '- If the context does not contain the answer, reply exactly: "I don\'t know based on the provided context."',
    "",
    "After your answer, include a Sources section listing the page numbers that support your answer.",
  ].join("\n");

  const contextSections = kept.map((cand) => {
    const chunk = chunks.find((c) => c.id === cand.chunkId)!;
    return {
      kind: "context" as const,
      label: `Page ${chunk.pageNumber}`,
      content: chunk.text,
      sourceChunkId: chunk.id,
    };
  });

  const sections = [
    { kind: "system" as const, label: "System Prompt", content: systemText },
    ...contextSections,
    { kind: "question" as const, label: "Question", content: retrieval.question },
  ];

  const finalPrompt = [
    systemText,
    "",
    "Context:",
    ...contextSections.map((s) => `[${s.label}]\n${s.content}`),
    "",
    `Question:\n${retrieval.question}`,
  ].join("\n\n");

  return { sections, finalPrompt };
}

async function buildGeneration(retrieval: RetrievalResult, prompt: PromptAssembly): Promise<GenerationResult> {
  const kept = retrieval.candidates.filter((c) => c.kept);
  if (kept.length === 0) {
    return { answer: "I don't know based on the provided context.", abstained: true, citations: [], sourcePages: [] };
  }

  const provider = getActiveLLMProvider();
  try {
    const answer = await provider.generate(prompt.finalPrompt);
    const sourcePages = [...new Set(kept.map((c) => c.pageNumber))].sort((a, b) => a - b);
    // Degenerate citation spans (start: 0, end: 0) — matching the real
    // backend's own established pattern (see backend/api.py's header
    // comment): a real LLM's output is abstractive prose, so no
    // precise character range is actually knowable.
    const citations: GenerationResult["citations"] = kept.map((c) => ({ start: 0, end: 0, chunkId: c.chunkId, pageNumber: c.pageNumber }));
    return { answer, abstained: false, citations, sourcePages, modelUsed: provider.name };
  } catch (err) {
    // No real LLM could be reached (no user key, no working default
    // proxy, or the call itself failed). This used to quietly degrade
    // to an extractive stand-in — real sentences from the source
    // chunks, dressed up enough that it read as a plausible-but-wrong
    // real answer to more than one person testing this app. Now it's a
    // real, explicit blocked state instead: no answer text at all, with
    // the actual reason preserved for the UI to show plainly and point
    // at Dashboard's LLM settings to fix.
    const reason = err instanceof LLMProviderError ? err.message : "No LLM is available to generate an answer.";
    return { answer: "", abstained: false, blockedNoKey: true, citations: [], sourcePages: [], modelUsed: reason };
  }
}

function buildEvaluation(retrieval: RetrievalResult, generation: GenerationResult, durations: Record<string, number>): EvaluationResult {
  const totalLatencyMs = Object.values(durations).reduce((a, b) => a + b, 0);
  return {
    metrics: [
      {
        key: "faithfulness",
        label: "Faithfulness",
        value: 0,
        explanation: "Does the answer only say things actually supported by the retrieved chunks?",
        available: false, // not computed by this mock adapter — shown as "Coming soon"
      },
      {
        key: "answer_relevance",
        label: "Answer Relevance",
        value: 0,
        explanation: "Does the answer actually address what was asked?",
        available: false,
      },
      {
        key: "kept_candidates",
        label: "Chunks Used",
        value: retrieval.candidates.filter((c) => c.kept).length,
        explanation: "How many retrieved chunks cleared the threshold and were used as context.",
        available: true,
      },
      {
        key: "citation_count",
        label: "Citations",
        value: generation.abstained ? 0 : new Set(generation.citations.map((c) => c.chunkId)).size,
        explanation: generation.abstained
          ? "The model abstained — no context was cited."
          : "How many distinct chunks the answer actually cited.",
        available: true,
      },
    ],
    latencyBreakdown: Object.entries(durations).map(([stage, durationMs]) => ({
      stage: stage as EvaluationResult["latencyBreakdown"][number]["stage"],
      durationMs,
    })),
    totalLatencyMs,
  };
}

// ---------------------------------------------------------------------------

let currentParams: ChunkParameters = DEFAULT_CHUNK_PARAMS;
let currentRetrievalParams: RetrievalParameters = DEFAULT_RETRIEVAL_PARAMS;
let currentQuestion: string | undefined;

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function assembleRun(): Promise<PipelineRun> {
  const t0 = performance.now();
  const parsedPages = buildParsedPages();
  const tParse = performance.now();

  const cleanedPages = buildCleanedPages(parsedPages);
  const tClean = performance.now();

  const parsedByPageId = new Map(parsedPages.map((p) => [p.id, p]));
  const chunks = buildChunks(cleanedPages, parsedByPageId, currentParams);
  const tChunk = performance.now();

  const { embeddings, model } = await buildEmbeddings(chunks);
  const projectionInput = chunks.map((c) => ({ id: c.id, text: c.text }));
  const positions = mockProject2D(projectionInput);
  const projection = chunks.map((c) => ({
    chunkId: c.id,
    x: positions[c.id]?.x ?? 0,
    y: positions[c.id]?.y ?? 0,
    method: "force-layout (toy, for display only — not PCA/UMAP on a real embedding space)",
  }));
  const tEmbed = performance.now();

  const durations: Record<string, number> = {
    parse: tParse - t0,
    clean: tClean - tParse,
    chunk: tChunk - tClean,
    embed: tEmbed - tChunk,
  };

  const run: PipelineRun = {
    id: currentRunId(),
    document: currentSourceDocument(),
    question: currentQuestion,
    stages: {
      parse: { status: "done", summary: `Extracted text from ${parsedPages.length} pages`, data: parsedPages, durationMs: durations.parse },
      clean: { status: "done", summary: "Whitespace cleanup applied", data: cleanedPages, durationMs: durations.clean },
      chunk: { status: "done", summary: `Split into ${chunks.length} chunks`, data: { chunks, parameters: currentParams }, durationMs: durations.chunk },
      embed: { status: "done", summary: `Embedded ${embeddings.length} chunks with ${model.name}`, data: { embeddings, projection, model }, durationMs: durations.embed },
      retrieve: { status: "pending" },
      prompt: { status: "pending" },
      generate: { status: "pending" },
      evaluate: { status: "pending" },
    },
  };

  if (currentQuestion) {
    const tR0 = performance.now();
    const retrieval = runRetrieval(chunks, currentQuestion, currentRetrievalParams);
    const tR1 = performance.now();
    const keptAny = retrieval.candidates.some((c) => c.kept);

    run.stages.retrieve = keptAny
      ? { status: "done", summary: `${retrieval.candidates.filter((c) => c.kept).length} of ${retrieval.candidates.length} candidates kept`, data: retrieval, durationMs: tR1 - tR0 }
      : {
          status: "failed",
          summary: "No candidate cleared the threshold",
          reason: "Nothing in this document scored close enough to the question to be trusted as context.",
          suggestedNextStep: "Check whether the document actually covers this topic, or loosen the retrieval threshold.",
          data: retrieval,
          durationMs: tR1 - tR0,
        };

    const prompt = buildPrompt(chunks, retrieval);
    run.stages.prompt = { status: "done", summary: `${prompt.sections.length} sections assembled`, data: prompt };

    const tG0 = performance.now();
    const generation = await buildGeneration(retrieval, prompt);
    const tG1 = performance.now();
    run.stages.generate = {
      status: "done",
      summary: generation.abstained ? "Abstained — no supporting context" : `Answered, citing page(s) ${generation.sourcePages.join(", ")}`,
      data: generation,
      durationMs: tG1 - tG0,
    };

    const evalDurations = { ...durations, retrieve: tR1 - tR0, generate: tG1 - tG0 };
    run.stages.evaluate = {
      status: "done",
      summary: "Lightweight scorecard for this question",
      data: buildEvaluation(retrieval, generation, evalDurations),
    };
  }

  return run;
}

export const mockPipelineDataSource: PipelineDataSource = {
  async uploadDocument(_file: File) {
    // The mock adapter ignores the actual File — it serves whichever
    // built-in sample document was selected via setMockSampleDocument()
    // before this was called (see components/layout/SampleDocumentPicker).
    // This is local demo data, not a real upload pipeline.
    // httpPipelineDataSource performs a real upload instead.
    currentQuestion = undefined;
    currentParams = DEFAULT_CHUNK_PARAMS;
    currentRetrievalParams = DEFAULT_RETRIEVAL_PARAMS;
    return delay(await assembleRun());
  },

  async rebuildChunks(_runId, params) {
    currentParams = params;
    return delay(await assembleRun());
  },

  async askQuestion(_runId, question, retrievalParams) {
    currentQuestion = question;
    currentRetrievalParams = { ...currentRetrievalParams, ...retrievalParams };
    return delay(await assembleRun());
  },

  async rebuildRetrieval(_runId, params) {
    currentRetrievalParams = params;
    return delay(await assembleRun());
  },

  async getRun(_runId) {
    return delay(await assembleRun());
  },

  async listDocuments() {
    return delay([currentDocumentId()]);
  },

  async checkHealth() {
    return true;
  },
};
