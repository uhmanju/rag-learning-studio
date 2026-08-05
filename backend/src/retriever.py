"""Retrieve relevant chunks and answer a question with grounded citations."""

from langchain_core.prompts import ChatPromptTemplate

from config import MAX_DISTANCE, RETRIEVAL_K

ANSWER_PROMPT = ChatPromptTemplate.from_template(
    """
    You are an expert document question-answering assistant.

    Answer ONLY from the supplied context.

    Guidelines:
    - Understand the user's intent before answering.
    - Provide a complete answer that includes all relevant information from the retrieved context.
    - Do not answer with only a name, title, or single sentence when additional relevant details are available.
    - Synthesize information from multiple retrieved sources into a coherent response.
    - Preserve names, dates, numbers, technologies, organizations and locations exactly as written.
    - Never use outside knowledge. Never invent information.
    - If the context does not contain the answer, reply exactly:
    "I don't know based on the provided context."

    After your answer, include a Sources section listing the page numbers that support your answer.

    Response format:

    Answer:
    <detailed answer>

    Sources:
    - Page X
    - Page Y

    Context:
    {context}

    Question:
    {question}

    Answer:
    """
)


def format_docs(results: list[tuple]) -> str:
    """Format (Document, score) pairs retrieved from Chroma into prompt context."""
    context = []
    for i, (doc, _) in enumerate(results, start=1):
        page = doc.metadata.get("page", "Unknown")
        source = doc.metadata.get("source", "Document")
        context.append(
            f"### Source {i}\n\nDocument: {source}\nPage: {page}\n\nContent:\n{doc.page_content}"
        )
    return "\n\n".join(context)


def query_rag_system(db, llm, user_question: str) -> str:
    """
    Retrieve the top-k chunks for a question, filter out weak matches, and
    ask the LLM to answer strictly from that context.
    """
    results = db.similarity_search_with_score(user_question, k=RETRIEVAL_K)

    filtered_results = [(doc, score) for doc, score in results if score <= MAX_DISTANCE]

    if not filtered_results:
        return "I don't know based on the provided context."

    context = format_docs(filtered_results)
    messages = ANSWER_PROMPT.invoke({"context": context, "question": user_question})
    response = llm.invoke(messages)

    return response.content
