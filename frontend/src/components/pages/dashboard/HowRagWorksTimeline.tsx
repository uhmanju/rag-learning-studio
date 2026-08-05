import { Message2Icon, VectorTriangleIcon, GitCompareIcon, TargetIcon, Stack2Icon, BulbIcon } from "@/components/common/icons";

const TIMELINE_STEPS = [
  { Icon: Message2Icon, copy: "Ask your question" },
  { Icon: VectorTriangleIcon, copy: "Embed it into a vector" },
  { Icon: GitCompareIcon, copy: "Compare against stored embeddings" },
  { Icon: TargetIcon, copy: "Retrieve the closest chunks" },
  { Icon: Stack2Icon, copy: "Assemble the prompt" },
  { Icon: BulbIcon, copy: "Generate the answer" },
] as const;

export function HowRagWorksTimeline() {
  return (
    <section className="mx-auto mb-16 max-w-[520px]">
      <h2 className="dashboard-heading mb-8 text-center text-[22px]">How RAG works</h2>
      <div className="relative">
        <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-border" />
        {TIMELINE_STEPS.map((step, i) => {
          const stepNumber = i + 1;
          const isLeft = stepNumber % 2 === 0; // even -> card on left
          const { Icon } = step;
          const card = (
            <div className="flex max-w-[220px] items-center gap-2.5 rounded-md border-[0.5px] border-border bg-surface-2 px-3.5 py-2.5 text-[13px]">
              <Icon className="h-[18px] w-[18px] flex-none text-accent-text" />
              {step.copy}
            </div>
          );
          return (
            <div key={step.copy} className="mb-5 grid grid-cols-[1fr_40px_1fr] items-center last:mb-0">
              <div className={isLeft ? "justify-self-end" : ""}>{isLeft ? card : null}</div>
              <div className="relative z-[1] mx-auto flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent-fill text-[12px] font-medium text-accent-on">
                {stepNumber}
              </div>
              <div className={!isLeft ? "justify-self-start" : ""}>{!isLeft ? card : null}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
