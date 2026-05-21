import { cn } from "@/lib/utils";

export type RankingValue = "acima" | "media" | "abaixo" | "desconhecido";

const map: Record<RankingValue, { label: string; cls: string; dot: string }> = {
  acima: { label: "Acima da média", cls: "text-success", dot: "bg-success" },
  media: { label: "Na média", cls: "text-warning", dot: "bg-warning" },
  abaixo: { label: "Abaixo da média", cls: "text-danger", dot: "bg-danger" },
  desconhecido: { label: "Sem dado", cls: "text-muted-foreground", dot: "bg-muted-foreground" },
};

export const RankingBadge = ({
  label,
  ranking,
}: {
  label: string;
  ranking: RankingValue | "acima" | "media" | "abaixo";
}) => {
  const m = map[(ranking as RankingValue)] ?? map.desconhecido;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("flex items-center gap-1.5 text-xs font-medium", m.cls)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
        {m.label}
      </span>
    </div>
  );
};
