import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Search } from "lucide-react";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { exportCsv, buildCsvFilename, CsvColumn } from "@/lib/exportCsv";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import { DataTable, Column } from "@/components/DataTable";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/utils";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useMetaAdsets, ConjuntoRow } from "@/hooks/useMetaAdsets";
import { useScopedCampaignSelection } from "@/hooks/useScopedCampaignSelection";
import { InfoHint } from "@/components/InfoHint";

const CPR_HINT =
  "Métrica oficial do Meta. Soma do gasto dividido pelos resultados do período. Diferente do CPC, que é custo por clique.";

const TableSkeleton = () => (
  <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
    <div className="px-4 py-3 border-b border-border">
      <Skeleton className="h-4 w-40" />
    </div>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/60">
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

const Conjuntos = () => {
  const { range } = useDateRange();
  const { data, loading, error, authError } = useMetaAdsets(range.from, range.to);
  const [statusFilter, setStatusFilter] = useState("todas");
  const [busca, setBusca] = useState("");
  const [agrupar, setAgrupar] = useState(false);
  const [aberto, setAberto] = useState<Record<string, boolean>>({});
  

  const all = data?.rows ?? [];
  const cprMedio = data?.cprMedio ?? 0;

  const allCampaignIds = useMemo(
    () => Array.from(new Set(all.map((c) => c.campanhaId).filter(Boolean))),
    [all]
  );
  const sel = useScopedCampaignSelection("conjuntos", allCampaignIds);

  const rows: ConjuntoRow[] = useMemo(
    () =>
      sel
        .filterByCampaignId(all)
        .filter((c) => statusFilter === "todas" || c.status === statusFilter)
        .filter(
          (c) =>
            c.nome.toLowerCase().includes(busca.toLowerCase()) ||
            c.publico.toLowerCase().includes(busca.toLowerCase())
        ),
    [all, statusFilter, busca, sel.selectedSet]
  );

  const columns: Column<ConjuntoRow>[] = [
    {
      key: "nome",
      label: "Conjunto",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.nome}</p>
          <p className="text-xs text-muted-foreground">{r.campanhaNome}</p>
        </div>
      ),
    },
    {
      key: "publico",
      label: "Público",
      cell: (r) => <span className="text-muted-foreground">{r.publico}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: false,
      cell: (r) => <StatusPill status={r.status} />,
    },
    {
      key: "investimento",
      label: "Investimento",
      align: "right",
      cell: (r) => fmtBRL(r.investimento),
    },
    {
      key: "results",
      label: "Resultados",
      align: "right",
      cell: (r) => fmtNum(r.results),
    },
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
    {
      key: "ctr",
      label: "CTR",
      align: "right",
      cell: (r) => fmtPct(r.ctr),
    },
    {
      key: "cpc",
      label: "CPC",
      align: "right",
      cell: (r) => (r.cliques > 0 ? fmtBRL(r.cpc) : "—"),
    },
    {
      key: "frequencia",
      label: "Freq.",
      align: "right",
      cell: (r) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 justify-end",
            r.frequencia > 3 && "text-warning"
          )}
        >
          {r.frequencia > 3 && <AlertTriangle className="h-3.5 w-3.5" />}
          {r.frequencia.toFixed(2)}
        </span>
      ),
    },
  ];

  const accent = (r: ConjuntoRow) => {
    if (cprMedio === 0 || r.results === 0 || r.cpr === null) return "ok" as const;
    if (r.cpr <= cprMedio) return "ok" as const;
    if (r.cpr <= cprMedio * 1.2) return "warn" as const;
    return "bad" as const;
  };

  const csvColumns: CsvColumn<ConjuntoRow>[] = [
    { header: "Conjunto", value: (r) => r.nome },
    { header: "Campanha", value: (r) => r.campanhaNome },
    { header: "Público", value: (r) => r.publico },
    { header: "Status", value: (r) => r.status },
    { header: "Investimento", value: (r) => r.investimento },
    { header: "Resultados", value: (r) => r.results },
    { header: "Custo por resultado", value: (r) => (r.results > 0 && r.cpr !== null ? r.cpr : "") },
    { header: "CTR", value: (r) => r.ctr },
    { header: "CPC", value: (r) => (r.cliques > 0 ? r.cpc : "") },
    { header: "Frequência", value: (r) => r.frequencia },
  ];

  const handleExport = () => {
    exportCsv(rows, csvColumns, buildCsvFilename("conjuntos", range.from, range.to));
  };

  // grouping
  const grouped = useMemo(() => {
    const map = new Map<string, ConjuntoRow[]>();
    rows.forEach((r) => {
      if (!map.has(r.campanhaNome)) map.set(r.campanhaNome, []);
      map.get(r.campanhaNome)!.push(r);
    });
    return Array.from(map.entries()).map(([nome, items]) => ({
      nome,
      items,
      invest: items.reduce((s, x) => s + x.investimento, 0),
      conv: items.reduce((s, x) => s + x.conversas, 0),
    }));
  }, [rows]);

  if (loading) return <TableSkeleton />;

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
          <p className="font-semibold">Não foi possível carregar conjuntos</p>
          <p className="text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <ExportCsvButton onClick={handleExport} disabled={rows.length === 0} />
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conjunto ou público..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os status</SelectItem>
            <SelectItem value="ativa">Ativos</SelectItem>
            <SelectItem value="pausada">Pausados</SelectItem>
            <SelectItem value="encerrada">Encerrados</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
          <Switch checked={agrupar} onCheckedChange={setAgrupar} />
          Agrupar por campanha
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
          Nenhum conjunto no filtro atual.
        </div>
      ) : !agrupar ? (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          defaultSort={{ key: "investimento", dir: "desc" }}
          rowAccent={accent}
          empty="Nenhum conjunto corresponde aos filtros."
        />
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => {
            const open = aberto[g.nome] ?? true;
            return (
              <div
                key={g.nome}
                className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
              >
                <button
                  onClick={() => setAberto((s) => ({ ...s, [g.nome]: !open }))}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold flex-1">{g.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.items.length} conjuntos
                  </span>
                  <span className="text-sm num">{fmtBRL(g.invest)}</span>
                  <span className="text-sm num text-muted-foreground">
                    {fmtNum(g.conv)} conv.
                  </span>
                </button>
                {open && (
                  <div className="border-t border-border">
                    <DataTable
                      rows={g.items}
                      columns={columns}
                      rowKey={(r) => r.id}
                      rowAccent={accent}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Conjuntos;
