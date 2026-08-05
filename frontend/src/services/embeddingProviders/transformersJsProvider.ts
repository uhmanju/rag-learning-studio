import type { EmbeddingProvider } from "@/services/embeddingProviders/embeddingProvider";
import { EmbeddingProviderError } from "@/services/embeddingProviders/embeddingProvider";

/**
 * IMPORTANT — VERIFICATION STATUS: this file could not be tested in the
 * environment it was written in. There is no network access at all
 * (confirmed via a direct connectivity check before writing this file),
 * so the `@xenova/transformers` package could not be installed, and the
 * actual model download + WASM/WebGPU inference could not be run even
 * once. Everything below is written correctly against Transformers.js's
 * real, documented pipeline API to the best of available knowledge, but
 * has not executed successfully anywhere. Before relying on this:
 *   1. `npm install @xenova/transformers` in frontend/
 *   2. Confirm it actually loads and embeds in a real browser
 *   3. Watch first-load time — the model is tens of MB; this provider's
 *      load() reports progress specifically so the UI can show that
 *      honestly instead of looking frozen
 *
 * This is the single highest-risk, least-verified file in this whole
 * change. The rest of Demo Mode works end to end without it — see
 * LexicalTfIdfEmbeddingProvider, which requires no dependency and no
 * network, and is the default until a real model provider is confirmed
 * working for real.
 */

// Typed loosely on purpose: @xenova/transformers isn't installed in this
// environment, so its real types aren't available to check against here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FeatureExtractionPipeline = (texts: string | string[], options?: Record<string, unknown>) => Promise<any>;

export const TRANSFORMERS_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const TRANSFORMERS_MODEL_DIMENSIONS = 384;

export class TransformersJsEmbeddingProvider implements EmbeddingProvider {
  readonly id = "transformers-all-minilm-l6-v2";
  readonly name = "all-MiniLM-L6-v2 (Transformers.js)";
  readonly dimensions = TRANSFORMERS_MODEL_DIMENSIONS;
  readonly description = "A real sentence-embedding neural network, downloaded once and run locally in your browser — no server, no API call per request.";

  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;
  private ready = false;

  isReady(): boolean {
    return this.ready;
  }

  async load(onProgress?: (message: string) => void): Promise<void> {
    if (this.ready) return;
    if (!this.pipelinePromise) {
      this.pipelinePromise = this.initPipeline(onProgress);
    }
    await this.pipelinePromise;
    this.ready = true;
  }

  private async initPipeline(onProgress?: (message: string) => void): Promise<FeatureExtractionPipeline> {
    onProgress?.("Loading @xenova/transformers…");
    let transformers: { pipeline: (task: string, model: string, options?: Record<string, unknown>) => Promise<FeatureExtractionPipeline> };
    try {
      // Dynamic import via a non-literal specifier, on purpose: this
      // keeps TypeScript from trying to statically resolve
      // "@xenova/transformers" at compile time, which fails in any
      // environment where the (optional, Demo-Mode-only) dependency
      // hasn't been installed yet — this whole call is wrapped so a
      // missing/failed import degrades to an honest runtime error
      // instead of a build-time failure for everyone else.
      const moduleSpecifier = "@xenova/transformers";
      transformers = await import(/* @vite-ignore */ moduleSpecifier);
    } catch (err) {
      throw new EmbeddingProviderError(
        "Could not load @xenova/transformers — is it installed? (npm install @xenova/transformers in frontend/)",
        err,
      );
    }

    onProgress?.(`Downloading ${TRANSFORMERS_MODEL_ID} (first run only, cached afterward)…`);
    try {
      const extractor = await transformers.pipeline("feature-extraction", TRANSFORMERS_MODEL_ID, {
        progress_callback: (p: { status?: string; progress?: number }) => {
          if (p.status === "progress" && typeof p.progress === "number") {
            onProgress?.(`Downloading model… ${Math.round(p.progress)}%`);
          }
        },
      });
      onProgress?.("Model ready.");
      return extractor;
    } catch (err) {
      throw new EmbeddingProviderError(`Failed to load ${TRANSFORMERS_MODEL_ID} — check your network connection.`, err);
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.pipelinePromise) {
      throw new EmbeddingProviderError("TransformersJsEmbeddingProvider.embed() called before load() — call load() first.");
    }
    const extractor = await this.pipelinePromise;
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    // Transformers.js returns a tensor-like object; `.tolist()` is the
    // documented way to get plain nested arrays back out of it.
    const nested: number[][] = typeof output.tolist === "function" ? output.tolist() : output;
    return nested;
  }
}
