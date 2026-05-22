import { Scale, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Megaphone,
  Layers3,
  ImagePlay,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export const sidebarItems = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/conjuntos", label: "Conjuntos", icon: Layers3 },
  { to: "/criativos", label: "Criativos", icon: ImagePlay },
  { to: "/publico", label: "Público", icon: Users },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

interface Props {
  /** Called after a nav item is clicked (e.g. to close mobile drawer) */
  onNavigate?: () => void;
}

export const SidebarNav = ({ onNavigate }: Props) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    onNavigate?.();
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center shadow-card">
            <Scale className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">Carrascossi Ramos Advocacia</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Painel Meta Ads
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {sidebarItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => onNavigate?.()}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            activeClassName="bg-sidebar-accent text-foreground font-medium"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Conta conectada
        </div>
        {user?.email && (
          <p className="text-[11px] text-muted-foreground truncate" title={user.email}>
            {user.email}
          </p>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors min-h-[44px]"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};
