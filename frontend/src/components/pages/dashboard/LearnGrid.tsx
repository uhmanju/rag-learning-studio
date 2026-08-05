import {
  FileTextIcon,
  SparklesIcon,
  CutIcon,
  VectorTriangleIcon,
  SearchIcon,
  Stack2Icon,
  BulbIcon,
  ChartBarIcon,
} from "@/components/common/icons";

const LEARN_CARDS = [
  { Icon: FileTextIcon, title: "Parsing", desc: "Understand how PDFs become structured text." },
  { Icon: SparklesIcon, title: "Cleaning", desc: "See how noisy text is transformed." },
  { Icon: CutIcon, title: "Chunking", desc: "Learn why documents are split into pieces." },
  { Icon: VectorTriangleIcon, title: "Embeddings", desc: "Understand how meaning becomes vectors." },
  { Icon: SearchIcon, title: "Retrieval", desc: "See how similar information is found." },
  { Icon: Stack2Icon, title: "Prompt engineering", desc: "Watch prompts being assembled." },
  { Icon: BulbIcon, title: "Generation", desc: "Observe how answers are created." },
  { Icon: ChartBarIcon, title: "Evaluation", desc: "Learn how RAG quality is measured." },
] as const;

export function LearnGrid() {
  return (
    <section className="mb-16">
      <h2 className="dashboard-heading mb-7 text-center text-[22px]">What you'll learn</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LEARN_CARDS.map(({ Icon, title, desc }) => (
          <div key={title} className="rounded-md border-[0.5px] border-border bg-surface-2 p-4">
            <Icon className="mb-2 h-5 w-5 text-accent-text" />
            <h3 className="mb-1 text-sm font-semibold">{title}</h3>
            <p className="text-xs leading-relaxed text-text-muted">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
