/**
 * A minimal, dependency-free recursive character splitter.
 *
 * This exists so mockPipelineDataSource can perform REAL chunk rebuilding
 * against real page text when a user drags the chunk-size/overlap
 * controls — "every parameter must produce a visible effect" only holds
 * if changing chunk size actually re-splits real text, rather than
 * looking up a canned answer for two or three preset sizes.
 *
 * It is intentionally simple and framework-agnostic: no dependency on
 * LangChain's RecursiveCharacterTextSplitter or any other library's
 * splitter. A production httpPipelineDataSource will most likely defer
 * this entirely to the backend (which may use a much more sophisticated
 * splitter) — this function is NOT meant to be "the" canonical splitter,
 * only a good-enough local stand-in for offline/demo use.
 */
export function splitText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const separators = ["\n\n", "\n", ". ", " ", ""];

  function splitOn(input: string, seps: string[]): string[] {
    if (input.length <= chunkSize) return input ? [input] : [];
    const [sep, ...rest] = seps;
    if (sep === undefined || sep === "") {
      const chunks: string[] = [];
      let start = 0;
      const step = Math.max(1, chunkSize - chunkOverlap);
      while (start < input.length) {
        chunks.push(input.slice(start, start + chunkSize));
        start += step;
      }
      return chunks;
    }
    const parts = input.split(sep);
    const chunks: string[] = [];
    let current = "";
    for (const part of parts) {
      const piece = current ? sep + part : part;
      if ((current + piece).length <= chunkSize) {
        current += piece;
      } else {
        if (current) chunks.push(current);
        if (part.length > chunkSize) {
          chunks.push(...splitOn(part, rest));
          current = "";
        } else {
          current = part;
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  const raw = splitOn(text, separators);

  // Apply overlap: prepend the tail of the previous chunk to each chunk
  // after the first, matching the "N characters shared with the previous
  // chunk" mental model shown in the Chunk Explorer.
  return raw.map((chunk, i) => {
    if (i === 0 || chunkOverlap <= 0) return chunk.trim();
    const prevTail = raw[i - 1]!.slice(-chunkOverlap);
    return (prevTail + chunk).trim();
  }).filter(Boolean);
}

/** Extremely rough token estimate (chars / 4) — good enough for UI display,
 *  explicitly NOT a substitute for a real tokenizer. Adapters talking to a
 *  real backend should prefer the backend's own token counts when available. */
export function estimateTokenCount(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}
