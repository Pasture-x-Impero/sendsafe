import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import DashboardLayout from "./components/DashboardLayout";
import LeadsPage from "./pages/dashboard/LeadsPage";
import DraftsPage from "./pages/dashboard/DraftsPage";
import ApprovalPage from "./pages/dashboard/ApprovalPage";
import SentPage from "./pages/dashboard/SentPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="leads" replace />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="drafts" element={<DraftsPage />} />
            <Route path="approval" element={<ApprovalPage />} />
            <Route path="sent" element={<SentPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
