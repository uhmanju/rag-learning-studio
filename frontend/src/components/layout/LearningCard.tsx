import { useState } from "react";

interface LearningItem {
  heading: string;
  body: string;
}

interface Props {
  title: string;
  colorVar: string;
  items: LearningItem[];
  collapsedSummary: string;
  defaultCollapsed?: boolean;
}

export function LearningCard({ title, colorVar, items, collapsedSummary, defaultCollapsed = false }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  // "Expand ▸ / Collapse ▾" reads as generic UI chrome, easy to skim
  // past. "Learn more" says what's actually behind the click, and the
  // dot pulses gently while collapsed so it doesn't look like inert
  // text — stops pulsing the moment someone's opened it once.
  const [everOpened, setEverOpened] = useState(defaultCollapsed === false);

  return (
    <div className="flex-none border-b border-border bg-gradient-to-b from-white to-[#faf8ff] px-6 py-2.5">
      <div className={`flex items-center gap-2.5 ${collapsed ? "" : "mb-2.5"}`}>
        <span className="h-[9px] w-[9px] flex-none rounded-full" style={{ background: `var(${colorVar})` }} />
        <span className="text-[15px] font-bold">{title}</span>
        <button
          type="button"
          onClick={() => {
            setCollapsed((v) => !v);
            setEverOpened(true);
          }}
          className="ml-auto flex items-center gap-1.5 rounded-[6px] border border-border px-2.5 py-1 text-[11px] font-medium text-text-muted hover:bg-bg-hover"
        >
          {collapsed && !everOpened && (
            <span className="h-[6px] w-[6px] flex-none animate-pulse-dot rounded-full bg-accent-fill" />
          )}
          {collapsed ? "Learn more ▸" : "Show less ▾"}
        </button>
      </div>
      {collapsed ? (
        <p className="m-0 text-[12.5px] text-text-muted">{collapsedSummary}</p>
      ) : (
        <div className="grid grid-cols-4 gap-5">
          {items.map((item) => (
            <div key={item.heading}>
              <h5 className="m-0 mb-1 text-[10.5px] font-bold uppercase tracking-wide text-text-dim">{item.heading}</h5>
              <p className="m-0 text-[12.5px] leading-relaxed text-text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
