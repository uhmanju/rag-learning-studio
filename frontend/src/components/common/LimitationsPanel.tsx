import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangleIcon } from "@/components/common/icons";

export interface LimitationItem {
  heading: string;
  body: string;
}

export const LIMITATIONS: LimitationItem[] = [
  {
    heading: "No OCR — scanned PDFs won't parse",
    body: "The parser reads real text embedded in a PDF. A scanned or image-only page has no such text, so it parses to little or nothing. The \"Engineering Standards Manual\" sample includes a genuinely scanned page with real OCR noise (\"con figuration,\" \"rninimum\") — that's the actual output of an OCR pass, not this app's parser malfunctioning.",
  },
  {
    heading: "Simple parser — complex layouts may lose structure",
    body: "Multi-column layouts, figures, cross-references, and appendices outside the normal heading sequence may parse imperfectly or lose structure. The \"AI Testing & RAG Playbook\" sample is deliberately built with all of these, specifically to show it honestly rather than hide it.",
  },
  {
    heading: "One basic approach per stage — not the only way, and not necessarily the production way",
    body: "Each stage demonstrates a single, intentionally simple approach: one parser, basic whitespace cleaning, recursive chunking, and dense vector retrieval (no hybrid search or re-ranking). Real-world RAG systems often use multiple parsers, advanced cleaning, different chunking strategies, hybrid retrieval, re-ranking, and caching. This playground shows one clear reference implementation per stage to explain the concept—not the only or production-standard approach.",
  },
  {
    heading: "Evaluation scoring isn't built yet",
    body: "Faithfulness and Answer Relevance are marked \"coming soon\" on purpose rather than showing a fabricated number — real scoring is the next planned milestone.",
  },
  {
    heading: "Citations point to the source chunk, not an exact quote",
    body: "The model writes its own words based on a chunk — it doesn't copy an exact sentence out of it. So a citation shows which chunk was used, not the precise words from it.",
  },
  {
    heading: "Demo Mode's pipeline is real, but not the production stack",
    body: "Demo Mode's parsing/chunking/embedding logic runs genuinely in your browser, but isn't the identical production stack Local Mode's backend uses (no vector database, a lighter embedding approach). It's built to be honestly representative of each stage's shape, not numerically identical to Local Mode on the same document.",
  },
];

export const LIMITATIONS_SECTION_ID = "known-limitations";

/**
 * The full limitations content lives in exactly one place on the page —
 * the expanded panel on the Dashboard (variant="expanded"). The header
 * icon (variant="icon", shown on every page including Dashboard itself)
 * doesn't duplicate that content in a popover anymore; it just takes you
 * straight to it. On Dashboard, that's a scroll. Anywhere else, it's a
 * navigation to Dashboard followed by a scroll once it's mounted.
 */
export function LimitationsTrigger({ variant = "icon" }: { variant?: "icon" | "expanded" }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Handles the "navigate from another page, then scroll" half — once
  // Dashboard has mounted with the #known-limitations hash present.
  useEffect(() => {
    if (variant !== "expanded") return;
    if (location.hash === `#${LIMITATIONS_SECTION_ID}`) {
      document.getElementById(LIMITATIONS_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [variant, location.hash]);

  if (variant === "expanded") {
    return (
      <div id={LIMITATIONS_SECTION_ID} className="scroll-mt-4 rounded-lg border border-border bg-surface-2 p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangleIcon className="h-4 w-4 text-text-dim" />
          <span className="text-[13px] font-semibold text-text">Known limitations</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LIMITATIONS.map((l) => (
            <div key={l.heading}>
              <h5 className="m-0 mb-1 text-[11.5px] font-semibold text-text">{l.heading}</h5>
              <p className="m-0 text-[11.5px] leading-relaxed text-text-muted">{l.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const goToLimitations = () => {
    if (location.pathname === "/") {
      document.getElementById(LIMITATIONS_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate(`/#${LIMITATIONS_SECTION_ID}`);
    }
  };

  return (
    <button
      type="button"
      title="Known limitations — jump to the full list on the Dashboard"
      onClick={goToLimitations}
      className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-border-strong bg-bg-elevated text-text-muted hover:bg-bg-hover"
    >
      <AlertTriangleIcon className="h-4 w-4" />
    </button>
  );
}
