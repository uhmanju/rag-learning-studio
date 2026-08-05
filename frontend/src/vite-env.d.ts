/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PIPELINE_DATA_SOURCE?: "mock" | "http";
  /** Local development convenience ONLY — see groqProvider.ts and
   *  .env.example's warning. Only ever read when the app detects it's
   *  running on localhost; never used on a hosted deployment even if
   *  somehow present in that build. */
  readonly VITE_GROQ_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
