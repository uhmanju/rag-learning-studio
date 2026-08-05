import type { LLMProvider } from "@/services/llmProviders/llmProvider";

/**
 * The default provider when nothing else is configured. Deliberately
 * does NOT attempt to synthesize a fluent answer — that would mean
 * either calling a real model (defeating the point of a no-network
 * fallback) or fabricating text that looks generated but isn't, which
 * this project's whole design explicitly avoids everywhere else (see
 * docs/07_DECISIONS.md and docs/01_AI_CONTEXT.md's "never fabricate
 * data" rule). Instead it transparently returns the retrieved context
 * it was given, labeled as exactly that, so a learner sees real
 * retrieved content and an honest explanation of why there's no
 * generated prose — never a plausible-looking answer nobody actually
 * produced.
 */
export class ExtractiveFallbackProvider implements LLMProvider {
  readonly id = "extractive-fallback";
  readonly name = "No LLM configured (showing retrieved context)";
  readonly configurationHint = "This provider needs no configuration — it's the always-available default.";

  isConfigured(): boolean {
    return true;
  }

  async generate(prompt: string): Promise<string> {
    const contextMatch = prompt.match(/Context:\s*([\s\S]*?)(?:\n\s*Question:|$)/i);
    const context = contextMatch?.[1]?.trim();

    if (!context) {
      return "No LLM provider is configured, and no retrieved context was found to show instead. Configure a real provider (e.g. add a Groq API key) to get a generated answer.";
    }

    return [
      "No LLM provider is configured for Demo Mode, so this is not a generated answer — it's the real context that would have been sent to a model, shown directly so the retrieval step is still visible.",
      "",
      context,
    ].join("\n");
  }
}
