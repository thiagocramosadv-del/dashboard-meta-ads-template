import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { SidebarNav } from "./SidebarNav";
import { DateRangePicker } from "./DateRangePicker";
import { CampaignFilter } from "./CampaignFilter";
import { ScopedCampaignFilter } from "./ScopedCampaignFilter";
import { useLocation } from "react-router-dom";
import { Menu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const titles: Record<string, { title: string; sub: string }> = {
  "/": { title: "Visão geral", sub: "Resumo do desempenho das suas campanhas" },
  "/campanhas": { title: "Campanhas", sub: "Acompanhe campanhas ativas" },
  "/conjuntos": { title: "Conjuntos", sub: "Conjuntos de anúncios e públicos" },
  "/criativos": { title: "Criativos", sub: "Quais anúncios estão trazendo conversas" },
  "/publico": { title: "Público", sub: "Quem está respondendo seus anúncios" },
  "/configuracoes": { title: "Configurações", sub: "Conexão e preferências do painel" },
  "/config": { title: "Configurações", sub: "Conexão e preferências do painel" },
};

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const meta = titles[pathname] ?? titles["/"];
  const [mobileOpen, setMobileOpen] = useState(false);

  const filter =
    pathname === "/" ? <CampaignFilter /> :
    pathname === "/criativos" ? <ScopedCampaignFilter scope="criativos" /> :
    pathname === "/conjuntos" ? <ScopedCampaignFilter scope="conjuntos" /> :
    null;

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
          {/* Linha 1: hambúrguer (mobile) + título + ações desktop */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Hambúrguer apenas em mobile */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden h-10 w-10 shrink-0 border-border bg-card"
                    aria-label="Abrir menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[280px] p-0 bg-sidebar border-sidebar-border"
                >
                  <SidebarNav onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-semibold tracking-tight truncate">
                  {meta.title}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
                  {meta.sub}
                </p>
              </div>
            </div>

            {/* Ações desktop (>= sm) */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {filter}
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 border-border bg-card hover:bg-accent"
                aria-label="Atualizar dados"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </Button>
              <DateRangePicker />
            </div>
          </div>

          {/* Linha 2: ações em mobile (scroll horizontal) */}
          <div className="sm:hidden px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {filter}
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 border-border bg-card hover:bg-accent"
              aria-label="Atualizar dados"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div className="shrink-0">
              <DateRangePicker />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 max-w-[1600px] w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};
