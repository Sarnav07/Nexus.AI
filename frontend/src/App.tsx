import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ChainMismatchBanner from "@/components/ChainMismatchBanner";
import { useOrchestratorHealth } from "@/hooks/useOrchestratorHealth";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Terminal from "./pages/Terminal.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import Activity from "./pages/Activity.tsx";
import AgentDetail from "./pages/AgentDetail.tsx";
import VaultDetail from "./pages/VaultDetail.tsx";
import NotFound from "./pages/NotFound.tsx";

// App-level component — providers live in main.tsx
const App = () => {
  // Mount the orchestrator health heartbeat once at app root
  useOrchestratorHealth();

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Chain mismatch banner sits just below the fixed Navbar (top-16) */}
        <ChainMismatchBanner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/terminal" element={<Terminal />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/vault" element={<VaultDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
