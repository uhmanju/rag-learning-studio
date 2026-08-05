import { useState } from "react";

interface LegendItem {
  chip: React.ReactNode;
  status: "real" | "illustrative";
  text: string;
}

export function LegendTrigger({ chips, items }: { chips: React.ReactNode; items: LegendItem[] }) {
  const [pinned, setPinned] = useState(false);
  return (
    <div className="group relative mb-2.5 flex-none">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setPinned((v) => !v);
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-panel px-3 py-1.5 text-[11.5px] text-text-muted hover:bg-bg-hover"
      >
        {chips}
        ⓘ What do these markers mean?
      </button>
      <div
        className={`absolute left-0 top-[calc(100%+6px)] z-[15] w-[340px] rounded-md border border-border bg-bg-panel p-3.5 shadow-card ${
          pinned ? "block" : "hidden group-hover:block"
        }`}
      >
        {items.map((item, i) => (
          <div key={i} className="flex items-baseline gap-1.5 border-t border-border-soft py-1.5 text-[11.5px] text-text-dim first:border-t-0">
            {item.chip}
            <span className={item.status === "real" ? "flex-none font-semibold text-[#15803D]" : "flex-none font-semibold text-[#8A6A16]"}>
              {item.status}
            </span>
            <span>— {item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
