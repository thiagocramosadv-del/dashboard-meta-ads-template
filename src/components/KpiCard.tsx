import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";
import { fmtDelta } from "@/lib/format";
import { InfoHint } from "./InfoHint";

interface Props {
  label: string;
  value: string;
  delta: number;
  /** se true, delta negativo é "bom" (ex.: CPL, frequência) */
  invertDelta?: boolean;
  spark: number[];
  icon: LucideIcon;
  hint?: string;
  /** valor 0..1 representando intensidade para a barra */
  barPct?: number;
  accent?: "primary" | "success" | "warning" | "danger";
}

const accentMap = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};
const accentText = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export const KpiCard = ({
  label,
  value,
  delta,
  invertDelta = false,
  spark,
  icon: Icon,
  hint,
  barPct = 0.6,
  accent = "primary",
}: Props) => {
  const positive = invertDelta ? delta < 0 : delta > 0;
  const neutral = delta === 0;
  const deltaColor = neutral
    ? "text-muted-foreground"
    : positive
      ? "text-success"
      : "text-danger";

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/30 transition-colors">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
          <Icon className={cn("h-3.5 w-3.5", accentText[accent])} />
          <span>{label}</span>
          {hint && <InfoHint text={hint} />}
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 text-xs font-medium num",
            deltaColor
          )}
        >
          {positive ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {fmtDelta(delta)}
        </div>
      </header>

      <p className="mt-3 text-3xl font-semibold tracking-tight num">{value}</p>

      <div className="mt-3 h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full", accentMap[accent])}
          style={{ width: `${Math.max(6, Math.min(100, barPct * 100))}%` }}
        />
      </div>

      <div className="mt-3 -mx-1">
        <Sparkline data={spark} color={`hsl(var(--${accent}))`} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">vs período anterior</p>
    </article>
  );
};
