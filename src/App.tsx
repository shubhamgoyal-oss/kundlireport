import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CategoryPujas from "./pages/CategoryPujas";
import Kundli from "./pages/Kundli";
import ExperimentAdmin from "./pages/ExperimentAdmin";
import AdminLogin from "./pages/AdminLogin";
import LanguageToggle from "./components/LanguageToggle";
import { LanguageWrapper } from "./components/LanguageWrapper";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { trackTrafficSource } from "./utils/trafficTracking";
import PdfTest from "./pages/PdfTest";
import CoverTest from "./pages/CoverTest";

const queryClient = new QueryClient();

// Helper functions from analytics.ts (duplicated to avoid circular deps)
function getSessionId(): string {
  try {
    let id = localStorage.getItem("analytics_session_id");
    if (!id) {
      id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("analytics_session_id", id);
    }
    return id;
  } catch {
    return "anon-session";
  }
}

function getVisitorId(): string {
  try {
    const VISITOR_KEY = "analytics_visitor_id";
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon-visitor";
  }
}

const App = () => {
  useEffect(() => {
    // Track traffic source on initial app load
    const sessionId = getSessionId();
    const visitorId = getVisitorId();
    trackTrafficSource(visitorId, sessionId);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Redirect root to /hi by default */}
              <Route path="/" element={<Navigate to="/hi" replace />} />

              {/* Language-specific routes */}
              <Route path="/:lang" element={<LanguageWrapper />}>
                <Route index element={<Index />} />
                <Route path="category/:category" element={<CategoryPujas />} />
                <Route path="kundli" element={<Kundli />} />
              </Route>

              {/* Test route for PDF debugging */}
              <Route path="/pdf-test" element={<PdfTest />} />
              <Route path="/cover-test" element={<CoverTest />} />

              {/* Admin login route */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Protected admin routes */}
              <Route
                path="/admin/experiments"
                element={
                  <ProtectedRoute>
                    <ExperimentAdmin />
                  </ProtectedRoute>
                }
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
