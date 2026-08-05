import type { LLMProvider } from "@/services/llmProviders/llmProvider";
import { GroqLLMProvider } from "@/services/llmProviders/groqProvider";
import { ExtractiveFallbackProvider } from "@/services/llmProviders/extractiveFallbackProvider";

/**
 * Every LLM provider Demo Mode can offer. To add a future provider
 * (OpenAI, Ollama, Anthropic, Gemini, ...): write one file implementing
 * LLMProvider, instantiate it here, and add it to this array. Nothing
 * else in the app needs to change.
 *
 * ExtractiveFallbackProvider is always last and is always isConfigured()
 * — pickPreferredProvider() below only reaches it when nothing real is
 * configured, so Demo Mode's Generate stage never has literally nothing
 * to show.
 */
export function createLLMProviderRegistry(): LLMProvider[] {
  return [new GroqLLMProvider(), new ExtractiveFallbackProvider()];
}

/** The first configured provider, in registry order — the fallback is
 *  always configured, so this never returns undefined. */
export function pickPreferredProvider(providers: LLMProvider[]): LLMProvider {
  return providers.find((p) => p.isConfigured()) ?? providers[providers.length - 1]!;
}

export function getLLMProvider(providers: LLMProvider[], id: string): LLMProvider {
  const found = providers.find((p) => p.id === id);
  return found ?? pickPreferredProvider(providers);
}
