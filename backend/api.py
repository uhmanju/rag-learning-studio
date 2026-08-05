"""
HTTP API for the RAG pipeline, replacing the Streamlit app as the way a UI
talks to this backend.

Wraps src/trace.py's build_ingestion_trace()/add_query_to_trace() - nothing
in this file re-implements pipeline logic; it only calls those functions and
serializes their output into the JSON shape documented in the React
frontend's src/services/httpPipelineDataSource.ts.

Run it:
    pip install fastapi "uvicorn[standard]" python-multipart
    uvicorn api:app --reload --port 8000

Then point the frontend at it - see README.md's "Connecting a real backend"
section, or SETUP_HTTP_API.md in this repo for the full walkthrough.

Design notes (things a reviewer would otherwise have to reverse-engineer):

- One document per "run", one run per uploaded PDF. Everything is kept
  in-memory (RUNS dict) for the lifetime of this process - restart the
  server and every run is gone. That's intentional for a local dev/demo
  tool; if you need runs to survive a restart, that's a real feature to
  add deliberately, not an accidental gap.
- Each run's vector store is ephemeral/in-memory (see vector_store.py's
  persist_directory=None), so rebuilding chunks with a different chunk
  size never collides with a previous rebuild or bloats disk.
- Retrieval always returns ALL k candidates (kept and dropped), matching
  src/trace.py's own design and the frontend's "never hide dropped
  candidates" principle - filtering to just the kept ones happens only
  when building the prompt.
- Citations on a generated answer use a *degenerate* span (start=0, end=0)
  per contributing chunk rather than a fabricated character range - real
  LLM output here is abstractive prose, not extractive, so no precise
  span is actually knowable. The chunk/page linkage itself is real; the
  *position* within the answer text is honestly not claimed.
- If the LLM call fails (e.g. Ollama isn't running), every other stage
  still returns real, complete data - only the generate/evaluate stages
  report an error, with the actual exception message as the reason.
"""

from __future__ import annotations

import tempfile
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from config import EMBEDDING_MODEL_NAME, MAX_DISTANCE, RETRIEVAL_K
from src.llm import get_llm
from src.retriever import ANSWER_PROMPT, format_docs
from src.textdiff import CLEANING_RULES
from src.trace import PipelineTrace, add_query_to_trace, build_ingestion_trace, flag_generation
from src.viz import project_2d

app = FastAPI(title="RAG Anatomy API")

app.add_middleware(
    CORSMiddleware,
    # Local Vite dev server defaults. Add your own origin here if you're
    # running the frontend somewhere else.
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# In-memory run store
# ---------------------------------------------------------------------------

class Run:
    def __init__(self, run_id: str, filename: str, pdf_path: str):
        self.id = run_id
        self.filename = filename
        self.pdf_path = pdf_path
        self.uploaded_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self.trace: PipelineTrace | None = None
        self.db = None
        self.chunk_size = 500
        self.chunk_overlap = 100
        self.question: str | None = None
        self.top_k = RETRIEVAL_K
        self.threshold = MAX_DISTANCE
        self.generate_error: str | None = None


RUNS: dict[str, Run] = {}


def _get_run(run_id: str) -> Run:
    run = RUNS.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"No run with id {run_id}")
    return run


# ---------------------------------------------------------------------------
# Ingestion / rebuild
# ---------------------------------------------------------------------------

def _ingest(run: Run, chunk_size: int, chunk_overlap: int) -> None:
    # NOTE: this re-runs the *entire* pipeline, including re-parsing the PDF
    # from disk, every time - even when only chunk_size/chunk_overlap
    # changed. Correct, but wasteful for a large PDF or a slow parser: a
    # chunk-size rebuild only actually needs the already-parsed/cleaned
    # pages, not a fresh parse. Left simple for V1 on purpose; caching
    # run.trace's parse/clean snapshots and only re-running chunk/embed on
    # rebuild is a well-scoped future optimization, not a correctness fix.
    trace, db = build_ingestion_trace(run.pdf_path, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    run.trace = trace
    run.db = db
    run.chunk_size = chunk_size
    run.chunk_overlap = chunk_overlap
    run.generate_error = None
    # A chunk rebuild invalidates any previous retrieve/generate results for
    # THIS run, since they were computed against the old chunk boundaries -
    # re-run the last question against the new chunks if there was one,
    # exactly like dragging chunk size in the UI would expect.
    if run.question:
        _ask(run, run.question, run.top_k, run.threshold)


def _ask(run: Run, question: str, top_k: int, threshold: float) -> None:
    assert run.trace is not None and run.db is not None
    run.question = question
    run.top_k = top_k
    run.threshold = threshold
    run.generate_error = None

    add_query_to_trace(run.trace, run.db, question, llm=None, k=top_k, max_distance=threshold)

    retrieve_snapshot = run.trace.get("retrieve")
    results: list[tuple] = retrieve_snapshot.data
    kept = [(doc, score) for doc, score in results if score <= threshold]

    if not kept:
        answer = "I don't know based on the provided context."
        run.trace.snapshots.append(_make_generate_snapshot(prompt_context="", answer=answer, duration_s=0.0))
        return

    context = format_docs(kept)
    t0 = time.perf_counter()
    try:
        llm = get_llm()
        messages = ANSWER_PROMPT.invoke({"context": context, "question": question})
        answer = llm.invoke(messages).content
    except Exception as exc:  # Ollama not running, model not pulled, etc.
        run.generate_error = str(exc)
        return
    duration_s = time.perf_counter() - t0
    run.trace.snapshots.append(_make_generate_snapshot(prompt_context=context, answer=answer, duration_s=duration_s))


def _make_generate_snapshot(prompt_context: str, answer: str, duration_s: float):
    from src.trace import StageSnapshot

    return StageSnapshot(
        stage="generate",
        summary="Abstained - no context passed the threshold." if "don't know" in answer.lower() else "Generated the final answer from the filtered context.",
        data={"prompt_context": prompt_context, "answer": answer},
        flags=flag_generation(answer),
        duration_s=duration_s,
    )


# ---------------------------------------------------------------------------
# Serialization: PipelineTrace -> the frontend's PipelineRun JSON shape
# ---------------------------------------------------------------------------

_TEMPLATE_STR = ANSWER_PROMPT.messages[0].prompt.template
_CONTEXT_MARKER = "Context:\n    {context}"
_SYSTEM_PROMPT_TEXT = _TEMPLATE_STR.split(_CONTEXT_MARKER)[0].strip()


def _chunk_id(index: int) -> str:
    return f"chunk-{index}"


def _page_id(page_number: Any) -> str:
    return f"page-{page_number}"


def _content_to_chunk_id_map(chunks: list) -> dict[str, str]:
    # Best-effort: maps a chunk's exact text back to its id, for linking
    # retrieval results back to the chunk that produced them. If two chunks
    # have byte-identical text, the later one wins - a known, acceptable
    # limitation for a local dev tool, not a silent correctness bug that
    # would matter for anything actually being decided from this data.
    return {c.page_content: _chunk_id(i) for i, c in enumerate(chunks)}


def _stage_result(status: str, **kwargs) -> dict:
    result = {"status": status}
    result.update({k: v for k, v in kwargs.items() if v is not None})
    return result


def serialize_run(run: Run) -> dict:
    trace = run.trace
    assert trace is not None

    parse_snap = trace.get("parse")
    clean_snap = trace.get("clean")
    chunk_snap = trace.get("chunk")
    embed_snap = trace.get("embed")
    retrieve_snap = trace.get("retrieve")
    generate_snap = trace.get("generate")

    raw_pages: list[dict] = parse_snap.data
    cleaned_docs: list = clean_snap.data
    chunks: list = chunk_snap.data
    embed_data: dict = embed_snap.data

    # ---- parse ----
    parsed_pages = []
    for page in raw_pages:
        page_number = page.get("metadata", {}).get("page_number", "Unknown")
        text = page.get("text", "")
        low_confidence = len(text.strip()) < 30
        parsed_pages.append({
            "id": _page_id(page_number),
            "documentId": run.id,
            "pageNumber": page_number,
            "rawText": text,
            "extractedText": text,
            "extractionConfidence": 0.2 if low_confidence else 0.97,
            "flags": [{
                "code": "low_text_density",
                "severity": "warning",
                "message": f"Only {len(text.strip())} characters extracted - likely a scanned page or image-heavy content the parser can't read as text.",
            }] if low_confidence else None,
        })

    # ---- clean ----
    cleaned_pages = []
    for raw_page, doc in zip(raw_pages, cleaned_docs):
        raw_len = len(raw_page.get("text", ""))
        clean_len = len(doc.page_content)
        ratio = (raw_len - clean_len) / raw_len if raw_len > 0 else 0.0
        page_number = doc.metadata.get("page", "Unknown")
        cleaned_pages.append({
            "pageId": _page_id(page_number),
            "cleanedText": doc.page_content,
            "rulesApplied": CLEANING_RULES,
            "charsRemovedRatio": max(0.0, ratio),
            "flags": [{
                "code": "heavy_cleanup",
                "severity": "info",
                "message": f"Cleanup removed {round(ratio * 100)}% of this page's characters - worth a look.",
            }] if ratio > 0.2 else None,
        })

    # ---- chunk ----
    serialized_chunks = []
    for i, chunk in enumerate(chunks):
        text = chunk.page_content
        page_number = chunk.metadata.get("page", "Unknown")
        flags = []
        if len(text.strip()) < 50:
            flags.append({"code": "short_chunk", "severity": "warning", "message": "Under 50 characters - may be too short to give the model useful standalone context."})
        if text.strip() and not text.strip().endswith((".", "!", "?", '"', "'")):
            flags.append({"code": "boundary_risk", "severity": "warning", "message": "Doesn't end at a sentence boundary - the thought likely continues in the next chunk."})
        serialized_chunks.append({
            "id": _chunk_id(i),
            "documentId": run.id,
            "pageId": _page_id(page_number),
            "pageNumber": page_number,
            "index": i,
            "text": text,
            "charCount": len(text),
            "estimatedTokenCount": max(1, round(len(text) / 4)),
            "flags": flags or None,
        })

    # ---- embed ----
    vectors: list[list[float]] = embed_data["vectors"]
    question_vector = embed_data.get("question_vector")
    dims = len(vectors[0]) if vectors else 0
    norm_sample = sum(v * v for v in vectors[0]) ** 0.5 if vectors else 0.0
    normalized = abs(norm_sample - 1.0) < 0.05

    projection_input = list(vectors)
    if question_vector is not None:
        projection_input = projection_input + [question_vector]
    points = project_2d(projection_input) if projection_input else []

    embeddings = [{"chunkId": _chunk_id(i), "vector": [], "model": {"name": EMBEDDING_MODEL_NAME, "dimensions": dims, "normalized": normalized}, "createdAt": run.uploaded_at} for i in range(len(vectors))]
    projection = [{"chunkId": _chunk_id(i), "x": points[i][0], "y": points[i][1], "method": "PCA"} for i in range(len(vectors))] if points else []
    question_point = {"x": points[-1][0], "y": points[-1][1]} if question_vector is not None and points else None

    # ---- retrieve ----
    retrieval_result = None
    retrieve_result_stage = _stage_result("pending")
    if retrieve_snap is not None:
        content_to_id = _content_to_chunk_id_map(chunks)
        candidates = []
        for doc, score in retrieve_snap.data:
            page_number = doc.metadata.get("page", "Unknown")
            kept = score <= run.threshold
            candidates.append({
                "chunkId": content_to_id.get(doc.page_content, _chunk_id(-1)),
                "pageNumber": page_number,
                "score": score,
                "scoreDirection": "lower-is-better",
                "kept": kept,
                "matchExplanation": (
                    f"Distance {score:.2f} is within the {run.threshold} threshold."
                    if kept else
                    f"Distance {score:.2f} exceeds the {run.threshold} threshold - too dissimilar to trust as context."
                ),
            })
        retrieval_result = {"question": run.question, "candidates": candidates, "parameters": {"topK": run.top_k, "threshold": run.threshold}}
        any_kept = any(c["kept"] for c in candidates)
        if any_kept:
            retrieve_result_stage = _stage_result("done", summary=f"{sum(c['kept'] for c in candidates)} of {len(candidates)} candidates kept", data=retrieval_result, durationMs=retrieve_snap.duration_s * 1000)
        else:
            retrieve_result_stage = _stage_result(
                "failed",
                summary="No candidate cleared the threshold",
                reason="Nothing in this document scored close enough to the question to be trusted as context.",
                suggestedNextStep="Check whether the document actually covers this topic, or loosen the retrieval threshold.",
                data=retrieval_result,
                durationMs=retrieve_snap.duration_s * 1000,
            )

    # ---- prompt ----
    prompt_stage = _stage_result("pending")
    if retrieval_result is not None:
        kept_candidates = [c for c in retrieval_result["candidates"] if c["kept"]]
        content_to_id = _content_to_chunk_id_map(chunks)
        id_to_chunk = {c["id"]: c for c in serialized_chunks}
        sections = [{"kind": "system", "label": "System Prompt", "content": _SYSTEM_PROMPT_TEXT}]
        for cand in kept_candidates:
            chunk = id_to_chunk.get(cand["chunkId"])
            if chunk:
                sections.append({"kind": "context", "label": f"Page {chunk['pageNumber']}", "content": chunk["text"], "sourceChunkId": chunk["id"]})
        sections.append({"kind": "question", "label": "Question", "content": run.question or ""})
        if kept_candidates:
            context_str = "\n\n".join(f"### Source\n{id_to_chunk[c['chunkId']]['text']}" for c in kept_candidates if c["chunkId"] in id_to_chunk)
            final_prompt = ANSWER_PROMPT.invoke({"context": context_str, "question": run.question or ""}).to_string()
        else:
            final_prompt = _SYSTEM_PROMPT_TEXT + "\n\n(No context passed the threshold - nothing was sent as context.)\n\nQuestion:\n" + (run.question or "")
        prompt_stage = _stage_result("done", summary=f"{len(sections)} sections assembled", data={"sections": sections, "finalPrompt": final_prompt})

    # ---- generate ----
    generate_stage = _stage_result("pending")
    generation_result = None
    if run.generate_error:
        generate_stage = _stage_result("error", summary="Generation failed", reason=run.generate_error, suggestedNextStep="Check that your configured LLM provider (see config.py's LLM_PROVIDER) is running and reachable - e.g. `ollama serve` and the model pulled, if using Ollama.")
    elif generate_snap is not None:
        answer = generate_snap.data["answer"]
        abstained = answer.strip() == "I don't know based on the provided context."
        source_pages = sorted({c["pageNumber"] for c in retrieval_result["candidates"] if c["kept"]}) if retrieval_result else []
        citations = [] if abstained else [{"start": 0, "end": 0, "chunkId": c["chunkId"], "pageNumber": c["pageNumber"]} for c in retrieval_result["candidates"] if c["kept"]]
        generation_result = {"answer": answer, "abstained": abstained, "citations": citations, "sourcePages": source_pages}
        generate_stage = _stage_result("done", summary="Abstained - no supporting context" if abstained else f"Answered, citing page(s) {', '.join(map(str, source_pages))}", data=generation_result, durationMs=generate_snap.duration_s * 1000)

    # ---- evaluate ----
    evaluate_stage = _stage_result("pending")
    if generation_result is not None:
        kept_count = sum(1 for c in (retrieval_result["candidates"] if retrieval_result else []) if c["kept"])
        latency_breakdown = [
            {"stage": s.stage, "durationMs": s.duration_s * 1000}
            for s in trace.snapshots
            if s.stage in ("parse", "clean", "chunk", "embed", "retrieve", "generate") and s.duration_s is not None
        ]
        evaluate_stage = _stage_result("done", summary="Lightweight scorecard for this question", data={
            "metrics": [
                {"key": "faithfulness", "label": "Faithfulness", "value": 0, "explanation": "Does the answer only say things actually supported by the retrieved chunks?", "available": False},
                {"key": "answer_relevance", "label": "Answer Relevance", "value": 0, "explanation": "Does the answer actually address what was asked?", "available": False},
                {"key": "kept_candidates", "label": "Chunks Used", "value": kept_count, "explanation": "How many retrieved chunks cleared the threshold and were used as context.", "available": True},
            ],
            "latencyBreakdown": latency_breakdown,
            "totalLatencyMs": sum(item["durationMs"] for item in latency_breakdown),
        })

    return {
        "id": run.id,
        "document": {
            "id": run.id,
            "fileName": run.filename,
            "pageCount": len(raw_pages),
            "uploadedAt": run.uploaded_at,
        },
        "question": run.question,
        "stages": {
            "parse": _stage_result("done", summary=parse_snap.summary, data=parsed_pages, durationMs=parse_snap.duration_s * 1000),
            "clean": _stage_result("done", summary=clean_snap.summary, data=cleaned_pages, durationMs=clean_snap.duration_s * 1000),
            "chunk": _stage_result("done", summary=chunk_snap.summary, data={"chunks": serialized_chunks, "parameters": {"chunkSize": run.chunk_size, "chunkOverlap": run.chunk_overlap}}, durationMs=chunk_snap.duration_s * 1000),
            "embed": _stage_result("done", summary=embed_snap.summary, data={"embeddings": embeddings, "projection": projection, "model": {"name": EMBEDDING_MODEL_NAME, "dimensions": dims, "normalized": normalized}, "questionPoint": question_point}, durationMs=embed_snap.duration_s * 1000),
            "retrieve": retrieve_result_stage,
            "prompt": prompt_stage,
            "generate": generate_stage,
            "evaluate": evaluate_stage,
        },
    }


# ---------------------------------------------------------------------------
# Endpoints - see src/services/httpPipelineDataSource.ts in the frontend
# repo for the client side of this exact contract.
# ---------------------------------------------------------------------------

@app.post("/api/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)):
    suffix = Path(file.filename or "upload.pdf").suffix or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    run_id = str(uuid.uuid4())
    run = Run(run_id, filename=file.filename or "document.pdf", pdf_path=tmp_path)
    RUNS[run_id] = run
    try:
        _ingest(run, chunk_size=run.chunk_size, chunk_overlap=run.chunk_overlap)
    except Exception as exc:
        del RUNS[run_id]
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {exc}") from exc

    return {"run": serialize_run(run)}


@app.post("/api/runs/{run_id}/chunks")
async def rebuild_chunks(run_id: str, body: dict):
    run = _get_run(run_id)
    chunk_size = int(body["chunkSize"])
    chunk_overlap = int(body["chunkOverlap"])
    try:
        _ingest(run, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to rebuild chunks: {exc}") from exc
    return {"run": serialize_run(run)}


@app.post("/api/runs/{run_id}/questions")
async def ask_question(run_id: str, body: dict):
    run = _get_run(run_id)
    question = body["question"]
    top_k = int(body.get("topK") or run.top_k)
    threshold = float(body.get("threshold") or run.threshold)
    try:
        _ask(run, question, top_k, threshold)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to answer question: {exc}") from exc
    return {"run": serialize_run(run)}


@app.post("/api/runs/{run_id}/retrieval")
async def rebuild_retrieval(run_id: str, body: dict):
    run = _get_run(run_id)
    if not run.question:
        raise HTTPException(status_code=400, detail="Ask a question before rebuilding retrieval parameters.")
    top_k = int(body["topK"])
    threshold = float(body["threshold"])
    try:
        _ask(run, run.question, top_k, threshold)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to rebuild retrieval: {exc}") from exc
    return {"run": serialize_run(run)}


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    run = _get_run(run_id)
    return {"run": serialize_run(run)}


@app.get("/api/documents")
async def list_documents():
    return {"documentIds": list(RUNS.keys())}


@app.get("/api/health")
async def health():
    return {"status": "ok", "activeRuns": len(RUNS)}
