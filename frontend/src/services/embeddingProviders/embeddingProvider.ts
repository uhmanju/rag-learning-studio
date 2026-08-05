/**
 * The abstraction every embedding-generation implementation in Demo Mode
 * sits behind. Adding a future model (BGE, E5, Nomic, Instructor, ...)
 * means writing one new file implementing this interface and registering
 * it in `registry.ts` — no other file needs to change.
 */
export interface EmbeddingProvider {
  /** Stable machine id, e.g. "transformers-all-minilm-l6-v2". */
  id: string;
  /** Human-readable name shown in the model picker. */
  name: string;
  /** Real dimensionality of vectors this provider produces. Providers
   *  report their ACTUAL dimension count — never a hardcoded number that
   *  might not match what embed() really returns. */
  dimensions: number;
  /** Short, honest description of what this provider actually is —
   *  shown in the UI so a learner never mistakes a fallback for a real
   *  neural embedding model, or vice versa. */
  description: string;
  /** True once this provider can actually embed text right now (e.g. a
   *  browser ML model has finished downloading and initializing). Some
   *  providers are ready immediately; others need an async load first. */
  isReady(): boolean;
  /** Triggers (or awaits, if already in progress) whatever setup this
   *  provider needs before embed() can be called — e.g. downloading and
   *  initializing a model. Safe to call multiple times; safe to call even
   *  if already ready (resolves immediately). */
  load(onProgress?: (message: string) => void): Promise<void>;
  /** Embeds a batch of texts. Must only be called after load() resolves
   *  (or when isReady() is already true). */
  embed(texts: string[]): Promise<number[][]>;
}

export class EmbeddingProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EmbeddingProviderError";
  }
}
