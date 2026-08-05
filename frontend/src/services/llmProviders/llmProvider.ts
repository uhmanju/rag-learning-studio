/**
 * The abstraction every LLM-generation implementation in Demo Mode sits
 * behind. Adding a future provider (OpenAI, Ollama, Anthropic, Gemini,
 * ...) means writing one new file implementing this interface and
 * registering it in `registry.ts` — no other file needs to change.
 */
export interface LLMProvider {
  /** Stable machine id, e.g. "groq". */
  id: string;
  /** Human-readable name shown in the provider picker. */
  name: string;
  /** True once this provider has everything it needs to actually
   *  generate (e.g. an API key is present) — checked before every call
   *  so a missing/invalid key produces an honest "not configured" state
   *  instead of a failed network request presented as a mystery error. */
  isConfigured(): boolean;
  /** Short explanation of what's missing, shown in the UI when
   *  isConfigured() is false — e.g. "Add a Groq API key to enable this." */
  configurationHint: string;
  /** Sends the assembled prompt and returns the model's raw response
   *  text. Must only be called when isConfigured() is true. */
  generate(prompt: string): Promise<string>;
}

export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LLMProviderError";
  }
}
