# Contributing to RAG Learning Studio

Thanks for considering a contribution. This is a monorepo: `backend/` (the
Python RAG pipeline + its HTTP API) and `frontend/` (the React learning UI).
You generally don't need to touch both to make a good contribution.

## Ground rules

1. **Every visualization must teach something.** If a feature doesn't satisfy
   at least one of "teaches a concept / explains a decision / helps
   debugging / improves experimentation," it probably belongs in a
   discussion issue, not a PR, at least for now — see `ROADMAP.md`.
2. **Stay framework-agnostic on the frontend.** Nothing under
   `frontend/src/components/` or `frontend/src/types/` may import or
   reference a specific RAG framework, vector database, or model provider.
   Framework-specific logic belongs in `frontend/src/services/` (a new
   `PipelineDataSource` adapter) or in `backend/` — never in a component.
3. **No fake interactions.** If a feature needs data the connected backend
   can't yet provide, render it as `<ComingSoon />`
   (`frontend/src/components/common/StateBlocks.tsx`) rather than
   simulating a number. On the backend side, this means: don't invent a
   metric — mark it `available: False` in `api.py`'s serialization (see how
   Faithfulness/Answer Relevance are handled) until it's for real.
4. **Keep the Learning Panel's four-part shape.** What happened / Why / Best
   practice / Common mistakes / Try this. Don't add a fifth section or a
   documentation wall.
5. **One component, one question.** If a component needs a `mode` prop that
   branches its entire rendering in two, it's probably two components.

## Repo layout

```
rag-learning-studio/
├── backend/           Python RAG pipeline + FastAPI HTTP layer
│   ├── config.py      All tunables in one place (chunk size, model names, ...)
│   ├── api.py          The HTTP layer — see its header comment first
│   ├── main.py         CLI (ingest/query), independent of the API
│   └── src/
│       ├── pdf_loader.py    PDF → markdown
│       ├── chunker.py       clean + chunk
│       ├── vector_store.py  embed + store (Chroma)
│       ├── retriever.py     retrieval + the real ANSWER_PROMPT
│       ├── llm.py           provider factory (ollama / anthropic)
│       ├── trace.py         captures every stage's real intermediate data
│       ├── textdiff.py      the Clean stage's diff rendering
│       └── viz.py           PCA projection for the Embed stage's map
└── frontend/          React + TypeScript learning UI
    ├── src/types/pipeline.ts       the framework-agnostic domain model
    ├── src/services/               PipelineDataSource adapters (mock + http)
    ├── src/components/common/      generic, reusable components
    ├── src/components/stages/      one file per pipeline stage's view
    └── verification/                offline TypeScript sanity-check harness
```

See `docs/architecture-diagram.md` for the full data-flow diagram across
both halves.

## Contributing to the backend

`backend/src/trace.py` is the module to understand first — it's the single
place that calls every pipeline stage and captures what it produced,
including per-stage flags and durations. `api.py` does nothing but call
`trace.py`'s functions and serialize the result into the shape
`frontend/src/services/httpPipelineDataSource.ts` expects — if you change
what a stage returns, update the matching bit of `api.py`'s
`serialize_run()`, not the frontend.

**Adding a new flag detector** (e.g. "this chunk may be too short"): add
detection logic to the relevant `flag_*` function in `trace.py`, following
the existing pattern (return a list of plain-language strings). Then update
`api.py`'s per-object flag construction (in `serialize_run()`) if the flag
should attach to individual pages/chunks rather than just the stage as a
whole.

**Adding a new tunable parameter**: extend the relevant function's
signature with a keyword argument defaulting to the existing `config.py`
value (see how `chunk_data()`, `build_ingestion_trace()`, and
`add_query_to_trace()` already do this) — never read a new value directly
from `config` deep inside a function if it's something a caller (the API)
should be able to override per request.

## Contributing to the frontend

See `frontend/src/types/pipeline.ts` first — the domain model every
component is built against.

**Adding a new stage-view feature**: find or extend the relevant type in
`pipeline.ts`, make sure both `mockPipelineDataSource.ts` and
`httpPipelineDataSource.ts`/`api.py` can actually produce that data, then
build the UI in `frontend/src/components/stages/`, composing existing
`common/` components (`TransformationViewer`, `ParameterPanel`,
`FlowConnector`, `MetricCard`) before reaching for something new.

## Good first issues

- Add a screenshot to `docs/screenshots/` for any stage (see README's
  reserved placeholders).
- Add a keyboard-navigable equivalent for the Chunk Explorer's chunk list.
- Add a 5th sample document to `frontend/src/services/fixtures/
  sampleDocuments.ts` (with a real PDF in `frontend/public/samples/`), to
  stress-test chunking/retrieval on a different content shape than the
  current 4.
- Compute real citation character-offsets in `api.py`'s generation
  serialization instead of the current degenerate `(0, 0)` span — see that
  function's comment for exactly why it's a placeholder today.
- Add an ARIA live-region announcement when a chunk-rebuild or a new
  question finishes loading.

## Coding standards

**Frontend**: TypeScript strict mode is on, including
`noUncheckedIndexedAccess`. Run `npm run typecheck` and `npm run lint`
before opening a PR — or, without network access to install
`@types/react`, use `frontend/verification/` (see its README). No
RAG-framework, vector-database, or model-provider imports outside
`frontend/src/services/`.

**Backend**: keep new parameters as keyword arguments with config-backed
defaults (see above) rather than reading `config` directly inside a
function whenever a caller might reasonably want to override it. Prefer
extending `trace.py`'s existing dataclasses over introducing a parallel
data structure.

## Filing issues

Bug reports and feature discussions are both welcome. For feature requests,
please note which of the four "teaches / explains / debugs / experiments"
criteria your idea serves — it speeds up triage significantly.
