import type { PipelineDataSource } from "@/services/pipelineDataSource";
import { PipelineDataSourceError } from "@/services/pipelineDataSource";
import type { PipelineRun, ChunkParameters, RetrievalParameters } from "@/types/pipeline";

/**
 * Real-backend adapter.
 *
 * As of this repo's monorepo restructure, this is NOT hypothetical — a real
 * backend exists at ../backend, with an HTTP layer in ../backend/api.py
 * that implements exactly the contract documented below by calling the
 * actual pipeline logic in ../backend/src/trace.py. See the root README's
 * "Quick start — run both locally" section to run it.
 *
 * To use this adapter: run `uvicorn api:app --port 8000` in ../backend,
 * then set VITE_PIPELINE_DATA_SOURCE=http and VITE_API_BASE_URL in this
 * app's .env.local (see .env.example). See hooks/usePipelineRun.ts for
 * where that env var is read.
 *
 * Every method below issues a real fetch and lets real failures surface as
 * PipelineDataSourceError — per "do not create fake interactions," there is
 * no fixture-data fallback here.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (cause) {
    throw new PipelineDataSourceError(`Could not reach the backend at ${BASE_URL}${path}`, cause);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new PipelineDataSourceError(`Request to ${path} failed with ${response.status}: ${body}`);
  }
  return (await response.json()) as T;
}

export const httpPipelineDataSource: PipelineDataSource = {
  // POST /api/documents  (multipart/form-data: file)
  // -> 201 { run: PipelineRun }  — parse/clean/chunk/embed already run
  async uploadDocument(file) {
    const form = new FormData();
    form.append("file", file);
    const res = await request<{ run: PipelineRun }>("/documents", { method: "POST", body: form, headers: {} });
    return res.run;
  },

  // POST /api/runs/:runId/chunks  { chunkSize, chunkOverlap }
  // -> 200 { run: PipelineRun }  — chunk/embed re-run; retrieve/prompt/generate/evaluate
  //    re-run too IF the run already had a question set, else left pending.
  async rebuildChunks(runId, params: ChunkParameters) {
    const res = await request<{ run: PipelineRun }>(`/runs/${runId}/chunks`, {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res.run;
  },

  // POST /api/runs/:runId/questions  { question, topK?, threshold? }
  // -> 200 { run: PipelineRun }  — retrieve/prompt/generate/evaluate run
  async askQuestion(runId, question, retrievalParams) {
    const res = await request<{ run: PipelineRun }>(`/runs/${runId}/questions`, {
      method: "POST",
      body: JSON.stringify({ question, ...retrievalParams }),
    });
    return res.run;
  },

  // POST /api/runs/:runId/retrieval  { topK, threshold }
  // -> 200 { run: PipelineRun }  — re-runs retrieve AND prompt/generate/evaluate
  //    against the same question (prompt/generation genuinely depend on
  //    retrieval's output, so there's no meaningful "retrieve only, keep the
  //    old generated answer" state — both the mock and real backend fully
  //    recompute downstream of a retrieval parameter change). Requires a
  //    question to already be set on this run (400 if not).
  async rebuildRetrieval(runId, params: RetrievalParameters) {
    const res = await request<{ run: PipelineRun }>(`/runs/${runId}/retrieval`, {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res.run;
  },

  // GET /api/runs/:runId -> 200 { run: PipelineRun }
  async getRun(runId) {
    const res = await request<{ run: PipelineRun }>(`/runs/${runId}`);
    return res.run;
  },

  // GET /api/documents -> 200 { documentIds: DocumentId[] }
  async listDocuments() {
    const res = await request<{ documentIds: PipelineRun["document"]["id"][] }>("/documents");
    return res.documentIds;
  },

  // GET /api/health -> 200 { status: "ok", activeRuns: number }
  // Deliberately bypasses request() — a down/unreachable backend here
  // should resolve to `false`, not throw, since this is only used to
  // decide whether to show a "connecting..." state before any real
  // request is attempted.
  async checkHealth() {
    try {
      // cache: "no-store" matters here specifically — without it, the
      // browser can serve a stale cached 200 from an earlier successful
      // check even after the backend has since stopped, showing
      // "Connected" instantly with no real network round-trip at all.
      const res = await fetch(`${BASE_URL}/health`, { cache: "no-store" });
      if (!res.ok) return false;
      // A bare `res.ok` check isn't enough on its own: if BASE_URL is
      // misconfigured (VITE_API_BASE_URL unset/wrong, defaulting to the
      // relative "/api"), this fetch silently hits Vite's OWN dev server
      // instead of the real backend — and Vite's dev server serves
      // index.html with a real 200 OK as its SPA fallback for any
      // unmatched GET path, rather than a 404. That 200 would otherwise
      // read as "backend is healthy" when the real backend was never
      // actually reached at all — exactly the confusing case where the
      // UI shows "Connected" but every real request then 404s. Checking
      // the actual JSON shape closes that gap.
      const body = await res.json().catch(() => null);
      return body?.status === "ok";
    } catch {
      return false;
    }
  },
};
