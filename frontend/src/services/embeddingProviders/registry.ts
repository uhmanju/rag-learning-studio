import type { EmbeddingProvider } from "@/services/embeddingProviders/embeddingProvider";
import { LexicalTfIdfEmbeddingProvider } from "@/services/embeddingProviders/lexicalTfIdfProvider";
import { TransformersJsEmbeddingProvider } from "@/services/embeddingProviders/transformersJsProvider";

/**
 * Every embedding provider Demo Mode can offer. To add a future model
 * (BGE, E5, Nomic, Instructor, ...): write one file implementing
 * EmbeddingProvider, instantiate it here, and add it to this array.
 * Nothing else in the app needs to change — the model picker, the
 * pipeline runner, and every component that reads the active provider
 * all work against the EmbeddingProvider interface, never a specific
 * implementation.
 *
 * Order matters only for which one is the picker's default (the first
 * entry). LexicalTfIdfEmbeddingProvider is first — and therefore
 * default — specifically because it requires no network and no
 * dependency install, so Demo Mode is always fully usable even in an
 * environment where TransformersJsEmbeddingProvider can't load.
 */
export function createEmbeddingProviderRegistry(): EmbeddingProvider[] {
  return [new LexicalTfIdfEmbeddingProvider(), new TransformersJsEmbeddingProvider()];
}

export function getEmbeddingProvider(providers: EmbeddingProvider[], id: string): EmbeddingProvider {
  const found = providers.find((p) => p.id === id);
  return found ?? providers[0]!;
}
