// Vercel Serverless Function — the ONLY place GROQ_API_KEY (the
// deployment's own default key) is ever read.
//
// Deployed at /api/generate (Vercel maps this file's path directly to
// that route — no extra routing config needed). The client
// (src/services/llmProviders/groqProvider.ts) sends { prompt, model,
// userApiKey? } as JSON.
//
// userApiKey is someone's OWN key, entered in the LLM settings UI —
// routed through this same function rather than called from the browser
// directly, because Groq's API does not allow direct browser-to-Groq
// requests (no CORS allowance for arbitrary origins): a client-side call
// with any key, the deployment's default or a visitor's own, would
// simply be blocked by the browser before ever reaching Groq. A
// server-to-server call here has no such restriction. userApiKey is used
// for that one request only — never logged, never written to any file
// or store, never mixed into the deployment's own GROQ_API_KEY.
//
// Setup: in the Vercel dashboard, Project Settings -> Environment
// Variables -> add GROQ_API_KEY (get one at console.groq.com/keys).
// Do NOT prefix it with VITE_ — a VITE_-prefixed variable gets inlined
// into the client bundle by Vite, which defeats the entire point of
// having this proxy. A plain GROQ_API_KEY is only ever readable from
// inside this server-side function.
//
// Local testing: `vercel dev` (not `npm run dev`) runs this function
// locally too, reading GROQ_API_KEY from a `.env` file in this directory
// (see .env.example) or from `vercel env pull`. Plain `npm run dev`
// doesn't run serverless functions at all — Demo Mode's Generate stage
// falls back to its extractive stand-in in that case, by design (see
// groqProvider.ts's isConfigured() comment), unless VITE_GROQ_API_KEY is
// set for local-dev-only direct calls (see .env.example — a completely
// separate, unrelated path from this file and from userApiKey above).

const GROQ_API_BASE = "https://api.groq.com/openai/v1";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { prompt, model, userApiKey } = req.body ?? {};
  if (typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "Missing or empty 'prompt'." });
    return;
  }

  // A real key someone typed into the LLM settings UI takes priority
  // over the deployment's own default — using their own key is the
  // whole point of entering one.
  const apiKey = (typeof userApiKey === "string" && userApiKey.trim()) || process.env.GROQ_API_KEY;
  if (!apiKey) {
    // 500, not 401/403 — this is a deployment misconfiguration (no
    // default key set, and the visitor didn't supply their own either),
    // not a client auth problem.
    res.status(500).json({ error: "No Groq API key available — no default key is configured on this deployment, and none was supplied. Add your own key in LLM settings." });
    return;
  }

  // Basic per-request size guard — a public deployment's Groq quota is
  // shared across every visitor; nothing here should be able to send an
  // unbounded prompt and burn the whole quota in one call.
  if (prompt.length > 24_000) {
    res.status(413).json({ error: "Prompt too long." });
    return;
  }

  try {
    const groqRes = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: typeof model === "string" && model ? model : "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!groqRes.ok) {
      let detail = "";
      try {
        const body = await groqRes.json();
        detail = body?.error?.message ?? "";
      } catch {
        // ignore — body wasn't JSON
      }
      res.status(groqRes.status).json({ error: detail || `Groq returned ${groqRes.status}` });
      return;
    }

    const data = await groqRes.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      res.status(502).json({ error: "Groq's response didn't include the expected content." });
      return;
    }

    res.status(200).json({ content });
  } catch (err) {
    res.status(502).json({ error: "Could not reach Groq's API.", detail: String(err) });
  }
}
