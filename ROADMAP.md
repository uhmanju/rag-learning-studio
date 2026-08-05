# Roadmap

This project is deliberately scoped release by release. Each version has one
job; features are held back rather than crammed in early, per the "maximize
understanding, not feature count" principle behind V1.

Kept intentionally light past V1 — closer versions have more detail because
there's more clarity about them; later ones are headline-only and will fill
in as they get closer, not committed to in full up front.

## Version 1 — Understand & Visualize (this release)

**Status: complete.** Upload → Parse → Clean → Chunk → Embed → Retrieve →
Prompt → Generate → Evaluate, fully interactive, with a real backend
(`backend/api.py`) alongside a real in-browser Demo Mode, a Learning Card on
every stage, and five real sample documents chosen to exercise different
retrieval/parsing challenges. See the README's Features table for the full
implementation summary.

Explicitly **not** in V1: Compare Mode, Experiment History/Timeline,
Benchmarking, Agentic RAG, Hybrid Search, Reranking. These aren't rejected
ideas — see "Later, unscheduled" below.

## Before hosting this anywhere

Local-only concerns in the current `backend/api.py` that would need real
attention before deploying anywhere other than a developer's own machine —
listed now so they're tracked, not discovered the hard way later:

- **In-memory run store.** `RUNS` is a plain Python dict — restarting the
  process loses every run. Fine for local testing; not fine for anything
  hosted.
- **CORS is wide open to localhost only.** `allow_origins` in `api.py`
  hardcodes the Vite dev server's default ports. A hosted deployment needs
  its real frontend origin(s) configured, and probably shouldn't use `*`.
- **No auth, no rate limiting, no per-user isolation.** Anyone who can reach
  the API can upload documents and burn LLM calls. A single-user local tool
  today; a multi-user hosted one needs real access control.
- **Ephemeral temp files and in-memory vector stores** are appropriate for
  a process that runs on a laptop and gets restarted often. A hosted
  deployment needs a real decision about where uploaded PDFs and vector
  data actually live (and for how long).
- **`config.LLM_PROVIDER = "ollama"`** assumes a local Ollama install.
  Hosting this means either bundling/hosting an LLM yourself or switching to
  the `anthropic` provider path already stubbed in `src/llm.py`.

None of this blocks local testing — it's a punch list for whenever "host it
online" actually happens.

## Version 2 — Evaluate

Real quality scoring for a run, replacing V1's "coming soon" Evaluate stage.
Faithfulness / Answer Relevance / Context Recall, real token-based cost
estimation, and some form of history across runs so a score means something
relative to a previous one.

## Version 3 — Test

Regression testing for a RAG pipeline: a fixed set of question/expected-
answer pairs, re-run automatically when chunking or retrieval parameters
change, so a tuning change that quietly breaks a previously-working question
gets caught instead of shipped.

## Version 4 — Benchmark

Formal comparison across embedding models, retrievers, and chunking
strategies, built on whatever evaluation and testing infrastructure V2/V3
actually end up producing — deliberately not detailed further than that yet,
since committing to a shape now would be exactly the over-commitment this
roadmap is trying to avoid.

## Later, unscheduled

Real ideas, not yet versions: named/saved parameter experiments ("Run A vs
Run B"), guided experiment presets launched from a Learning Card's "Try
this," hybrid search, reranking, parent-child retrieval, multi-query
retrieval, and agentic RAG (multi-step retrieval, tool use) visualized with
the same "never hide a transformation" philosophy as V1. These will move up
into a real version once there's enough clarity to scope one properly —
this list will be updated as that happens, rather than promising a shape for
them today.

## A note on scope discipline

Every roadmap item above earns its place by satisfying at least one of: it
teaches a concept, it explains a decision, it helps debugging, or it improves
experimentation. Feature requests that don't clear that bar are welcome as
discussion issues, but won't be scheduled onto a version just because they're
achievable.
