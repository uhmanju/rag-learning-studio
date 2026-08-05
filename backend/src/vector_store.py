"""Persist and load chunk embeddings via Chroma."""

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

from config import COLLECTION_NAME, EMBEDDING_MODEL_NAME, VECTOR_DB_DIR

_embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)


def store_db(
    chunks: list[Document],
    collection_name: str = COLLECTION_NAME,
    persist_directory: str | None = str(VECTOR_DB_DIR),
) -> Chroma:
    """Embed chunks and store them, returning the Chroma store.

    persist_directory defaults to the on-disk location the CLI has always
    used. Pass persist_directory=None for an ephemeral, in-memory-only
    collection - what the HTTP API (api.py) uses, since it may rebuild
    chunks repeatedly (e.g. dragging the chunk-size slider) and each
    rebuild should get its own clean collection rather than writing more
    files to disk or colliding with a previous run's data.
    """
    return Chroma.from_documents(
        documents=chunks,
        embedding=_embedding_model,
        collection_name=collection_name,
        persist_directory=persist_directory,
    )


def get_vector_db_obj() -> Chroma:
    """Load the existing persisted Chroma store."""
    return Chroma(
        persist_directory=str(VECTOR_DB_DIR),
        embedding_function=_embedding_model,
        collection_name=COLLECTION_NAME,
    )


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Return raw embedding vectors for a list of texts.

    Used by the trace/visualization layer to show what an embedding actually
    looks like (e.g. a 2D projection or the raw numbers) - separate from
    store_db(), which embeds internally as part of writing to Chroma.
    """
    return _embedding_model.embed_documents(texts)
