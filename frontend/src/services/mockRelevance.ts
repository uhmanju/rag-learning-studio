/**
 * Deterministic stand-ins for embedding + similarity search, used ONLY
 * by mockPipelineDataSource so the app is fully interactive with zero
 * backend connected. None of this is a real embedding model — it is a
 * term-overlap heuristic. httpPipelineDataSource never imports this file;
 * a real backend's actual embedding model and vector search replace it
 * entirely.
 */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
  "is", "was", "were", "are", "be", "this", "that", "it", "as", "at",
  "by", "from", "their", "they", "them", "what", "who", "does", "did",
  "has", "have", "had", "not", "no",
]);

function terms(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/** Jaccard-style term overlap, mapped onto a "distance" so 0 = identical
 *  wording, larger = less related — mirrors the shape of a real cosine
 *  distance without claiming to be one. */
export function mockDistance(a: string, b: string): number {
  const ta = terms(a);
  const tb = terms(b);
  if (ta.size === 0 || tb.size === 0) return 2;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const union = new Set([...ta, ...tb]).size;
  const similarity = union === 0 ? 0 : shared / union;
  // Map similarity [0..1] onto a distance-like range [~0.3..~2.0] so it
  // reads naturally next to a threshold like 1.6, matching what a real
  // cosine-distance-based retriever tends to produce in practice.
  return Number((2.0 - similarity * 1.9).toFixed(2));
}

/** A stable 2D layout for the Embedding Explorer's "for display only"
 *  semantic map. Chunks with more shared terms are nudged closer
 *  together; this is a toy force-layout, not a real dimensionality
 *  reduction of a real embedding space. */
export function mockProject2D(
  items: { id: string; text: string }[],
): Record<string, { x: number; y: number }> {
  const n = items.length;
  const positions: Record<string, { x: number; y: number }> = {};
  // start on a circle, seeded by index for stability across renders
  items.forEach((item, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, n);
    positions[item.id] = { x: Math.cos(angle) * 40, y: Math.sin(angle) * 40 };
  });
  // a few relaxation passes: pull similar pairs together, push all pairs apart a bit
  for (let pass = 0; pass < 60; pass++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = items[i]!;
        const b = items[j]!;
        const dist = mockDistance(a.text, b.text);
        const target = 15 + dist * 20;
        const pa = positions[a.id]!;
        const pb = positions[b.id]!;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const currentDist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const force = (currentDist - target) * 0.02;
        const ux = dx / currentDist;
        const uy = dy / currentDist;
        pa.x += ux * force;
        pa.y += uy * force;
        pb.x -= ux * force;
        pb.y -= uy * force;
      }
    }
  }
  return positions;
}

/** A short, seeded pseudo-vector purely for the "this becomes numbers"
 *  visual in EmbeddingExplorer's advanced view. Never used for scoring. */
export function mockVector(seed: string, dims: number): number[] {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 233280;
  const out: number[] = [];
  for (let i = 0; i < dims; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(Number(((s / 233280) * 2 - 1).toFixed(4)));
  }
  return out;
}
