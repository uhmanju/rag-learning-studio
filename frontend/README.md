# RAG Learning Studio — Frontend

The React learning UI: nine pages, one per pipeline stage, driven by real
data from either Demo Mode (in-browser, no backend) or Local Mode (your
own running `../backend`).

See the [root README](../README.md) for the project overview, both
modes explained, and full installation instructions. This file covers
just the frontend on its own.

## Running just the frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

Defaults to Demo Mode — no backend required. To point it at a running
backend instead, see the root README's Installation section.

## Structure

```
src/
├── types/pipeline.ts       The framework-agnostic domain model every
│                            component is built against — no component
│                            imports a specific RAG framework, vector
│                            database, or model provider directly.
├── services/
│   ├── mockPipelineDataSource.ts   Demo Mode's real in-browser pipeline
│   ├── httpPipelineDataSource.ts   Local Mode's HTTP client for ../backend
│   ├── embeddingProviders/          Pluggable embedding backends
│   └── llmProviders/                Pluggable LLM backends (Demo Mode)
├── hooks/                  usePipelineRun (the shared pipeline state),
│                            PipelineRunContext, PaletteContext
├── components/
│   ├── layout/               Shell, nav rail, header, mode selector
│   ├── common/                Generic reusable pieces (state blocks, icons)
│   └── pages/                 One file per pipeline stage
└── styles/tokens.css        Design tokens — includes the live-switchable
                              palette system (see PaletteContext)
```

## Scripts

```bash
npm run dev         # start the dev server
npm run build        # typecheck + production build
npm run typecheck    # TypeScript strict-mode check, no emit
npm run lint          # eslint
```

## Contributing

See the root [`CONTRIBUTING.md`](../CONTRIBUTING.md) — covers ground
rules for both halves, including the framework-agnostic component rule
above and where new pipeline features belong.
