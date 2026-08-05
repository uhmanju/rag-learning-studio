"""Load a PDF and convert it into page-level markdown chunks."""

import pymupdf4llm


def parse_pdf(filepath: str) -> list[dict]:
    """
    Parse a PDF into a list of per-page dicts.

    Each dict looks like: {"text": "<markdown for the page>", "metadata": {...}}
    """
    pages = pymupdf4llm.to_markdown(
        filepath,
        page_chunks=True,
        write_images=False,
        embed_images=False,
    )
    return pages
