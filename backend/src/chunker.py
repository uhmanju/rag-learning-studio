"""Turn raw parsed PDF pages into cleaned, chunked LangChain Documents."""

import re

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import CHUNK_OVERLAP, CHUNK_SIZE


def clean_markdown(text: str) -> str:
    """Strip trailing whitespace and collapse excessive blank lines."""
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def pre_process(pages: list[dict]) -> list[Document]:
    """Convert raw parsed pages into cleaned Document objects with page metadata."""
    return [
        Document(
            page_content=clean_markdown(page.get("text", "")),
            metadata={"page": page.get("metadata", {}).get("page_number", "Unknown")},
        )
        for page in pages
    ]


def chunk_data(
    documents: list[Document],
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> list[Document]:
    """Split documents into overlapping chunks sized for embedding/retrieval.

    chunk_size/chunk_overlap default to config.py's values but can be
    overridden per call - this is what lets the HTTP API (api.py) pass
    through parameters a caller supplied at request time, e.g. from the
    frontend's Chunk Explorer, without changing global config for every
    other caller in the process.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    return text_splitter.split_documents(documents)
