"""Word-level diff rendering for the Clean and tag stage."""

import difflib
import html

# Cleaning only ever removes text in this pipeline (see src/chunker.py's
# clean_markdown) - these are the exact, only rules applied, listed here so
# the UI can show them next to the diff instead of leaving them implicit.
CLEANING_RULES = [
    "Strip trailing whitespace at the end of each line",
    "Collapse 3+ consecutive blank lines down to a single blank line",
    "Strip leading/trailing whitespace from the whole page",
]


def diff_html(before: str, after: str) -> str:
    """
    Render a character-level diff as HTML: removed characters struck through
    in red, added characters highlighted in green, unchanged text plain.
    Character-level (not word-level) matters here specifically because this
    pipeline's cleaning only touches whitespace/newlines - a word-level diff
    would blur exactly which whitespace got removed. In practice this will
    read mostly as strikethroughs with no green counterpart, since cleaning
    only removes text - that's expected, not a bug.
    """
    matcher = difflib.SequenceMatcher(None, before, after)

    parts = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            parts.append(html.escape(before[i1:i2]))
        else:
            if i1 != i2:
                removed = html.escape(before[i1:i2])
                parts.append(
                    f"<span style='background:#F5C4B3;color:#4A1B0C;text-decoration:line-through;'>{removed}</span>"
                )
            if j1 != j2:
                added = html.escape(after[j1:j2])
                parts.append(f"<span style='background:#9FE1CB;color:#04342C;'>{added}</span>")
    return "".join(parts)
