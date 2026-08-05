import { useEffect, useRef, type ReactNode } from "react";

export interface SyncedDocumentPage {
  pageNumber: number;
  leftContent: ReactNode;
  rightContent: ReactNode;
}

export interface SyncedDocumentViewProps {
  leftLabel: ReactNode;
  rightLabel: ReactNode;
  pages: SyncedDocumentPage[];
  rightVariant?: "text" | "markdown";
}

/**
 * The continuous, two-column, scroll-linked document view shared
 * identically by Parse and Clean. Ported 1:1 (scroll-sync logic
 * unchanged) from an earlier version of this frontend's
 * SyncedDocumentView — only the class names changed, to Tailwind
 * utilities matching the new mockups' `.synced-view` styles.
 */
export function SyncedDocumentView({ leftLabel, rightLabel, pages, rightVariant = "text" }: SyncedDocumentViewProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    let syncing = false;
    const sync = (from: HTMLDivElement, to: HTMLDivElement) => {
      if (syncing) return;
      syncing = true;
      const scrollable = from.scrollHeight - from.clientHeight;
      const ratio = scrollable > 0 ? from.scrollTop / scrollable : 0;
      to.scrollTop = ratio * (to.scrollHeight - to.clientHeight);
      syncing = false;
    };
    const onLeftScroll = () => sync(left, right);
    const onRightScroll = () => sync(right, left);
    left.addEventListener("scroll", onLeftScroll);
    right.addEventListener("scroll", onRightScroll);
    return () => {
      left.removeEventListener("scroll", onLeftScroll);
      right.removeEventListener("scroll", onRightScroll);
    };
  }, [pages]);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 overflow-hidden rounded-lg border border-border bg-bg-panel shadow-card">
      <div ref={leftRef} className="min-h-0 overflow-y-auto">
        <div className="sticky top-0 z-[2] border-b border-border bg-bg-panel px-[18px] py-[11px] text-xs font-semibold text-text-muted">
          {leftLabel}
        </div>
        <div className="whitespace-pre-wrap px-5 py-[18px] text-[13.5px] leading-[1.85] text-text">
          {pages.map((p) => (
            <div key={p.pageNumber}>
              <PageMarker n={p.pageNumber} />
              {p.leftContent}
            </div>
          ))}
        </div>
      </div>
      <div ref={rightRef} className="min-h-0 overflow-y-auto border-l border-border">
        <div className="sticky top-0 z-[2] border-b border-border bg-bg-panel px-[18px] py-[11px] text-xs font-semibold text-text-muted">
          {rightLabel}
        </div>
        <div
          className={`whitespace-pre-wrap px-5 py-[18px] text-[13.5px] leading-[1.85] text-text ${
            rightVariant === "markdown" ? "font-mono text-[12.5px]" : ""
          }`}
        >
          {pages.map((p) => (
            <div key={p.pageNumber}>
              <PageMarker n={p.pageNumber} />
              {p.rightContent}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PageMarker({ n }: { n: number }) {
  return (
    <div className="my-[22px] flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-dim first:mt-0 before:h-px before:flex-1 before:bg-border before:content-[''] after:h-px after:flex-1 after:bg-border after:content-['']">
      Page {n}
    </div>
  );
}
