import type { LLMProvider } from "@/services/llmProviders/llmProvider";
import { LLMProviderError } from "@/services/llmProviders/llmProvider";
import { getUserGroqKey } from "@/services/userApiKey";
import { isRunningLocally } from "@/utils/environment";

/**
 * Three ways this reaches Groq, tried in this order:
 *
 * 1. A key the person typed in themselves (see userApiKey.ts) — sent to
 *    this app's own same-origin proxy (`/api/generate`), which forwards
 *    it to Groq server-side. Routed through the proxy rather than called
 *    directly from the browser because Groq's API does not allow direct
 *    browser-to-Groq requests for arbitrary origins (no CORS allowance)
 *    — a client-side call would simply be blocked before ever reaching
 *    Groq, regardless of whether the key itself was valid. The proxy
 *    uses the supplied key for that one request only; see
 *    api/generate.js's header comment for exactly what it does and
 *    doesn't do with it (never logged, never stored, never mixed with
 *    the deployment's own default key).
 * 2. `VITE_GROQ_API_KEY`, but ONLY when this app is genuinely running on
 *    localhost — a local-dev convenience so plain `npm run dev` can get
 *    real answers without needing `vercel dev` or the settings UI. See
 *    .env.example's warning: this variable must never be present during
 *    a production build, since Vite bundles it into public JS regardless
 *    of the runtime localhost check.
 * 3. No user key, not running locally (or no local key set) → the same
 *    proxy as (1), with no key attached, so it falls back to whatever
 *    default key (if any) the deployment itself has configured
 *    server-side.
 */
const PROXY_ENDPOINT = "/api/generate";
const GROQ_API_BASE = "https://api.groq.com/openai/v1";

export const GROQ_MODEL = "llama-3.1-8b-instant";

export class GroqLLMProvider implements LLMProvider {
  readonly id = "groq";
  readonly name = `Groq (${GROQ_MODEL})`;
  readonly configurationHint =
    "Uses your own Groq API key if you've added one, a local VITE_GROQ_API_KEY when running on localhost, or this app's server-side default if deployed with one configured.";

  // Whether the proxy actually has a working default key server-side
  // isn't something the client can know synchronously (or safely check
  // without burning a real request) — but a user key or local env key,
  // if present, is known synchronously. Report "configured" whenever any
  // path could plausibly work; generate() surfaces a specific,
  // distinguishable error if it turns out none do, and the caller (see
  // mockPipelineDataSource's buildGeneration) treats that as a real
  // failure worth telling the person about — not something to paper
  // over with a silently-worse answer.
  isConfigured(): boolean {
    return true;
  }

  async generate(prompt: string): Promise<string> {
    const userKey = getUserGroqKey();
    if (userKey) return this.generateViaProxy(prompt, userKey);

    const localKey = isRunningLocally() ? import.meta.env.VITE_GROQ_API_KEY : undefined;
    if (localKey) return this.generateDirect(prompt, localKey);

    return this.generateViaProxy(prompt);
  }

  // Still used by the local-dev VITE_GROQ_API_KEY path only — see
  // generate() above. Left exactly as-is: unrelated to the userKey fix.
  private async generateDirect(prompt: string, apiKey: string): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.2 }),
      });
    } catch (err) {
      throw new LLMProviderError("Could not reach Groq's API — check your network connection.", err);
    }
    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        detail = body?.error?.message ?? "";
      } catch {
        // response body wasn't JSON
      }
      if (res.status === 401) {
        throw new LLMProviderError("Groq rejected your API key (401) — double-check it in LLM settings.");
      }
      throw new LLMProviderError(`Groq returned an error (${res.status})${detail ? `: ${detail}` : "."}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new LLMProviderError("Groq's response didn't include the expected content — the API shape may have changed.");
    }
    return content;
  }

  private async generateViaProxy(prompt: string, userApiKey?: string): Promise<string> {
    let res: Response;
    try {
      res = await fetch(PROXY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: GROQ_MODEL, ...(userApiKey ? { userApiKey } : {}) }),
      });
    } catch (err) {
      throw new LLMProviderError(
        userApiKey
          ? "Could not reach the /api/generate proxy to use your key — it's only available when deployed to Vercel, or running via `vercel dev` locally (not plain `npm run dev`)."
          : "Could not reach the /api/generate proxy — it's only available when deployed to Vercel (or running via `vercel dev` locally), not under plain `npm run dev`. Add your own Groq API key in LLM settings to get real answers under plain `npm run dev` too.",
        err,
      );
    }
    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        detail = body?.error ?? "";
      } catch {
        // response body wasn't JSON
      }
      if (userApiKey && res.status === 401) {
        throw new LLMProviderError("Groq rejected your API key (401) — double-check it in LLM settings.");
      }
      throw new LLMProviderError(
        userApiKey
          ? `Your Groq key didn't work${detail ? `: ${detail}` : "."}`
          : `No default LLM is configured on this deployment${detail ? `: ${detail}` : "."} Add your own Groq API key in LLM settings to get real generated answers.`,
      );
    }
    const data = await res.json();
    if (typeof data?.content !== "string") {
      throw new LLMProviderError("The generate proxy's response didn't include the expected content.");
    }
    return data.content;
  }
}
