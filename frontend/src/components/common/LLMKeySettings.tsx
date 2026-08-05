import { useState, useRef, useEffect, type SVGProps } from "react";
import { getUserGroqKey, setUserGroqKey, clearUserGroqKey } from "@/services/userApiKey";

function KeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className="icon" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12 20 3M17 6l2.5 2.5M14 9l2 2" />
    </svg>
  );
}

/**
 * Lets someone add their own Groq API key for real LLM generation in
 * Demo Mode, instead of relying on this deployment's server-side default
 * (which may not be configured — see api/generate.js). Stored in
 * sessionStorage only (see userApiKey.ts) — never sent to this app's own
 * server, only ever used to call Groq directly from this browser.
 */
export function LLMKeySettings() {
  const [open, setOpen] = useState(false);
  const [hasKey, setHasKey] = useState(() => getUserGroqKey() !== null);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Without this, the popup only closes by clicking the same icon again —
  // clicking anywhere else on the page left it stuck open, easy to miss
  // as a real dismiss path.
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        title={hasKey ? "Your Groq API key is set for this tab" : "Add your own Groq API key (optional)"}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border ${
          hasKey ? "border-stage-clean bg-[#EAF7EE] text-stage-clean" : "border-border-strong bg-bg-elevated text-text-muted"
        } hover:bg-bg-hover`}
      >
        <KeyIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[300px] rounded-md border border-border bg-bg-panel p-3.5 shadow-card">
          <div className="mb-1.5 text-[12px] font-semibold text-text">LLM settings</div>
          <p className="m-0 mb-2.5 text-[11px] leading-relaxed text-text-muted">
            Optional. Add your own Groq API key to get real generated answers even if this deployment has no
            default key configured. Stored only in this browser tab (cleared when you close it) — never sent
            anywhere but Groq itself.
          </p>
          {hasKey ? (
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-stage-clean">✓ Key set for this tab</span>
              <button
                type="button"
                onClick={() => {
                  clearUserGroqKey();
                  setHasKey(false);
                }}
                className="rounded-md border border-border-strong px-2 py-1 text-[11px] text-text-muted hover:bg-bg-hover"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <input
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="gsk_…"
                className="min-w-0 flex-1 rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-[12px] text-text"
              />
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => {
                  setUserGroqKey(draft.trim());
                  setDraft("");
                  setHasKey(true);
                }}
                className="rounded-md border-none bg-accent-fill px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </div>
          )}
          <p className="m-0 mt-2 text-[10.5px] text-text-dim">
            Get a free key at{" "}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline">
              console.groq.com/keys
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
