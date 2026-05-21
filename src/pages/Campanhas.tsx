import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import { DataTable, Column } from "@/components/DataTable";
import { StatusPill } from "@/components/StatusPill";
import { InfoHint } from "@/components/InfoHint";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { exportCsv, buildCsvFilename, CsvColumn } from "@/lib/exportCsv";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useMetaCampaigns, CampanhaRow, CampanhaStatus } from "@/hooks/useMetaCampaigns";
import { fullDateBR, relativeFromNow, daysSince, parseMetaDate } from "@/lib/relativeDate";
import { cn } from "@/lib/utils";

const CPR_HINT =
  "Métrica oficial do Meta. Soma do gasto dividido pelos resultados do período. Diferente do CPC, que é custo por clique.";

const SKELETON_HEADERS = [
  "Campanha",
  "Status",
  "Criada em",
  "Editada em",
  "Investimento",
  "Resultados",
  "Custo por resultado",
  "Cliques",
  "CTR",
  "CPC",
  "Freq.",
];

const CampanhasSkeleton = () => (
  <div className="space-y-5">
    {/* Pills de status (4) */}
    <div className="flex items-center gap-1.5 flex-wrap">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-24 rounded-full" />
      ))}
    </div>

    {/* Pills de filtros (criadas / editadas) */}
    <div className="flex items-start gap-6 flex-wrap">
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-3 w-16" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      ))}
    </div>

    {/* Busca */}
    <div className="flex items-center gap-3 flex-wrap">
      <Skeleton className="h-9 w-72 rounded-md" />
      <Skeleton className="h-3 w-64" />
    </div>

    {/* Tabela com header real visível e 8 linhas skeleton */}
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/30">
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {SKELETON_HEADERS.map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "font-medium px-4 py-3",
                    i >= 4 ? "text-right" : "text-left"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-t border-border/60">
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-[70%] max-w-[280px]" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

type CriadasOpt = "todas" | "hoje" | "7" | "30" | "90";
type EditadasOpt = "todas" | "hoje" | "7" | "30";

const CRIADAS_OPTS: { value: CriadasOpt; label: string; max: number | null }[] = [
  { value: "todas", label: "Todas", max: null },
  { value: "hoje", label: "Hoje", max: 0 },
  { value: "7", label: "Últimos 7 dias", max: 7 },
  { value: "30", label: "Últimos 30 dias", max: 30 },
  { value: "90", label: "Últimos 90 dias", max: 90 },
];

const EDITADAS_OPTS: { value: EditadasOpt; label: string; max: number | null }[] = [
  { value: "todas", label: "Todas", max: null },
  { value: "hoje", label: "Hoje", max: 0 },
  { value: "7", label: "Últimos 7 dias", max: 7 },
  { value: "30", label: "Últimos 30 dias", max: 30 },
];

const LS_CRIADAS = "santosads.criadasFilter";
const LS_EDITADAS = "santosads.editadasFilter";

function useStoredFilter<T extends string>(key: string, def: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    if (typeof window === "undefined") return def;
    return (localStorage.getItem(key) as T) || def;
  });
  useEffect(() => {
    try { localStorage.setItem(key, v); } catch { /* noop */ }
  }, [key, v]);
  return [v, setV];
}

function PillGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function passDateFilter(dateStr: string | null, max: number | null): boolean {
  if (max === null) return true;
  const days = daysSince(dateStr);
  if (days === null) return false;
  return days <= max;
}

const Campanhas = () => {
  const { range } = useDateRange();
  const { data, loading, error, authError } = useMetaCampaigns(range.from, range.to);
  type StatusOpt = "todas" | CampanhaStatus;
  const [statusFilter, setStatusFilter] = useState<StatusOpt>("todas");
  const [busca, setBusca] = useState("");
  const [criadas, setCriadas] = useStoredFilter<CriadasOpt>(LS_CRIADAS, "todas");
  const [editadas, setEditadas] = useStoredFilter<EditadasOpt>(LS_EDITADAS, "todas");

  const all = data?.rows ?? [];
  const cprMedio = data?.cprMedio ?? 0;

  const criadasMax = CRIADAS_OPTS.find((o) => o.value === criadas)?.max ?? null;
  const editadasMax = EDITADAS_OPTS.find((o) => o.value === editadas)?.max ?? null;

  // Base aplicando todos os filtros EXCETO status (para contar pills de status)
  const baseSemStatus = useMemo(
    () =>
      all
        .filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()))
        .filter((c) => passDateFilter(c.createdAt, criadasMax))
        .filter((c) => passDateFilter(c.updatedAt, editadasMax)),
    [all, busca, criadasMax, editadasMax]
  );

  const statusCounts = useMemo(() => {
    const c = { todas: baseSemStatus.length, ativa: 0, pausada: 0, encerrada: 0 };
    for (const r of baseSemStatus) c[r.status]++;
    return c;
  }, [baseSemStatus]);

  const STATUS_OPTS: { value: StatusOpt; label: string }[] = [
    { value: "todas", label: "Todas" },
    { value: "ativa", label: "Ativas" },
    { value: "pausada", label: "Pausadas" },
    { value: "encerrada", label: "Encerradas" },
  ];

  const rows: CampanhaRow[] = useMemo(
    () => baseSemStatus.filter((c) => statusFilter === "todas" || c.status === statusFilter),
    [baseSemStatus, statusFilter]
  );

  const csvColumns: CsvColumn<CampanhaRow>[] = [
    { header: "Campanha", value: (r) => r.nome },
    { header: "Status", value: (r) => r.status },
    { header: "Criada em", value: (r) => r.createdAt ?? "" },
    { header: "Editada em", value: (r) => r.updatedAt ?? "" },
    { header: "Investimento", value: (r) => r.investimento },
    { header: "Resultados", value: (r) => r.results },
    { header: "Custo por resultado", value: (r) => (r.results > 0 && r.cpr !== null ? r.cpr : "") },
    { header: "Cliques", value: (r) => r.cliques },
    { header: "CTR", value: (r) => r.ctr },
    { header: "CPC", value: (r) => (r.cliques > 0 ? r.cpc : "") },
    { header: "Frequência", value: (r) => r.frequencia },
  ];

  const handleExport = () => {
    exportCsv(rows, csvColumns, buildCsvFilename("campanhas", range.from, range.to));
  };


  const dateCell = (iso: string | null) => {
    if (!iso) return <span className="text-muted-foreground">—</span>;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">{relativeFromNow(iso)}</span>
        </TooltipTrigger>
        <TooltipContent>{fullDateBR(iso)}</TooltipContent>
      </Tooltip>
    );
  };

  const columns: Column<CampanhaRow>[] = [
    { key: "nome", label: "Campanha", cell: (r) => <span className="font-medium">{r.nome}</span> },
    { key: "status", label: "Status", sortable: false, cell: (r) => <StatusPill status={r.status} /> },
    {
      key: "createdAt",
      label: "Criada em",
      cell: (r) => dateCell(r.createdAt),
      sortValue: (r) => parseMetaDate(r.createdAt)?.getTime() ?? 0,
    },
    {
      key: "updatedAt",
      label: "Editada em",
      cell: (r) => dateCell(r.updatedAt),
      sortValue: (r) => parseMetaDate(r.updatedAt)?.getTime() ?? 0,
    },
    { key: "investimento", label: "Investimento", align: "right", cell: (r) => fmtBRL(r.investimento) },
    { key: "results", label: "Resultados", align: "right", cell: (r) => fmtNum(r.results) },
    {
      key: "cpr",
      label: (
        <span className="inline-flex items-center gap-1">
          Custo por resultado
          <InfoHint text={CPR_HINT} />
        </span>
      ),
      align: "right",
      cell: (r) => (
        <span className="font-semibold">
          {r.results > 0 && r.cpr !== null ? fmtBRL(r.cpr) : "—"}
        </span>
      ),
    },
    { key: "cliques", label: "Cliques", align: "right", cell: (r) => fmtNum(r.cliques) },
    { key: "ctr", label: "CTR", align: "right", cell: (r) => fmtPct(r.ctr) },
    { key: "cpc", label: "CPC", align: "right", cell: (r) => (r.cliques > 0 ? fmtBRL(r.cpc) : "—") },
    { key: "frequencia", label: "Freq.", align: "right", cell: (r) => r.frequencia.toFixed(2) },
  ];

  if (loading) return <CampanhasSkeleton />;

  if (authError) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-6 text-sm flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Conexão com Meta Ads expirou</p>
          <p className="text-muted-foreground mt-1">
            Atualize sua credencial em Configurações para voltar a ver os dados.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-sm flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Não foi possível carregar campanhas</p>
          <p className="text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_OPTS.map((o) => {
          const active = o.value === statusFilter;
          const count = statusCounts[o.value];
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setStatusFilter(o.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground border-border hover:bg-accent hover:border-primary/40"
              )}
            >
              <span>{o.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-6 flex-wrap">
        <PillGroup label="Criadas:" value={criadas} onChange={setCriadas} options={CRIADAS_OPTS} />
        <PillGroup label="Editadas:" value={editadas} onChange={setEditadas} options={EDITADAS_OPTS} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <ExportCsvButton onClick={handleExport} disabled={rows.length === 0} />
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanha..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "campanha" : "campanhas"} ·
          legenda da borda: <span className="text-success">verde</span> ≤ média,{" "}
          <span className="text-warning">amarela</span> até +20%,{" "}
          <span className="text-danger">vermelha</span> &gt; +20%
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
          Nenhuma campanha no filtro atual.
        </div>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          defaultSort={{ key: "investimento", dir: "desc" }}
          rowAccent={(r) => {
            if (cprMedio === 0 || r.results === 0 || r.cpr === null) return "ok";
            if (r.cpr <= cprMedio) return "ok";
            if (r.cpr <= cprMedio * 1.2) return "warn";
            return "bad";
          }}
          empty="Nenhuma campanha corresponde aos filtros."
        />
      )}
    </div>
  );
};

export default Campanhas;
