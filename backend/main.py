"""
CLI for pdf-qa-bot.

Usage:
    python main.py ingest path/to/document.pdf
    python main.py query "What is the candidate's most recent role?"
"""

import argparse

from src import chunk_data, get_vector_db_obj, parse_pdf, pre_process, query_rag_system, store_db
from src.llm import get_llm


def ingest(pdf_path: str) -> None:
    print(f"Parsing {pdf_path} ...")
    raw_pages = parse_pdf(pdf_path)
    documents = pre_process(raw_pages)
    chunks = chunk_data(documents)
    print(f"Created {len(chunks)} chunks. Embedding and storing...")
    store_db(chunks)
    print("Done. Vector store updated.")


def query(question: str) -> None:
    db = get_vector_db_obj()
    llm = get_llm()
    answer = query_rag_system(db=db, llm=llm, user_question=question)
    print(answer)

# def main():
#     print("Hello test!")

def main() -> None:
    parser = argparse.ArgumentParser(description="PDF Q&A bot (local RAG pipeline)")
    subparsers = parser.add_subparsers(dest="command", required=True)

    ingest_parser = subparsers.add_parser("ingest", help="Parse, chunk, and embed a PDF")
    ingest_parser.add_argument("pdf_path", help="Path to the PDF file")

    query_parser = subparsers.add_parser("query", help="Ask a question against the ingested PDF(s)")
    query_parser.add_argument("question", help="Question to ask")

    args = parser.parse_args()

    if args.command == "ingest":
        ingest(args.pdf_path)
    elif args.command == "query":
        query(args.question)


if __name__ == "__main__":
    main()
