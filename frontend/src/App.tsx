import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PipelineRunProvider } from "@/hooks/PipelineRunContext";
import { PaletteProvider } from "@/hooks/PaletteContext";
import { Dashboard } from "@/components/pages/Dashboard";
import { Upload } from "@/components/pages/Upload";
import { Parse } from "@/components/pages/Parse";
import { Clean } from "@/components/pages/Clean";
import { ChunkPage } from "@/components/pages/ChunkPage";
import { EmbedPage } from "@/components/pages/EmbedPage";
import { RetrievePage } from "@/components/pages/RetrievePage";
import { PromptPage } from "@/components/pages/PromptPage";
import { GeneratePage } from "@/components/pages/GeneratePage";
import { EvaluatePage } from "@/components/pages/EvaluatePage";

// One route per pipeline stage, per APPLICATION_ARCHITECTURE.md §5's
// target architecture. All nine stages are now integrated against real
// pipeline data via PipelineRunProvider's shared context. PaletteProvider
// wraps everything above the router so a theme choice survives
// navigation between stages.
export default function App() {
  return (
    <PaletteProvider>
      <PipelineRunProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/parse" element={<Parse />} />
            <Route path="/clean" element={<Clean />} />
            <Route path="/chunk" element={<ChunkPage />} />
            <Route path="/embed" element={<EmbedPage />} />
            <Route path="/retrieve" element={<RetrievePage />} />
            <Route path="/prompt" element={<PromptPage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/evaluate" element={<EvaluatePage />} />
          </Routes>
        </BrowserRouter>
      </PipelineRunProvider>
    </PaletteProvider>
  );
}
