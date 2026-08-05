import { useEffect, useState } from "react";
import {
  AlignLeftIcon,
  CutIcon,
  FileTextIcon,
  MessageCheckIcon,
  SearchIcon,
  SparklesIcon,
  Stack2Icon,
  BulbIcon,
  VectorTriangleIcon,
} from "@/components/common/icons";

// Locked spec (per PROJECT_MANIFEST.yaml / dashboard_integration_mockup_v3.html):
// a serpentine path with 9 nodes, a particle traveling the path on an 8s
// loop, and the active node cycling every 8000/9 ≈ 889ms in step with it.
const PIPELINE_NODES = [
  { label: "PDF", Icon: FileTextIcon, x: 90, y: 60 },
  { label: "Parse", Icon: AlignLeftIcon, x: 320, y: 60 },
  { label: "Clean", Icon: SparklesIcon, x: 550, y: 60 },
  { label: "Chunk", Icon: CutIcon, x: 550, y: 200 },
  { label: "Embed", Icon: VectorTriangleIcon, x: 320, y: 200 },
  { label: "Retrieve", Icon: SearchIcon, x: 90, y: 200 },
  { label: "Prompt", Icon: Stack2Icon, x: 90, y: 340 },
  { label: "LLM", Icon: BulbIcon, x: 320, y: 340 },
  { label: "Answer", Icon: MessageCheckIcon, x: 550, y: 340 },
] as const;

const SERPENTINE_PATH =
  "M90,60 L550,60 Q580,60 580,130 Q580,200 550,200 L90,200 Q60,200 60,270 Q60,340 90,340 L550,340";

const NODE_INTERVAL_MS = 8000 / PIPELINE_NODES.length;

export function PipelineAnimation() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % PIPELINE_NODES.length);
    }, NODE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="mb-16 rounded-lg bg-surface-1 px-2 py-6">
      <div className="relative mx-auto aspect-[640/400] w-full max-w-[640px]">
        <svg viewBox="0 0 640 400" className="absolute inset-0 h-full w-full">
          <path d={SERPENTINE_PATH} fill="none" stroke="var(--border-strong)" strokeWidth={2} />
        </svg>

        <div
          className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-accent-fill"
          style={{
            offsetPath: `path("${SERPENTINE_PATH}")`,
            offsetDistance: "0%",
            animation: "travel-path 8s linear infinite",
          }}
        />
        <div
          className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-accent-fill opacity-50"
          style={{
            offsetPath: `path("${SERPENTINE_PATH}")`,
            offsetDistance: "0%",
            animation: "travel-path 8s linear infinite",
            animationDelay: "-4s",
          }}
        />

        {PIPELINE_NODES.map((node, i) => {
          const active = i === activeIndex;
          const { Icon } = node;
          return (
            <div
              key={node.label}
              className={`absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.5px] transition-all duration-[400ms] ${
                active
                  ? "border-accent-border bg-accent-bg shadow-[0_0_0_6px_var(--bg-accent)]"
                  : "border-border bg-surface-2"
              }`}
              style={{ left: `${(node.x / 640) * 100}%`, top: `${(node.y / 400) * 100}%` }}
            >
              <Icon className={`h-[22px] w-[22px] ${active ? "text-accent-text" : "text-text-muted"}`} />
              <span className="absolute left-1/2 top-full w-[70px] -translate-x-1/2 translate-y-1 text-center text-[10px] text-text-muted">
                {node.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
