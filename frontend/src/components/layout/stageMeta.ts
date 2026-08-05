import type { StageId } from "@/types/pipeline";

export interface StageMeta {
  id: StageId;
  label: string;
  colorVar: string; // CSS var name, e.g. "--stage-parse"
  tooltip: string;
  path: string;
}

export const STAGES: StageMeta[] = [
  { id: "upload", label: "Upload PDF", colorVar: "--stage-upload", tooltip: "A PDF is handed to the pipeline.", path: "/upload" },
  { id: "parse", label: "Parse Document", colorVar: "--stage-parse", tooltip: "PDF becomes structured text.", path: "/parse" },
  { id: "clean", label: "Clean Document", colorVar: "--stage-clean", tooltip: "Whitespace noise is removed.", path: "/clean" },
  { id: "chunk", label: "Chunking", colorVar: "--stage-chunk", tooltip: "Text is split into overlapping pieces.", path: "/chunk" },
  { id: "embed", label: "Embeddings", colorVar: "--stage-embed", tooltip: "Chunks become numeric vectors.", path: "/embed" },
  { id: "retrieve", label: "Retrieval", colorVar: "--stage-retrieve", tooltip: "Nearest chunks to a question are found.", path: "/retrieve" },
  { id: "prompt", label: "Prompt Construction", colorVar: "--stage-prompt", tooltip: "Retrieved chunks + question become one prompt.", path: "/prompt" },
  { id: "generate", label: "LLM Response", colorVar: "--stage-generate", tooltip: "The model generates a grounded answer.", path: "/generate" },
  { id: "evaluate", label: "Evaluation", colorVar: "--stage-evaluate", tooltip: "A scorecard for this run.", path: "/evaluate" },
];
