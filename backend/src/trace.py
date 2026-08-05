"""
Captures every intermediate artifact the pipeline already produces on its way
from a PDF to an answer - nothing here adds new computation, it just keeps
what run_pipeline() would otherwise discard, so a UI can show "here's what
the data looked like at each stage" rather than only the final answer.

Split into two phases so a PDF only ever gets parsed/chunked/embedded once,
no matter how many questions get asked against it:

    trace, db = build_ingestion_trace("data/handbook.pdf")
    add_query_to_trace(trace, db, "What is the notice period?")
    add_query_to_trace(trace, db, "What about health insurance?")  # reuses db, no re-ingestion
"""

import re
import time
from dataclasses import dataclass, field
from typing import Any

from config import CHUNK_OVERLAP, CHUNK_SIZE, MAX_DISTANCE, RETRIEVAL_K
from src.chunker import chunk_data, pre_process
from src.pdf_loader import parse_pdf
from src.retriever import ANSWER_PROMPT, format_docs
from src.vector_store import embed_texts, store_db


@dataclass
class StageSnapshot:
    stage: str                       # short id: "parse", "clean", "chunk", ...
    summary: str                     # one-line human summary, for a stage rail/list
    data: Any                        # the actual objects produced at this stage
    flags: list[str] = field(default_factory=list)
    duration_s: float | None = None


@dataclass
class PipelineTrace:
    question: str = ""
    question_vector: list[float] | None = None
    snapshots: list[StageSnapshot] = field(default_factory=list)

    def get(self, stage: str) -> StageSnapshot | None:
        return next((s for s in self.snapshots if s.stage == stage), None)


# --------------------------------------------------------------------------
# Flag detectors - small, targeted checks per stage. Each returns a list of
# human-readable strings; empty list means nothing notable was found.
# --------------------------------------------------------------------------

def flag_parse(pages: list[dict]) -> list[str]:
    flags = []
    for page in pages:
        page_num = page.get("metadata", {}).get("page_number", "?")
        text_len = len(page.get("text", "").strip())
        if text_len < 30:
            flags.append(
                f"Page {page_num}: only {text_len} characters extracted - "
                "likely a scanned page or image-heavy content the parser can't read as text."
            )
    return flags


def flag_clean(raw_pages: list[dict], cleaned_docs: list) -> list[str]:
    flags = []
    for page, doc in zip(raw_pages, cleaned_docs):
        raw_len = len(page.get("text", ""))
        clean_len = len(doc.page_content)
        if raw_len > 0 and (raw_len - clean_len) / raw_len > 0.2:
            page_num = doc.metadata.get("page", "?")
            pct = round((raw_len - clean_len) / raw_len * 100)
            flags.append(
                f"Page {page_num}: cleanup removed {pct}% of the text - "
                "worth spot-checking that only whitespace/noise was stripped, not real content."
            )
    return flags


def flag_chunks(chunks: list) -> list[str]:
    flags = []
    sentence_enders = (".", "!", "?", '"', "'")
    dangling_lead_ins = ("as follows:", "the following:", "including:", "such as:")
    list_item_pattern = re.compile(r"^[-*•]|\d+[.)]\s")

    for i, chunk in enumerate(chunks):
        text = chunk.page_content.strip()
        if len(text) < 50:
            flags.append(f"Chunk {i}: only {len(text)} characters - may be too short to give the LLM useful context.")
        if text and not text.endswith(sentence_enders):
            flags.append(
                f"Chunk {i}: doesn't end at a sentence boundary - the thought likely continues in the "
                "next chunk from this page, but chunks don't track that link explicitly."
            )

        same_page_next = (
            i + 1 < len(chunks) and chunks[i + 1].metadata.get("page") == chunk.metadata.get("page")
        )

        # Boundary risk: chunk ends on an introductory phrase with nothing after it.
        # Nothing here is missing character-for-character - the risk is that the
        # content this phrase introduces lands in a different chunk than the phrase
        # itself, so retrieving only one gives an incomplete picture.
        lowered = text.lower()
        if lowered.endswith(dangling_lead_ins) or (text.endswith(":") and len(text) < 200):
            flags.append(
                f'Chunk {i}: ends on an introductory phrase ("...{text[-40:]}") with nothing after it - '
                + ("the content it introduces is in the next chunk, so they may not be retrieved together."
                   if same_page_next else
                   "and the content it introduces may be on a different page entirely.")
            )

        # Boundary risk: a list gets split between this chunk and the next.
        if same_page_next and text:
            next_text = chunks[i + 1].page_content.strip()
            this_ends_in_list = bool(list_item_pattern.match(text.splitlines()[-1].strip()))
            next_starts_in_list = bool(next_text and list_item_pattern.match(next_text.splitlines()[0].strip()))
            if this_ends_in_list and next_starts_in_list:
                flags.append(
                    f"Chunk {i} and chunk {i + 1}: a list is split across this boundary - retrieving only "
                    "one gives a partial list with no indication items are missing."
                )

    return flags


def flag_retrieval(results: list[tuple], max_distance: float) -> list[str]:
    flags = []
    dropped = [(doc, score) for doc, score in results if score > max_distance]
    for doc, score in dropped:
        page = doc.metadata.get("page", "?")
        flags.append(
            f"Page {page} chunk dropped: distance {score:.2f} exceeds the {max_distance} threshold - "
            "too dissimilar to the question to be trusted as context."
        )
    if dropped and len(dropped) == len(results):
        flags.append("Every candidate was dropped - the system will abstain rather than guess.")
    return flags


def flag_generation(answer: str) -> list[str]:
    if "don't know" in answer.lower():
        return ["The system abstained - no chunk was similar enough to confidently answer from."]
    return []


# --------------------------------------------------------------------------
# Ingestion (runs once per PDF)
# --------------------------------------------------------------------------

def build_ingestion_trace(
    pdf_path: str,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
):
    """
    Run parse -> clean -> chunk -> embed -> store once for a PDF, independent
    of any question. Returns (trace, db); pass both into add_query_to_trace()
    for every question asked, so a PDF never gets re-parsed/re-chunked/
    re-embedded just because a new question was asked.

    chunk_size/chunk_overlap default to config.py's values but can be
    overridden per call (see src/chunker.py). Storage is ephemeral
    (in-memory only, not persisted to disk) precisely because a caller like
    the HTTP API may call this repeatedly for the same document with
    different chunk parameters - each call gets an independent, disposable
    vector store rather than accumulating stale collections on disk.
    """
    trace = PipelineTrace()

    t0 = time.perf_counter()
    raw_pages = parse_pdf(pdf_path)
    trace.snapshots.append(StageSnapshot(
        stage="parse",
        summary=f"Extracted {len(raw_pages)} page(s) of markdown from the PDF.",
        data=raw_pages,
        flags=flag_parse(raw_pages),
        duration_s=time.perf_counter() - t0,
    ))

    t0 = time.perf_counter()
    cleaned_docs = pre_process(raw_pages)
    trace.snapshots.append(StageSnapshot(
        stage="clean",
        summary=f"Cleaned text and tagged {len(cleaned_docs)} page(s) with page numbers.",
        data=cleaned_docs,
        flags=flag_clean(raw_pages, cleaned_docs),
        duration_s=time.perf_counter() - t0,
    ))

    t0 = time.perf_counter()
    chunks = chunk_data(cleaned_docs, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    trace.snapshots.append(StageSnapshot(
        stage="chunk",
        summary=f"Split into {len(chunks)} chunk(s).",
        data=chunks,
        flags=flag_chunks(chunks),
        duration_s=time.perf_counter() - t0,
    ))

    # Embed (captured separately from Chroma's internal embedding purely for
    # visibility) and store - both one-time costs, reused for every question.
    t0 = time.perf_counter()
    vectors = embed_texts([c.page_content for c in chunks])
    db = store_db(chunks, persist_directory=None)
    trace.snapshots.append(StageSnapshot(
        stage="embed",
        summary=f"Embedded {len(vectors)} chunk(s) into {len(vectors[0])}-dimensional vectors and stored them.",
        data={"chunks": chunks, "vectors": vectors, "question_vector": None},
        flags=[],
        duration_s=time.perf_counter() - t0,
    ))

    return trace, db


# --------------------------------------------------------------------------
# Query (runs once per question, against an already-ingested trace/db)
# --------------------------------------------------------------------------

def _dedupe_candidates(results: list[tuple]) -> list[tuple]:
    """
    Remove duplicate (Document, score) pairs before they ever reach a
    display or a prompt - by identical chunk text, keeping whichever
    occurrence scored best. Without this, near-duplicate chunk content
    (e.g. from overlapping chunk boundaries retrieving on both sides of an
    overlap) can surface as repeated "Source" blocks in the prompt and
    repeated chunks/pages in the UI - confusing, and wasted context budget.
    Order (by score) is preserved.
    """
    seen: set[str] = set()
    deduped = []
    for doc, score in results:
        key = doc.page_content.strip()
        if key in seen:
            continue
        seen.add(key)
        deduped.append((doc, score))
    return deduped


def add_query_to_trace(
    trace: PipelineTrace,
    db,
    question: str,
    llm=None,
    k: int = RETRIEVAL_K,
    max_distance: float = MAX_DISTANCE,
) -> None:
    """
    Run retrieve (+ optional generate) for a question against an
    already-ingested trace/db, replacing any previous question's retrieve/
    generate snapshots. Does not touch parse/clean/chunk/embed - that's what
    makes asking a second question fast.

    k/max_distance default to config.py's values but can be overridden per
    call, so a caller (e.g. the HTTP API) can re-run retrieval with a
    different top-k or threshold without touching chunking/embedding.
    """
    trace.question = question
    trace.snapshots = [s for s in trace.snapshots if s.stage not in ("retrieve", "generate")]

    question_vector = embed_texts([question])[0]
    trace.question_vector = question_vector
    trace.get("embed").data["question_vector"] = question_vector

    t0 = time.perf_counter()
    raw_results = db.similarity_search_with_score(question, k=k)
    results = _dedupe_candidates(raw_results)
    trace.snapshots.append(StageSnapshot(
        stage="retrieve",
        summary=f"Retrieved top {len(results)} candidate(s) for the question.",
        data=results,
        flags=flag_retrieval(results, max_distance),
        duration_s=time.perf_counter() - t0,
    ))

    if llm is not None:
        filtered = [(doc, score) for doc, score in results if score <= max_distance]
        context = format_docs(filtered) if filtered else ""
        t0 = time.perf_counter()
        if not filtered:
            answer = "I don't know based on the provided context."
        else:
            messages = ANSWER_PROMPT.invoke({"context": context, "question": question})
            answer = llm.invoke(messages).content
        trace.snapshots.append(StageSnapshot(
            stage="generate",
            summary="Generated the final answer from the filtered context.",
            data={"prompt_context": context, "answer": answer},
            flags=flag_generation(answer),
            duration_s=time.perf_counter() - t0,
        ))
