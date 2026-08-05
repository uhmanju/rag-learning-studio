import { useState, type MouseEvent } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(_e: MouseEvent) => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${
        copied ? "border-stage-clean text-stage-clean" : "border-border-strong text-text-muted hover:bg-bg-hover"
      }`}
    >
      {copied ? "copied ✓" : "copy"}
    </button>
  );
}
