import { useState } from "react";

const STEPS = [
  "Upload a PDF (or pick a bundled sample)",
  "Watch it get parsed, cleaned, and split into chunks",
  "See each chunk turned into a vector, plotted in 2D",
  "Ask a question — watch retrieval pick the closest chunks",
  "See the exact prompt assembled from those chunks",
  "Get a real, grounded answer (or an honest \"I don't know\")",
];

/**
 * A short, skimmable "how do I actually use this" panel — deliberately
 * not a multi-step modal wizard. Those get built once, dismissed once,
 * and never opened again. This stays inline on the Dashboard, collapsed
 * by default, so it's there when someone wants it without being in
 * anyone's way otherwise.
 */
export function HowThisWorksPanel() {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[13px] font-semibold text-text">How this works</span>
        <span className="text-[11px] text-text-dim">{open ? "Show less ▾" : "Learn more ▸"}</span>
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <h5 className="m-0 mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-text-dim">The pipeline, in order</h5>
            <ol className="m-0 list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-text-muted">
              {STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <div>
            <h5 className="m-0 mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-text-dim">Demo vs. Local Mode</h5>
            <p className="m-0 text-[12px] leading-relaxed text-text-muted">
              <b className="text-text">Demo</b> runs entirely in your browser against 5 bundled real PDFs — no
              setup. <b className="text-text">Local</b> talks to a real backend on your own machine, on any PDF
              you upload — only available when you're running this app locally yourself. See the limitations icon
              in the header above for why, and for what's a known limitation either way.
            </p>
            <h5 className="m-0 mb-1.5 mt-3 text-[10.5px] font-bold uppercase tracking-wide text-text-dim">Learn as you go</h5>
            <p className="m-0 text-[12px] leading-relaxed text-text-muted">
              Every stage page has its own{" "}
              <span className="rounded-[4px] bg-accent-bg px-1 py-px font-semibold text-accent-text">Learn more</span>{" "}
              card — <b className="text-text">What is this, Why is it
              needed, Common mistakes,</b> and <b className="text-text">Best practice</b> for that specific stage,
              often with a concrete thing to try. Worth opening on each page as you go for a much better sense of
              what's actually happening than the pipeline animation alone gives you.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
