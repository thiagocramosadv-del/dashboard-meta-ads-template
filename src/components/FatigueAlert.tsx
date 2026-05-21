import { AlertTriangle } from "lucide-react";
import { Creative, cpl } from "@/data/mock";
import { fmtBRL } from "@/lib/format";

interface Props {
  fatigados: Creative[];
}

export const FatigueAlert = ({ fatigados }: Props) => {
  if (fatigados.length === 0) return null;
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-warning/15 grid place-items-center shrink-0">
          <AlertTriangle className="h-4.5 w-4.5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {fatigados.length === 1
              ? "1 criativo apresentando fadiga"
              : `${fatigados.length} criativos apresentando fadiga`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Frequência alta (&gt;3) e custo por conversa subindo nos últimos 7 dias.
            Considere pausar ou substituir.
          </p>
          <ul className="mt-3 space-y-1.5">
            {fatigados.slice(0, 4).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between text-xs gap-3"
              >
                <span className="truncate font-medium">{c.nome}</span>
                <span className="text-muted-foreground shrink-0 num">
                  Freq {c.frequencia.toFixed(1)} · CPL {fmtBRL(cpl(c.investimento, c.conversas))} · +
                  {c.cplTrend7d.toFixed(0)}% em 7d
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
