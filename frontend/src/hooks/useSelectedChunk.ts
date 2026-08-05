import { useCallback, useState } from "react";
import type { ChunkId } from "@/types/pipeline";

/**
 * Cross-Stage Highlighting (spec item #10): selecting a chunk anywhere
 * (Chunk Explorer, Embedding Explorer, Retrieval Explorer, Prompt
 * Viewer, or an answer citation) should highlight that same chunk
 * everywhere else. This hook is the single source of truth for "which
 * chunk is currently selected," lifted to App so every stage component
 * reads and writes the same value.
 */
export function useSelectedChunk() {
  const [selectedChunkId, setSelectedChunkId] = useState<ChunkId | null>(null);

  const toggle = useCallback((id: ChunkId) => {
    setSelectedChunkId((current) => (current === id ? null : id));
  }, []);

  const clear = useCallback(() => setSelectedChunkId(null), []);

  return { selectedChunkId, toggle, clear };
}
