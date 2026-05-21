import { CampaignStatus } from "@/data/mock";
import { cn } from "@/lib/utils";

const map: Record<CampaignStatus | "ativo" | "pausado", { label: string; cls: string }> = {
  ativa: { label: "Ativa", cls: "bg-success/15 text-success border-success/30" },
  pausada: { label: "Pausada", cls: "bg-warning/15 text-warning border-warning/30" },
  encerrada: { label: "Encerrada", cls: "bg-muted/40 text-muted-foreground border-border" },
  ativo: { label: "Ativo", cls: "bg-success/15 text-success border-success/30" },
  pausado: { label: "Pausado", cls: "bg-warning/15 text-warning border-warning/30" },
};

export const StatusPill = ({ status }: { status: keyof typeof map }) => {
  const m = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        m.cls
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
};
