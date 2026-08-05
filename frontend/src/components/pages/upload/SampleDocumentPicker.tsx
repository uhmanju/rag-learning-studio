import { useState } from "react";
import { listSampleDocumentOptions, getMockSampleDocumentId, setMockSampleDocument } from "@/services/mockPipelineDataSource";

interface Props {
  isLoading: boolean;
  /** Called once the sample is selected and its real PDF (if fetchable)
   *  has been turned into a File — null if the fetch failed, so the
   *  caller can still proceed with text-only fallback. */
  onSelect: (file: File | null) => void;
}

/**
 * Caches each sample's fetched PDF as a File, keyed by doc id. Two
 * distinct wins from this, not just one:
 *
 * 1. Re-selecting a sample you've already loaded this session skips the
 *    network fetch entirely (previously: a fresh fetch + blob decode on
 *    every single click, even for the exact same file).
 * 2. It keeps the SAME File object instance across re-selections.
 *    PdfPageViewer's own document cache (see PdfPageViewer.tsx) is keyed
 *    by File identity via a WeakMap — a fresh `new File(...)` on every
 *    pick, even with byte-identical content, was a cache miss every
 *    time, forcing pdf.js to re-parse the whole document from scratch on
 *    every visit to Parse. A stable File instance per sample makes that
 *    cache actually work.
 *
 * Module-level (not component state) on purpose: these are static
 * bundled assets that never change during a session, and the cache
 * should survive this component unmounting/remounting (e.g. navigating
 * away from Upload and back).
 */
const sampleFileCache = new Map<string, File>();

const DIFFICULTY_STYLES: Record<string, string> = {
  clean: "bg-[#EAF7EE] text-[#15803D] border-[#BFE8CC]",
  moderate: "bg-[#FFF7E6] text-[#8A6A16] border-[#EFDFB0]",
  challenging: "bg-[#FCE8E9] text-[#8A2A2E] border-[#E8B4B7]",
};
const DIFFICULTY_LABELS: Record<string, string> = {
  clean: "Clean",
  moderate: "Moderate",
  challenging: "Challenging",
};

export function SampleDocumentPicker({ isLoading, onSelect }: Props) {
  const options = listSampleDocumentOptions();
  const [selectedId, setSelectedId] = useState(getMockSampleDocumentId());
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  const handlePick = async (doc: (typeof options)[number]) => {
    setSelectedId(doc.id);
    setMockSampleDocument(doc.id);

    const cached = sampleFileCache.get(doc.id);
    if (cached) {
      onSelect(cached);
      return;
    }

    setFetchingId(doc.id);
    let file: File | null = null;
    if (doc.pdfUrl) {
      try {
        const res = await fetch(doc.pdfUrl);
        const blob = await res.blob();
        file = new File([blob], `${doc.name}.pdf`, { type: "application/pdf" });
        sampleFileCache.set(doc.id, file);
      } catch {
        file = null; // fall back to text-only view — Parse handles this honestly
      }
    }
    setFetchingId(null);
    onSelect(file);
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="m-0 mb-1 text-[15px] font-semibold">Demo Mode — pick a sample document</h3>
        <p className="m-0 text-[12.5px] text-text-dim">
          No backend needed. Each document is a real PDF, chosen to demonstrate different pipeline and retrieval
          behavior — switch anytime.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {options.map((doc) => (
          <button
            key={doc.id}
            type="button"
            disabled={isLoading || fetchingId !== null}
            onClick={() => handlePick(doc)}
            className={`rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              doc.id === selectedId ? "border-accent-border bg-bg-elevated" : "border-border bg-bg-panel hover:bg-bg-hover"
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="text-2xl">{doc.icon}</div>
              <span className={`flex-none rounded-[5px] border px-[7px] py-px text-[10px] font-bold ${DIFFICULTY_STYLES[doc.difficulty]}`}>
                {DIFFICULTY_LABELS[doc.difficulty]}
              </span>
            </div>
            <div className="mb-1 text-[13px] font-semibold">{doc.name}</div>
            <div className="mb-2 text-[11.5px] leading-relaxed text-text-muted">{doc.description}</div>
            <div className="mb-2 text-[11px] leading-relaxed text-text-dim">{doc.difficultyNote}</div>
            <div className="flex flex-wrap gap-1">
              {doc.teaches.slice(0, 3).map((t) => (
                <span key={t} className="rounded-[5px] border border-border-soft bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                  {t}
                </span>
              ))}
            </div>
            {fetchingId === doc.id && <div className="mt-2 text-[10.5px] text-text-dim">Loading PDF…</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
