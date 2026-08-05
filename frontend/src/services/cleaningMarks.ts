export type CleanMarkSegment =
  | { type: "text"; text: string }
  | { type: "ws-mark" }
  | { type: "blank-note"; count: number };

// Private-use sentinel codepoints — guaranteed never to appear in real
// document text, used to thread mark locations through the exact same
// regex the real cleaning rule uses, rather than hand-counting blank-line
// boundaries ourselves (an earlier version of this function did that and
// was off by one whenever a blank run immediately followed a content
// line — verified and fixed against real sample data; see CHANGELOG).
const WS_SENTINEL = "\uE000WS\uE000";
const blankSentinel = (n: number) => `\uE000BLANK${n}\uE000`;
const SENTINEL_RE = /\uE000WS\uE000|\uE000BLANK(\d+)\uE000/g;

/**
 * Walks real raw text and applies the real cleaning rule (strip trailing
 * whitespace per line, collapse 3+ blank lines to 1), producing subtle
 * inline marks exactly where each real change happened — computed
 * directly from this transformation, not diffed after the fact, so marks
 * can never drift out of sync with what actually changed.
 *
 * Deliberately not a Git-style diff: no removed/added text shown, no +/-
 * indicators — the approved design explicitly rejected that in favor of
 * a document that still reads naturally, with small marks a reader can
 * notice without them dominating the page.
 */
export function markCleaningChanges(raw: string): { segments: CleanMarkSegment[]; anyChange: boolean } {
  let anyChange = false;

  const markedLines = raw.split("\n").map((line) => {
    if (/[ \t]+$/.test(line)) {
      anyChange = true;
      return line.replace(/[ \t]+$/, "") + WS_SENTINEL;
    }
    return line;
  });

  let markedText = markedLines.join("\n");
  markedText = markedText.replace(/\n{3,}/g, (match) => {
    anyChange = true;
    return blankSentinel(match.length - 1);
  });

  const segments: CleanMarkSegment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  SENTINEL_RE.lastIndex = 0;
  while ((m = SENTINEL_RE.exec(markedText)) !== null) {
    if (m.index > lastIndex) segments.push({ type: "text", text: markedText.slice(lastIndex, m.index) });
    if (m[0].includes("WS")) {
      segments.push({ type: "ws-mark" });
    } else {
      segments.push({ type: "blank-note", count: Number(m[1]) });
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < markedText.length) segments.push({ type: "text", text: markedText.slice(lastIndex) });

  return { segments, anyChange };
}
