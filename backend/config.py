"""
Central configuration for pdf-qa-bot.

Keeping paths, model names, and tunable parameters here (instead of scattered
across modules) makes it easy to swap models, change chunking behavior, or
point the app at a different data/DB location - including from a future
Streamlit UI, which can simply import from this file.
"""

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
VECTOR_DB_DIR = ROOT_DIR / "vector_db"

# Embedding model (sentence-transformers, via HuggingFaceEmbeddings)
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# Vector store
COLLECTION_NAME = "pdf_chunks"

# LLM provider - "ollama" (local, free, private) or "anthropic" (hosted API, needs
# ANTHROPIC_API_KEY set as an env var). Swapping this one value is all that's needed;
# src/llm.py handles the rest, and nothing in retriever.py or main.py changes.
LLM_PROVIDER = "ollama"

# Ollama (local, served via `ollama serve` / the Ollama background app)
OLLAMA_MODEL_NAME = "llama3.2"
OLLAMA_TEMPERATURE = 0.0

# Anthropic (hosted API - pip install "pdf-qa-bot[anthropic]" and set ANTHROPIC_API_KEY)
ANTHROPIC_MODEL_NAME = "claude-sonnet-5"
ANTHROPIC_TEMPERATURE = 0.0

# Chunking
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

# Retrieval
RETRIEVAL_K = 5
# Chroma returns a distance score (lower = more similar). Chunks scoring above
# this are treated as irrelevant and dropped before hitting the LLM, so the
# system can say "I don't know" instead of answering from unrelated context.
MAX_DISTANCE = 1.6
