# Offline backend verification

Not part of the app — nothing under `../` imports this folder. It exists so
`api.py` (and the `src/` modules it calls) can be sanity-checked without
installing the real heavy dependencies (langchain, chromadb, sentence
transformers, an actual Ollama install) — useful in any environment without
network access to pip, or just for a fast pre-PR check.

`stubs/` hand-declares minimal, behaviorally-real stand-ins for `fastapi`,
`langchain_core`, `langchain_chroma`, `langchain_huggingface`,
`langchain_ollama`, `langchain_text_splitters`, and `pymupdf4llm` — real
enough that chunking actually chunks, retrieval actually scores and ranks,
and prompt templating actually substitutes `{context}`/`{question}`. It is
deliberately not a byte-for-byte reproduction of any of those libraries —
only `sklearn`/`numpy` (used by `src/viz.py`'s PCA projection) run for real,
since they happened to already be available.

## Running it

```bash
cd backend/verification
python3 run_check.py
python3 run_check_llm_failure.py
```

`run_check.py` exercises the full happy path end to end: upload → ask a real
question → force an abstain via an impossible threshold → rebuild chunks
mid-session (with the standing question re-answered automatically) →
rebuild retrieval parameters → `get_run`/`list_documents`.

`run_check_llm_failure.py` specifically verifies the resilience path: if the
configured LLM call fails (Ollama not running, wrong model name, etc.),
parse/clean/chunk/embed/retrieve/prompt all still return real, complete
data, and only the `generate` stage reports a real error with a suggested
next step — never a crash of the whole request.

A clean run of either script ends with `ALL CHECKS PASSED` and exits 0.

## This does not replace the real thing

Once you can install the real dependencies:

```bash
pip install -e ..
uvicorn api:app --reload --port 8000
```

and test against `../../frontend` for real — see the root `TESTING.md`'s
Part B. This harness catches real logic bugs but can't catch, for
example, an actual Chroma version incompatibility or a real Ollama
connection quirk.
