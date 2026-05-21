import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { CampaignsProvider } from "@/contexts/CampaignsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import VisaoGeral from "./pages/VisaoGeral";
import Campanhas from "./pages/Campanhas";
import Conjuntos from "./pages/Conjuntos";
import Criativos from "./pages/Criativos";
import Publico from "./pages/Publico";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={150}>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <DateRangeProvider>
            <CampaignsProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Navigate to="/login" replace />} />
                <Route path="/" element={<Protected><VisaoGeral /></Protected>} />
                <Route path="/campanhas" element={<Protected><Campanhas /></Protected>} />
                <Route path="/conjuntos" element={<Protected><Conjuntos /></Protected>} />
                <Route path="/criativos" element={<Protected><Criativos /></Protected>} />
                <Route path="/publico" element={<Protected><Publico /></Protected>} />
                <Route path="/configuracoes" element={<Protected><Configuracoes /></Protected>} />
                <Route path="/config" element={<Protected><Configuracoes /></Protected>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CampaignsProvider>
          </DateRangeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
