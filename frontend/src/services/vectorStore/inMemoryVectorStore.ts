export interface VectorStoreEntry {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorStoreMatch {
  id: string;
  /** Cosine similarity, always in [-1, 1] — higher is better, matching
   *  how most real vector-store client libraries report it, and
   *  distinctly labeled as "similarity" (never "distance") since the
   *  math genuinely is a similarity measure here, not a distance one. */
  similarity: number;
  metadata?: Record<string, unknown>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * A real, in-browser vector store — brute-force cosine similarity over an
 * array. No approximate-nearest-neighbor indexing (no need at the chunk
 * counts this app deals with; a real production vector database would
 * add one at scale, not for correctness). Exists specifically to make
 * Demo Mode's "In-memory Vector Store" pipeline stage a genuine stage
 * doing genuine work, not a label with nothing behind it.
 */
export class InMemoryVectorStore {
  private entries: VectorStoreEntry[] = [];

  clear(): void {
    this.entries = [];
  }

  add(entries: VectorStoreEntry[]): void {
    this.entries.push(...entries);
  }

  get size(): number {
    return this.entries.length;
  }

  /** Returns every entry's similarity to the query vector, sorted best
   *  first — callers apply their own top-k/threshold, matching how the
   *  real backend's retrieval trace also returns every candidate before
   *  the UI/threshold decides what's "kept" (see backend/src/trace.py). */
  search(queryVector: number[], topK?: number): VectorStoreMatch[] {
    const scored = this.entries.map((entry) => ({
      id: entry.id,
      similarity: cosineSimilarity(queryVector, entry.vector),
      metadata: entry.metadata,
    }));
    scored.sort((a, b) => b.similarity - a.similarity);
    return topK ? scored.slice(0, topK) : scored;
  }
}
