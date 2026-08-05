import { PipelineShell } from "@/components/layout/PipelineShell";
import { LearningCard } from "@/components/layout/LearningCard";

const LEARNING_ITEMS = [
  { heading: "What is this?", body: "A scorecard for how well this run performed — planned, not yet built." },
  { heading: "Why is it needed?", body: "Reading one answer tells you if that answer was good — evaluation is what tells you if the pipeline is good across many questions." },
  { heading: "Common mistakes", body: "Not applicable yet — this page has no functionality to misuse." },
  { heading: "Best practice", body: "Not applicable yet — check back once this stage is built." },
];

// This matches the locked evaluate_stage_mockup.html exactly: Evaluation
// is marked "coming soon," per an explicit request not to fabricate
// metrics. An earlier pass built a full metrics/latency dashboard here
// using real run data — that wasn't what was approved. Real latency and
// source-page data do exist on the run and could genuinely back a
// scorecard, but showing a real-looking dashboard for a stage the design
// explicitly wants marked "not yet built" would misrepresent what's
// actually finished versus planned. When this stage is greenlit for
// real implementation, that data is right there in run.stages.evaluate
// and run.stages.generate to build it from.
export function EvaluatePage() {
  return (
    <PipelineShell
      learningCard={
        <LearningCard
          title="Evaluation"
          colorVar="--stage-evaluate"
          items={LEARNING_ITEMS}
          collapsedSummary="Planned: a scorecard for this run — not yet built, shown honestly as coming soon rather than filled with placeholder numbers."
          defaultCollapsed
        />
      }
    >
      <div className="mb-3 flex-none">
        <h1 className="m-0 text-xl font-bold">Evaluation</h1>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="max-w-[420px] rounded-lg border border-border bg-bg-panel p-11 text-center shadow-card">
          <div className="mb-3.5 text-3xl">🚧</div>
          <h2 className="m-0 mb-2.5 text-[17px] font-bold">Coming soon</h2>
          <p className="m-0 mb-4 text-[13px] leading-relaxed text-text-muted">
            This stage isn't built yet. Rather than fill this page with placeholder metrics, it's left honestly
            empty until there's something real to show.
          </p>
          <div className="rounded-md border border-dashed border-border-strong bg-bg-elevated px-3.5 py-2.5 text-[11.5px] leading-relaxed text-text-dim">
            Planned: a scorecard for this run — latency per stage, chunks used, and (once implemented)
            answer-quality scoring.
          </div>
        </div>
      </div>
    </PipelineShell>
  );
}
