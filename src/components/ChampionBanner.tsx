import { Trophy, Sparkles } from "lucide-react";
import { fmtBRL, fmtNum } from "@/lib/format";
import { Creative } from "@/data/mock";
import { cpl } from "@/data/mock";
import { InfoHint } from "@/components/InfoHint";

const CPR_HINT =
  "Métrica oficial do Meta. Soma do gasto dividido pelos resultados do período. Diferente do CPC, que é custo por clique.";

interface Props {
  champion: Creative & { cpl?: number | null };
}

export const ChampionBanner = ({ champion }: Props) => {
  const cplValor = champion.cpl ?? cpl(champion.investimento, champion.conversas);
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-champion p-5 shadow-card">
      <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-success/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-primary grid place-items-center shadow-card">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-primary uppercase tracking-wider font-semibold">
              <Sparkles className="h-3 w-3" />
              Criativo destaque do período
            </div>
            <p className="text-lg font-semibold mt-0.5">{champion.nome}</p>
            <p className="text-xs text-muted-foreground">
              {champion.campanhaNome}
            </p>
          </div>
        </div>

        <div className="hidden md:block w-px h-14 bg-border/60 mx-2" />

        <img
          src={champion.thumb}
          alt=""
          className="h-16 w-28 rounded-md object-cover border border-border"
        />

        <div className="flex flex-1 justify-end gap-6 flex-wrap">
          <Stat label="Resultados" value={fmtNum(champion.conversas)} />
          <Stat label="Custo por resultado" hint={CPR_HINT} value={cplValor !== null ? fmtBRL(cplValor) : "—"} highlight />
          <Stat label="Investimento" value={fmtBRL(champion.investimento)} />
        </div>
      </div>
    </div>
  );
};

const Stat = ({
  label,
  value,
  highlight,
  hint,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  hint?: string;
}) => (
  <div>
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium inline-flex items-center gap-1">
      {label}
      {hint && <InfoHint text={hint} />}
    </p>
    <p
      className={`mt-0.5 text-xl font-semibold num ${
        highlight ? "text-success" : "text-foreground"
      }`}
    >
      {value}
    </p>
  </div>
);
