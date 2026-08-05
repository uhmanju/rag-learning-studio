import { useState } from "react";

/**
 * Scans real extracted markdown text for real, detectable patterns —
 * `[Image: ...]` placeholders (this parser never writes or embeds actual
 * images, so any image reference in the source PDF shows up exactly this
 * way), markdown headings, and markdown table separator rows — and
 * renders them as small clickable markers. Everything else passes
 * through unchanged. Ported from the pre-existing frontend's
 * ParseAnnotatedText, extended with the table marker the new mockup adds.
 */
export function ParseAnnotatedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const imageMatch = line.match(/^(.*)\[Image:\s*([^\]]+)\](.*)$/);
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        const isTableSeparator = line.startsWith("|---") || line.startsWith("|-");

        if (imageMatch) {
          const [, before, caption, after] = imageMatch;
          return (
            <span key={i}>
              {before}
              <Marker kind="image" label="🖼 image removed" explain={`This parser never writes or embeds images into its markdown output — the source had an image here ("${caption}"), and it genuinely doesn't appear in the parsed text.`} />
              {after}
              {i < lines.length - 1 ? "\n" : ""}
            </span>
          );
        }
        if (headingMatch) {
          const [, hashes] = headingMatch;
          return (
            <span key={i}>
              <Marker kind="heading" label={`H${hashes!.length}`} explain="Detected as a heading from the PDF's real heading structure and marked with markdown's # syntax." />
              {" " + line}
              {i < lines.length - 1 ? "\n" : ""}
            </span>
          );
        }
        if (isTableSeparator) {
          return (
            <span key={i}>
              <Marker kind="table" label="▦ table preserved" explain="This row is the markdown table separator — table structure was detected and preserved." />
              {" " + line}
              {i < lines.length - 1 ? "\n" : ""}
            </span>
          );
        }
        return (
          <span key={i}>
            {line}
            {i < lines.length - 1 ? "\n" : ""}
          </span>
        );
      })}
    </>
  );
}

/** Left-column (original) counterpart — shows images as a plain visual
 *  placeholder, since the original still "has" them; nothing was removed
 *  on this side, so no click-to-explain is needed. */
export function ParseOriginalText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const imgMatch = line.match(/^(.*)\[Image:\s*([^\]]+)\](.*)$/);
        if (imgMatch) {
          const [, before, caption, after] = imgMatch;
          return (
            <span key={i}>
              {before}
              <span className="mx-[2px] inline-flex items-center gap-1.5 rounded-md border border-dashed border-border-strong bg-bg-elevated px-2 py-0.5 text-[11.5px] text-text-dim">
                🖼 {caption}
              </span>
              {after}
              {i < lines.length - 1 ? "\n" : ""}
            </span>
          );
        }
        return (
          <span key={i}>
            {line}
            {i < lines.length - 1 ? "\n" : ""}
          </span>
        );
      })}
    </>
  );
}

const MARKER_STYLES: Record<string, string> = {
  image: "bg-[#FCE8E9] text-[#8A2A2E] border-[#E8B4B7]",
  heading: "bg-[#EAF1FE] text-[#2054B0] border-[#C6D8FC]",
  table: "bg-[#EAF7EE] text-[#15803D] border-[#BFE8CC]",
  ocr: "bg-[#FFF7E6] text-[#8A6A16] border-[#EFDFB0]",
};

export function Marker({ kind, label, explain }: { kind: keyof typeof MARKER_STYLES; label: string; explain: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative mx-0.5 inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-[5px] border px-[7px] py-px text-[10.5px] font-bold ${MARKER_STYLES[kind]}`}
      >
        {label}
      </button>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-1 block w-64 whitespace-normal rounded-md border border-border bg-bg-panel p-2.5 text-[11.5px] leading-snug text-text-muted shadow-card">
          <b className="text-text">Why: </b>
          {explain}
        </span>
      )}
    </span>
  );
}
