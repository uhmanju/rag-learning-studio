export interface ParameterExplanation {
  question: string;
  purpose: string;
  tradeoffs: string;
  increaseWhen: string;
  decreaseWhen: string;
}

export const PARAMETER_EXPLANATIONS: Record<"chunkSize" | "chunkOverlap" | "topK" | "threshold", ParameterExplanation> = {
  chunkSize: {
    question: "What does chunk size control?",
    purpose: "How many characters go into each chunk before it's cut and a new one starts.",
    tradeoffs: "Too small and a chunk loses the surrounding context it needs to make sense alone. Too large and unrelated content gets pulled in alongside what's actually relevant.",
    increaseWhen: "Your source has long, single-topic sections that keep getting cut mid-thought.",
    decreaseWhen: "Retrieval keeps returning chunks with a lot of irrelevant filler alongside the useful sentence.",
  },
  chunkOverlap: {
    question: "What does overlap control?",
    purpose: "How many characters the end of one chunk repeats at the start of the next.",
    tradeoffs: "Without overlap, a sentence right on a chunk boundary can be split so neither chunk has the full thought. Too much overlap means more chunks (and more embedding calls) for the same document.",
    increaseWhen: "You're seeing chunks that start or end mid-sentence in a way that looks like it lost meaning.",
    decreaseWhen: "You want fewer, cheaper embedding calls and your content doesn't have much boundary-spanning content.",
  },
  topK: {
    question: "What does top-k control?",
    purpose: "How many candidate chunks are considered as possible context, before the threshold filters them.",
    tradeoffs: "A higher k gives the threshold more candidates to choose from, but costs more at query time and can surface more borderline matches.",
    increaseWhen: "Correct answers seem to need material spread across more than a couple of chunks.",
    decreaseWhen: "Retrieval is slow or answers are getting diluted by tangential context.",
  },
  threshold: {
    question: "What does the retrieval threshold control?",
    purpose: "The maximum distance a chunk is allowed to have from the question and still be kept as context.",
    tradeoffs: "Too strict and correct-but-loosely-worded chunks get dropped. Too loose and irrelevant chunks get passed to the model as if they were relevant.",
    increaseWhen: "You're getting \"no results\" on questions you're confident the document actually answers.",
    decreaseWhen: "Answers are getting diluted or distracted by tangential retrieved content.",
  },
};
