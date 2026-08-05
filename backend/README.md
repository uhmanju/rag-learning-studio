# RAG Learning Studio — Backend

The Python RAG pipeline: parse → clean → chunk → embed → retrieve →
generate, plus a FastAPI HTTP layer (`api.py`) so the React frontend in
`../frontend` can drive it with real parameters and see real data.

For running backend + frontend together locally, see the **root**
[`README.md`](../README.md)'s Quick Start — this file covers the backend on
its own.

## Install

```bash
pip install -e .
```

## Configuration

All tunables live in [`config.py`](config.py): chunk size/overlap, retrieval
k/threshold, the embedding model name, and which LLM provider to use
(`ollama` by default — local, free, private; `anthropic` also supported,
needs `pip install -e ".[anthropic]"` and an `ANTHROPIC_API_KEY`).

If using Ollama (the default), you need it actually running with the
configured model pulled:

```bash
ollama serve
ollama pull llama3.2   # or whatever config.OLLAMA_MODEL_NAME is set to
```

## Running the HTTP API

```bash
uvicorn api:app --reload --port 8000
```

See `api.py`'s header comment for the design of the run store, why vector
storage is ephemeral per-run, and how LLM failures are handled without
taking down the rest of a run's data. The endpoint contract it implements is
documented from the client side in
`../frontend/src/services/httpPipelineDataSource.ts`.

## CLI (no HTTP, no frontend)

Still works, unchanged:

```bash
python main.py ingest path/to/document.pdf
python main.py query "What is the candidate's most recent role?"
```

This writes to a persistent on-disk Chroma collection
(`VECTOR_DB_DIR` in `config.py`) — separate from the API's ephemeral,
in-memory-per-run collections, so the two don't interfere with each other.

## Verifying without installing the real dependencies

`verification/` contains an offline check harness — stubs for the heavy
dependencies (langchain, chromadb, etc.) real enough to exercise `api.py`'s
actual logic end to end, including the LLM-failure resilience path. See
`verification/README.md`. Not a substitute for testing against the real
stack, but useful with no network access or as a fast pre-PR sanity check.

## Module map

| Module | Responsibility |
|---|---|
| `src/pdf_loader.py` | PDF → per-page markdown |
| `src/chunker.py` | whitespace cleaning + chunking |
| `src/vector_store.py` | embeddings + Chroma storage/retrieval |
| `src/retriever.py` | the real `ANSWER_PROMPT` + answer generation |
| `src/llm.py` | provider factory (`ollama` / `anthropic`) |
| `src/trace.py` | captures every stage's real output + flags + durations — read this one first if you're extending the API |
| `src/textdiff.py` | the Clean stage's character-level diff |
| `src/viz.py` | PCA projection for the Embed stage's 2D map |
| `api.py` | HTTP layer — calls the above, serializes to the frontend's contract |

## What changed from the Streamlit version

`streamlit_app.py` and `ui_theme.py` have been removed from this repo — the
frontend in `../frontend` replaces that UI entirely, talking to this backend
over HTTP instead of running in-process with Streamlit. `main.py`'s CLI is
unaffected.
