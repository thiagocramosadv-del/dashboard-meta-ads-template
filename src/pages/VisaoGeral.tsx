import { useNavigate } from "react-router-dom";
import {
  CircleDollarSign,
  MessageSquareMore,
  TrendingUp,
  MousePointerClick,
  Repeat,
  AlertTriangle,
  Plug,
} from "lucide-react";
import { useEffect } from "react";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { ChampionBanner } from "@/components/ChampionBanner";
import { InvestVsConversasChart } from "@/components/charts/InvestVsConversasChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { BrazilHeatMap } from "@/components/charts/BrazilHeatMap";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useMetaOverview } from "@/hooks/useMetaOverview";
import { cpl as cplFn } from "@/data/mock";
import type { Creative } from "@/data/mock";

const KpiSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-1.5 w-full" />
    <Skeleton className="h-10 w-full" />
  </div>
);

const EmptyConnect = ({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta: string;
}) => {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
      <div className="mx-auto h-12 w-12 rounded-lg bg-primary/15 grid place-items-center">
        <Plug className="h-5 w-5 text-primary" />
      </div>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
        {description}
      </p>
      <Button className="mt-5" onClick={() => navigate("/configuracoes")}>
        {cta}
      </Button>
    </div>
  );
};

const VisaoGeral = () => {
  const { range } = useDateRange();
  const navigate = useNavigate();
  const { data, loading, error, authError } = useMetaOverview(range.from, range.to);

  useEffect(() => {
    if (authError) {
      navigate("/configuracoes?auth=expired");
    }
  }, [authError, navigate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
        </section>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </section>
      </div>
    );
  }

  if (authError) {
    return (
      <EmptyConnect
        title="Sua conexão com o Meta Ads expirou"
        description="O token de acesso não é mais válido. Atualize a credencial em Configurações para voltar a ver os dados."
        cta="Ir para Configurações"
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-sm flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Não foi possível carregar os dados</p>
          <p className="text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.kpis.totais.spend === 0) {
    return (
      <EmptyConnect
        title="Nenhum dado para o período selecionado"
        description="Não encontramos atividade de campanhas neste intervalo. Verifique sua conexão Meta Ads ou selecione outro período."
        cta="Ver Configurações"
      />
    );
  }

  const { kpis, serie, placement, regioes, topCriativos, champion } = data;

  const last7 = serie.slice(-7);
  const spark = last7.map((d) => d.investimento);
  const sparkConv = last7.map((d) => d.conversas);
  const sparkCpl = last7.map((d) => d.investimento / Math.max(d.conversas, 1));
  const sparkCtr = last7.map(() => kpis.ctr);
  const sparkFreq = last7.map(() => kpis.frequencia);

  const chartData = serie.map((d) => {
    const dt = new Date(d.data + "T00:00:00");
    return {
      date: d.data,
      label: `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`,
      investimento: d.investimento,
      conversas: d.conversas,
      cliques: 0,
      impressoes: 0,
    };
  });

  // Adapta para o formato do ChampionBanner (Creative)
  const championAdapted: Creative | null = champion
    ? ({
        id: champion.id,
        nome: champion.nome,
        campanhaNome: champion.campanhaNome,
        adsetNome: "",
        formato: "imagem",
        status: "ativo",
        thumb: champion.thumb || "/placeholder.svg",
        investimento: champion.investimento,
        conversas: champion.conversas,
        cliques: 0,
        impressoes: 0,
        frequencia: 0,
        qualidade: "media",
        engajamento: "media",
        conversao: "acima",
        cplTrend7d: 0,
        cpl: champion.cpl,
      } as Creative)
    : null;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Investimento total"
          value={fmtBRL(kpis.totais.spend)}
          delta={kpis.deltas.spend}
          spark={spark}
          icon={CircleDollarSign}
          accent="primary"
          barPct={0.7}
          hint="Soma de tudo que foi gasto em anúncios no período."
        />
        <KpiCard
          label="Conversas iniciadas"
          value={fmtNum(kpis.totais.conversas)}
          delta={kpis.deltas.conversas}
          spark={sparkConv}
          icon={MessageSquareMore}
          accent="success"
          barPct={0.8}
          hint="Conversas iniciadas (Messenger/WhatsApp). Métrica específica — diferente de 'Resultados', que segue o objetivo de cada campanha."
        />
        <KpiCard
          label="Custo por resultado"
          value={kpis.cpr !== null ? fmtBRL(kpis.cpr) : "—"}
          delta={kpis.deltas.cpr}
          invertDelta
          spark={sparkCpl}
          icon={TrendingUp}
          accent="warning"
          barPct={0.55}
          hint="Métrica oficial do Meta. Soma do gasto dividido pelos resultados do período. Diferente do CPC, que é custo por clique."
        />
        <KpiCard
          label="CTR médio"
          value={fmtPct(kpis.ctr)}
          delta={kpis.deltas.ctr}
          spark={sparkCtr}
          icon={MousePointerClick}
          accent="primary"
          barPct={0.5}
          hint="Quantos % das pessoas que viram o anúncio clicaram."
        />
        <KpiCard
          label="Frequência média"
          value={kpis.frequencia.toFixed(2)}
          delta={kpis.deltas.frequencia}
          invertDelta
          spark={sparkFreq}
          icon={Repeat}
          accent="warning"
          barPct={0.4}
          hint="Quantas vezes, em média, a mesma pessoa viu seu anúncio. Acima de 3 indica desgaste."
        />
      </section>

      {championAdapted ? (
        <ChampionBanner champion={championAdapted} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground shadow-card">
          Sem campeão ativo no período
        </div>
      )}

      <InvestVsConversasChart data={chartData as any} />

      <section className={`grid grid-cols-1 ${topCriativos.length > 0 ? "lg:grid-cols-2" : ""} gap-4`}>
        {/* Top 3 criativos */}
        {topCriativos.length > 0 && <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <header className="mb-4">
            <h3 className="text-sm font-semibold">Top 3 criativos</h3>
            <p className="text-xs text-muted-foreground">Menor custo por resultado</p>
          </header>
          <ul className="space-y-3">
              {topCriativos.map((c, i) => (
                <li
                  key={c.id}
                  className="flex gap-3 p-2 -mx-2 rounded-md hover:bg-accent/40 transition-colors"
                >
                  <div className="relative">
                    <img
                      src={c.thumb || "/placeholder.svg"}
                      alt=""
                      className="h-14 w-20 rounded-md object-cover border border-border bg-muted"
                    />
                    <span className="absolute -top-1 -left-1 h-5 w-5 grid place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-card">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.campanhaNome}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <span className="text-muted-foreground num">
                        {fmtNum(c.conversas)} resultados
                      </span>
                      <span className="font-semibold text-success num">
                        {c.cpl !== null ? fmtBRL(c.cpl) : "—"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>}

        {/* Donut placement */}
        <DonutChart
          title="Onde apareceram"
          subtitle="Distribuição de impressões por posicionamento"
          data={placement.map((p) => ({ nome: p.name, valor: p.value }))}
          formatValue={(v) => `${v.toLocaleString("pt-BR")} impressões`}
        />
      </section>

      {/* Mapa de calor por estado */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <header className="mb-4">
          <h3 className="text-sm font-semibold">Distribuição por estado</h3>
          <p className="text-xs text-muted-foreground">
            Mapa de calor de investimento por estado
          </p>
        </header>
        <BrazilHeatMap data={regioes} />
        <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          *Conversas iniciadas via WhatsApp frequentemente não retornam estado pelo Meta. Investimento é a métrica mais fiel para distribuição geográfica.
        </p>
      </section>
    </div>
  );
};

export default VisaoGeral;
