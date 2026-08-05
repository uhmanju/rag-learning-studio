"""
LLM provider factory.

Everything else in the pipeline (retriever.py, main.py) just calls get_llm()
and gets back a LangChain chat model - it never needs to know or care whether
that's a local Ollama model or a hosted Anthropic model. To switch providers,
change config.LLM_PROVIDER; nothing else needs to change.
"""

from config import (
    ANTHROPIC_MODEL_NAME,
    ANTHROPIC_TEMPERATURE,
    LLM_PROVIDER,
    OLLAMA_MODEL_NAME,
    OLLAMA_TEMPERATURE,
)


def get_llm():
    """Return a chat model instance based on config.LLM_PROVIDER."""
    if LLM_PROVIDER == "ollama":
        # Requires the Ollama app/service running locally and the model pulled
        # (`ollama pull llama3.2`). langchain_ollama just talks to that local server.
        from langchain_ollama import ChatOllama

        return ChatOllama(model=OLLAMA_MODEL_NAME, temperature=OLLAMA_TEMPERATURE)

    # if LLM_PROVIDER == "anthropic":
    #     # Requires `pip install -e ".[anthropic]"` and an ANTHROPIC_API_KEY env var.
    #     from langchain_anthropic import ChatAnthropic

    #     return ChatAnthropic(model=ANTHROPIC_MODEL_NAME, temperature=ANTHROPIC_TEMPERATURE)

    raise ValueError(
        f"Unknown LLM_PROVIDER '{LLM_PROVIDER}' in config.py. Expected 'ollama' or 'anthropic'."
    )
