import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CategoryPujas from "./pages/CategoryPujas";
import LanguageToggle from "./components/LanguageToggle";
import { LanguageWrapper } from "./components/LanguageWrapper";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <LanguageToggle />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
