import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import DashboardLayout from "./components/DashboardLayout";
import ContactsPage from "./pages/dashboard/ContactsPage";
import CreatePage from "./pages/dashboard/CreatePage";
import ReviewPage from "./pages/dashboard/ReviewPage";
import SentPage from "./pages/dashboard/SentPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Navigate to="contacts" replace />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="create" element={<CreatePage />} />
              <Route path="review" element={<ReviewPage />} />
              <Route path="sent" element={<SentPage />} />
              <Route path="settings" element={<SettingsPage />} />
              {/* Redirects for old paths */}
              <Route path="leads" element={<Navigate to="/dashboard/contacts" replace />} />
              <Route path="drafts" element={<Navigate to="/dashboard/review" replace />} />
              <Route path="approval" element={<Navigate to="/dashboard/review" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
