import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fmtBRL, fmtNum } from "@/lib/format";
import { DonutChart } from "@/components/charts/DonutChart";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useMetaAudience, PLACEMENT_COLORS, DEVICE_COLORS } from "@/hooks/useMetaAudience";

const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const horas = Array.from({ length: 24 }, (_, i) => i);

const Publico = () => {
  const [aba, setAba] = useState("idade");
  const { range } = useDateRange();
  const { data, loading, error, authError } = useMetaAudience(range.from, range.to);
  const navigate = useNavigate();

  if (authError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-danger">Token do Meta Ads expirado</p>
        <p className="text-xs text-muted-foreground">
          Atualize as credenciais em Configurações para voltar a carregar dados.
        </p>
        <Button onClick={() => navigate("/configuracoes")} variant="outline">
          Ir para Configurações
        </Button>
      </div>
    );
  }

  return (
    <Tabs value={aba} onValueChange={setAba} className="space-y-5">
      <TabsList className="bg-card border border-border w-full sm:w-auto overflow-x-auto justify-start">
        <TabsTrigger value="idade">Idade & Gênero</TabsTrigger>
        <TabsTrigger value="regiao">Região</TabsTrigger>
        <TabsTrigger value="placement">Placement</TabsTrigger>
        <TabsTrigger value="dispositivo">Dispositivo</TabsTrigger>
        <TabsTrigger value="horario">Horário</TabsTrigger>
      </TabsList>

      {error && !authError && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* IDADE & GÊNERO */}
      <TabsContent value="idade" className="mt-0">
        <IdadeGenero data={data?.idade ?? []} loading={loading} />
      </TabsContent>

      {/* REGIÃO */}
      <TabsContent value="regiao" className="mt-0">
        <Regiao data={data?.regioes ?? []} loading={loading} />
      </TabsContent>

      {/* PLACEMENT */}
      <TabsContent value="placement" className="mt-0">
        <div className="max-w-md min-h-[420px]">
          {loading ? (
            <Skeleton className="h-[420px] rounded-xl" />
          ) : (data?.placement.length ?? 0) === 0 ? (
            <Empty msg="Sem dados de placement no período" />
          ) : (
            <DonutChart
              title="Placement"
              subtitle="Distribuição de conversas por posicionamento"
              data={data!.placement}
              colorMap={PLACEMENT_COLORS}
              formatValue={(v) => `${fmtNum(v)} conv.`}
            />
          )}
        </div>
      </TabsContent>

      {/* DISPOSITIVO */}
      <TabsContent value="dispositivo" className="mt-0">
        <div className="max-w-md min-h-[420px]">
          {loading ? (
            <Skeleton className="h-[420px] rounded-xl" />
          ) : (data?.dispositivo.length ?? 0) === 0 ? (
            <Empty msg="Sem dados de dispositivo no período" />
          ) : (
            <DonutChart
              title="Dispositivo"
              subtitle="Distribuição de conversas por dispositivo"
              data={data!.dispositivo}
              colorMap={DEVICE_COLORS}
              formatValue={(v) => `${fmtNum(v)} conv.`}
            />
          )}
        </div>
      </TabsContent>

      {/* HORÁRIO */}
      <TabsContent value="horario" className="mt-0">
        <Heatmap data={data?.heat ?? []} loading={loading} />
      </TabsContent>
    </Tabs>
  );
};

const Empty = ({ msg }: { msg: string }) => (
  <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
    {msg}
  </div>
);

// === IDADE & GÊNERO ===
const IdadeGenero = ({
  data,
  loading,
}: {
  data: { faixa: string; masc: number; fem: number; cplMasc: number; cplFem: number }[];
  loading: boolean;
}) => {
  const empty = !loading && data.every((d) => d.masc === 0 && d.fem === 0);
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <header className="mb-4">
        <h3 className="text-sm font-semibold">Conversas por idade e gênero</h3>
        <p className="text-xs text-muted-foreground">
          Quem mais inicia conversas com seu escritório
        </p>
      </header>
      {loading ? (
        <Skeleton className="h-80 w-full rounded-md" />
      ) : empty ? (
        <Empty msg="Sem dados de idade & gênero para esse período/filtro" />
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="faixa" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string, item: any) => {
                  const cpl = name === "Masculino" ? item?.payload?.cplMasc : item?.payload?.cplFem;
                  return [`${fmtNum(value)} conv. · CPL ${fmtBRL(cpl ?? 0)}`, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="masc" name="Masculino" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="fem" name="Feminino" stackId="a" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// === REGIÃO ===
type RegiaoSort = "conversas" | "investimento" | "cpl" | "nome";
const Regiao = ({
  data,
  loading,
}: {
  data: { nome: string; conversas: number; investimento: number; cpl: number }[];
  loading: boolean;
}) => {
  const [sortKey, setSortKey] = useState<RegiaoSort>("conversas");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const cp = [...data];
    cp.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (typeof av === "string") return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      return asc ? av - bv : bv - av;
    });
    return cp;
  }, [data, sortKey, asc]);

  const toggleSort = (k: RegiaoSort) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(false);
    }
  };

  const sortIcon = (k: RegiaoSort) => (sortKey === k ? (asc ? "↑" : "↓") : "");

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold">Top regiões com conversas iniciadas</h3>
        <p className="text-xs text-muted-foreground">Top 10 por conversas</p>
      </header>
      {loading ? (
        <div className="p-5 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Empty msg="Sem dados de região para esse período/filtro" />
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <Th onClick={() => toggleSort("nome")} align="left">
                Cidade/Estado {sortIcon("nome")}
              </Th>
              <Th onClick={() => toggleSort("conversas")} align="right">
                Conversas {sortIcon("conversas")}
              </Th>
              <Th onClick={() => toggleSort("investimento")} align="right">
                Investimento {sortIcon("investimento")}
              </Th>
              <Th onClick={() => toggleSort("cpl")} align="right">
                Custo/Conversa {sortIcon("cpl")}
              </Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.nome} className="border-t border-border/60 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3">{r.nome}</td>
                <td className="px-4 py-3 text-right num">{fmtNum(r.conversas)}</td>
                <td className="px-4 py-3 text-right num">{fmtBRL(r.investimento)}</td>
                <td className="px-4 py-3 text-right num font-semibold">
                  {r.cpl > 0 ? fmtBRL(r.cpl) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const Th = ({
  children,
  onClick,
  align,
}: {
  children: React.ReactNode;
  onClick: () => void;
  align: "left" | "right";
}) => (
  <th
    onClick={onClick}
    className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground ${
      align === "left" ? "text-left" : "text-right"
    }`}
  >
    {children}
  </th>
);

// === HEATMAP ===
const Heatmap = ({
  data,
  loading,
}: {
  data: { dia: number; hora: number; conversas: number; spend: number; cpl: number }[];
  loading: boolean;
}) => {
  const max = Math.max(1, ...data.map((d) => d.conversas));
  const cellAt = (dia: number, hora: number) =>
    data.find((d) => d.dia === dia && d.hora === hora) ?? { dia, hora, conversas: 0, spend: 0, cpl: 0 };
  const empty = !loading && data.every((d) => d.conversas === 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card overflow-x-auto">
      <header className="mb-4">
        <h3 className="text-sm font-semibold">Conversas por horário</h3>
        <p className="text-xs text-muted-foreground">
          Linhas = horas do dia · Colunas = dias da semana · Mais escuro = mais conversas
        </p>
      </header>
      {loading ? (
        <Skeleton className="h-[600px] w-full rounded-md" />
      ) : empty ? (
        <Empty msg="Sem dados de horário para esse período/filtro" />
      ) : (
        <div className="inline-block">
          <div className="flex">
            <div className="w-10" />
            {dias.map((d) => (
              <div key={d} className="w-9 text-[10px] font-medium text-muted-foreground text-center">
                {d}
              </div>
            ))}
          </div>
          {horas.map((hora) => (
            <div key={hora} className="flex items-center">
              <div className="w-10 text-[10px] text-muted-foreground text-right pr-2 num">
                {String(hora).padStart(2, "0")}h
              </div>
              {dias.map((_, dia) => {
                const c = cellAt(dia, hora);
                const intensity = c.conversas / max;
                return (
                  <div
                    key={dia}
                    title={`${dias[dia]} ${String(hora).padStart(2, "0")}h · ${fmtNum(c.conversas)} conversa${
                      c.conversas === 1 ? "" : "s"
                    }${c.cpl > 0 ? ` · CPL ${fmtBRL(c.cpl)}` : ""}`}
                    className="w-9 h-6 m-0.5 rounded cursor-pointer transition-transform hover:scale-110"
                    style={{
                      backgroundColor:
                        intensity === 0
                          ? "hsl(var(--card))"
                          : `color-mix(in srgb, hsl(var(--card)) ${(1 - intensity) * 100}%, hsl(var(--primary)))`,
                      border: "1px solid hsl(var(--border) / 0.4)",
                    }}
                  />
                );
              })}
            </div>
          ))}
          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Menos</span>
            {[0.1, 0.25, 0.45, 0.7, 0.95].map((v) => (
              <span key={v} className="h-3 w-5 rounded" style={{ backgroundColor: `hsl(var(--primary) / ${v})` }} />
            ))}
            <span>Mais</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Publico;
