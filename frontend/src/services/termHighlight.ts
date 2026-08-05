export interface HighlightSegment {
  text: string;
  match: boolean;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
  "is", "was", "were", "are", "be", "this", "that", "it", "as", "at",
  "by", "from", "their", "they", "them", "what", "who", "does", "did",
  "has", "have", "had", "not", "no", "how", "why", "when", "where",
]);

function questionTerms(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
    ),
  ];
}

/**
 * Finds a relevant window of `text` around the first place a question term
 * appears (falling back to the start of the text if nothing matches
 * literally — e.g. a semantic-only match with no shared words), and
 * returns it as alternating matched/unmatched segments for highlighting.
 * This is a literal word-overlap heuristic, not the real similarity
 * computation — it exists to make "why did this match" visible, not to
 * claim it's the actual scoring mechanism.
 */
export function highlightRelevantSnippet(question: string, text: string, windowSize = 240): { segments: HighlightSegment[]; hasLiteralMatch: boolean } {
  const terms = questionTerms(question);
  const lowerText = text.toLowerCase();

  let firstMatchIndex = -1;
  for (const term of terms) {
    const idx = lowerText.indexOf(term);
    if (idx !== -1 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
      firstMatchIndex = idx;
    }
  }

  const hasLiteralMatch = firstMatchIndex !== -1;
  const center = hasLiteralMatch ? firstMatchIndex : 0;
  const start = Math.max(0, center - Math.floor(windowSize / 3));
  const end = Math.min(text.length, start + windowSize);
  let windowText = text.slice(start, end);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  windowText = prefix + windowText + suffix;

  if (terms.length === 0) {
    return { segments: [{ text: windowText, match: false }], hasLiteralMatch: false };
  }

  // Build a regex matching any question term as a whole word, case-insensitive.
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(windowText)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: windowText.slice(lastIndex, match.index), match: false });
    }
    segments.push({ text: match[0], match: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < windowText.length) {
    segments.push({ text: windowText.slice(lastIndex), match: false });
  }

  return { segments, hasLiteralMatch };
}
