import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Image as ImageIcon,
  Info,
  Layers,
  Play,
  Search,
  Sparkles,
  Trophy,
  Video,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { exportCsv, buildCsvFilename, CsvColumn } from "@/lib/exportCsv";
import { CreativePreviewDialog } from "@/components/CreativePreviewDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useCampaigns } from "@/contexts/CampaignsContext";
import { useMetaCreatives, CriativoFormato, CriativoItem } from "@/hooks/useMetaCreatives";
import { fmtBRL, fmtNum, fmtPct, fmtDelta } from "@/lib/format";
import { RankingBadge } from "@/components/RankingBadge";
import { InfoHint } from "@/components/InfoHint";
import { cn } from "@/lib/utils";
import { useScopedCampaignSelection } from "@/hooks/useScopedCampaignSelection";

type SortKey = "menor_cpl" | "mais_conversas" | "maior_ctr" | "mais_cliques" | "maior_freq";

const sorters: Record<SortKey, (a: CriativoItem, b: CriativoItem) => number> = {
  menor_cpl: (a, b) => {
    const av = a.results > 0 && a.cpr !== null ? a.cpr : Number.POSITIVE_INFINITY;
    const bv = b.results > 0 && b.cpr !== null ? b.cpr : Number.POSITIVE_INFINITY;
    return av - bv;
  },
  mais_conversas: (a, b) => b.conversas - a.conversas,
  maior_ctr: (a, b) => b.ctr - a.ctr,
  mais_cliques: (a, b) => b.cliques - a.cliques,
  maior_freq: (a, b) => b.frequencia - a.frequencia,
};

const Criativos = () => {
  const { range } = useDateRange();
  const { excludedFromChampion } = useCampaigns();
  const { data, loading, error, authError } = useMetaCreatives(range.from, range.to);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [busca, setBusca] = useState("");
  const [formatos, setFormatos] = useState<Set<CriativoFormato>>(new Set());
  const [statusAtivo, setStatusAtivo] = useState(true);
  const [esconderFadiga, setEsconderFadiga] = useState(false);
  const [sort, setSort] = useState<SortKey>("menor_cpl");
  const [previewItem, setPreviewItem] = useState<CriativoItem | null>(null);

  const items = data?.items ?? [];
  const cprMedio = data?.cprMedio ?? 0;

  const allCampaignIds = useMemo(
    () => Array.from(new Set(items.map((c) => c.campanhaId).filter(Boolean))),
    [items]
  );
  const sel = useScopedCampaignSelection("criativos", allCampaignIds);

  const champion = useMemo(() => {
    const excluded = new Set(excludedFromChampion);
    const qualificados = items.filter(
      (c) =>
        c.results >= 10 &&
        c.investimento >= 100 &&
        c.impressoes >= 1000 &&
        c.cpr !== null &&
        !excluded.has(c.campanhaId)
    );
    return qualificados.sort((a, b) => (a.cpr ?? Number.POSITIVE_INFINITY) - (b.cpr ?? Number.POSITIVE_INFINITY))[0] ?? null;
  }, [items, excludedFromChampion]);

  const fatigados = useMemo(
    () => items.filter((c) => c.isFadiga).sort((a, b) => (b.cprDelta7dPct ?? 0) - (a.cprDelta7dPct ?? 0)).slice(0, 3),
    [items]
  );

  const filtrados = useMemo(() => {
    return sel
      .filterByCampaignId([...items])
      .filter((c) => !statusAtivo || c.status === "ativo")
      .filter((c) => formatos.size === 0 || formatos.has(c.formato))
      .filter((c) => !esconderFadiga || !c.isFadiga)
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(busca.toLowerCase()) ||
          c.campanhaNome.toLowerCase().includes(busca.toLowerCase())
      )
      .sort(sorters[sort]);
  }, [items, busca, formatos, statusAtivo, esconderFadiga, sort, sel.selectedSet]);

  const toggleFmt = (f: CriativoFormato) => {
    setFormatos((s) => {
      const n = new Set(s);
      if (n.has(f)) n.delete(f);
      else n.add(f);
      return n;
    });
  };

  const limparFiltros = () => {
    setBusca("");
    setFormatos(new Set());
    setStatusAtivo(false);
    setEsconderFadiga(false);
  };

  const csvColumns: CsvColumn<CriativoItem>[] = [
    { header: "Criativo", value: (r) => r.nome },
    { header: "Campanha", value: (r) => r.campanhaNome },
    { header: "Conjunto", value: (r) => r.adsetNome },
    { header: "Status", value: (r) => r.status },
    { header: "Formato", value: (r) => r.formato },
    { header: "Investimento", value: (r) => r.investimento },
    { header: "Resultados", value: (r) => r.results },
    { header: "CPR", value: (r) => (r.cpr !== null ? r.cpr : "") },
    { header: "Cliques", value: (r) => r.cliques },
    { header: "CTR", value: (r) => r.ctr },
    { header: "CPC", value: (r) => (r.cpc > 0 ? r.cpc : "") },
    { header: "Frequência", value: (r) => r.frequencia },
    { header: "Qualidade", value: (r) => r.qualidade },
    { header: "Engajamento", value: (r) => r.engajamento },
    { header: "Conversão", value: (r) => r.conversao },
  ];

  const handleExport = () => {
    exportCsv(filtrados, csvColumns, buildCsvFilename("criativos", range.from, range.to));
  };

  if (authError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-danger">Token do Meta Ads expirado</p>
        <p className="text-xs text-muted-foreground">Atualize as credenciais em Configurações para voltar a carregar dados.</p>
        <Button onClick={() => navigate("/configuracoes")} variant="outline">Ir para Configurações</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Champion */}
      {loading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : champion ? (
        <CreativeChampionBanner item={champion} cprMedio={cprMedio} />
      ) : (
        <EmptyChampion />
      )}

      {/* Fatigue */}
      {!loading && fatigados.length > 0 && <CreativeFatigueAlert items={fatigados} />}

      {error && !authError && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</div>
      )}

      <div className="flex items-center justify-end">
        <ExportCsvButton onClick={handleExport} disabled={filtrados.length === 0} />
      </div>

      <CreativePreviewDialog
        item={previewItem}
        open={!!previewItem}
        onOpenChange={(open) => { if (!open) setPreviewItem(null); }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* filtros */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Buscar</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome do criativo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Formato</p>
            {(
              [
                { v: "imagem", label: "Imagem", icon: ImageIcon },
                { v: "video", label: "Vídeo", icon: Video },
                { v: "carrossel", label: "Carrossel", icon: Layers },
              ] as { v: CriativoFormato; label: string; icon: typeof ImageIcon }[]
            ).map(({ v, label, icon: Icon }) => (
              <label key={v} className="flex items-center gap-2.5 text-sm cursor-pointer">
                <Checkbox checked={formatos.has(v)} onCheckedChange={() => toggleFmt(v)} />
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {label}
              </label>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Estado</p>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <Checkbox checked={statusAtivo} onCheckedChange={(v) => setStatusAtivo(!!v)} />
              Apenas ativos
            </label>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <Checkbox checked={esconderFadiga} onCheckedChange={(v) => setEsconderFadiga(!!v)} />
              Esconder com fadiga
            </label>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Ordenar por</p>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="menor_cpl">Menor custo por resultado</SelectItem>
                <SelectItem value="mais_conversas">Mais conversas</SelectItem>
                <SelectItem value="maior_ctr">Maior CTR</SelectItem>
                <SelectItem value="mais_cliques">Mais cliques</SelectItem>
                <SelectItem value="maior_freq">Maior frequência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground px-1">
            {loading ? "Carregando..." : `${filtrados.length} ${filtrados.length === 1 ? "criativo encontrado" : "criativos encontrados"}`}
          </p>
        </aside>

        {/* grid */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[480px] rounded-xl" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-16 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Nenhum criativo encontrado com os filtros atuais</p>
              <Button onClick={limparFiltros} variant="outline" size="sm" className="gap-2">
                <X className="h-4 w-4" /> Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtrados.map((c) => (
                <CreativeCard key={c.id} c={c} cprMedio={cprMedio} onPreview={() => setPreviewItem(c)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const CreativeChampionBanner = ({ item, cprMedio }: { item: CriativoItem; cprMedio: number }) => {
  const delta = cprMedio > 0 && item.cpr !== null ? ((item.cpr - cprMedio) / cprMedio) * 100 : 0;
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
              <Sparkles className="h-3 w-3" /> Criativo destaque do período
            </div>
            <p className="text-lg font-semibold mt-0.5">{item.nome}</p>
            <p className="text-xs text-muted-foreground">{item.campanhaNome}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-14 bg-border/60 mx-2" />
        {item.thumb ? (
          <img src={item.thumb} alt="" className="h-16 w-28 rounded-md object-cover border border-border" />
        ) : (
          <div className="h-16 w-28 rounded-md bg-muted/40 border border-border grid place-items-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-1 justify-end gap-6 flex-wrap">
          <Stat label="Resultados" value={fmtNum(item.results)} />
          <Stat label="Custo por resultado" hint="Métrica oficial do Meta. Soma do gasto dividido pelos resultados do período. Diferente do CPC, que é custo por clique." value={item.cpr !== null ? fmtBRL(item.cpr) : "—"} highlight sub={cprMedio > 0 && item.cpr !== null ? `${fmtDelta(delta)} vs média` : undefined} />
          <Stat label="Investimento" value={fmtBRL(item.investimento)} />
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, highlight, sub, hint }: { label: string; value: string; highlight?: boolean; sub?: string; hint?: string }) => (
  <div>
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium inline-flex items-center gap-1">
      {label}
      {hint && <InfoHint text={hint} />}
    </p>
    <p className={cn("mt-0.5 text-xl font-semibold num", highlight ? "text-success" : "text-foreground")}>{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const EmptyChampion = () => (
  <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
    Sem dados suficientes para eleger um campeão (mínimo 10 conversas e R$100 investidos por criativo)
  </div>
);

const CreativeFatigueAlert = ({ items }: { items: CriativoItem[] }) => (
  <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-md bg-warning/15 grid place-items-center shrink-0">
        <AlertTriangle className="h-4 w-4 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">
          {items.length === 1 ? "1 criativo apresentando fadiga" : `${items.length} criativos apresentando fadiga`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Frequência &gt;3 e CPL dos últimos 7 dias subindo &gt;30% vs período completo.
        </p>
        <ul className="mt-3 space-y-1.5">
          {items.map((c) => (
            <li key={c.id} className="flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {c.thumb ? (
                  <img src={c.thumb} alt="" className="h-7 w-12 rounded object-cover border border-border shrink-0" />
                ) : (
                  <div className="h-7 w-12 rounded bg-muted/40 border border-border shrink-0" />
                )}
                <span className="truncate font-medium">{c.nome}</span>
              </div>
              <span className="text-muted-foreground shrink-0 num">
                Freq {c.frequencia.toFixed(1)} · CPR 7d {c.cpr7d !== null && c.cpr7d !== undefined ? fmtBRL(c.cpr7d) : "—"} · {fmtDelta(c.cprDelta7dPct ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const CreativeCard = ({ c, cprMedio, onPreview }: { c: CriativoItem; cprMedio: number; onPreview: () => void }) => {
  const cplBom = cprMedio > 0 && c.cpr !== null && c.cpr <= cprMedio;
  const cplOk = cprMedio > 0 && c.cpr !== null && c.cpr <= cprMedio * 1.2;
  const cplCor = c.cpr === null ? "text-muted-foreground" : cplBom ? "text-success" : cplOk ? "text-warning" : "text-danger";

  return (
    <article className="group rounded-xl border border-border bg-card overflow-hidden shadow-card hover:border-primary/40 hover:shadow-elevated transition-all">
      <div className="relative aspect-video bg-muted/40 overflow-hidden">
        {c.thumb ? (
          <img src={c.thumb} alt={c.nome} className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="h-full w-full grid place-items-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {c.formato === "video" && (
          <div className="absolute inset-0 grid place-items-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="h-12 w-12 rounded-full bg-background/90 grid place-items-center shadow-elevated">
              <Play className="h-5 w-5 text-foreground fill-foreground ml-0.5" />
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span
            className={cn("h-2 w-2 rounded-full ring-2 ring-background/60", c.status === "ativo" ? "bg-success" : "bg-muted-foreground")}
            title={c.status === "ativo" ? "Ativo" : "Pausado"}
          />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-foreground bg-background/70 backdrop-blur px-1.5 py-0.5 rounded">
            {c.formato === "video" ? "Vídeo" : c.formato === "carrossel" ? "Carrossel" : "Imagem"}
          </span>
        </div>
        {c.isFadiga && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-warning bg-warning/15 border border-warning/30 px-1.5 py-0.5 rounded">
            <AlertTriangle className="h-3 w-3" /> Fadiga
          </div>
        )}
      </div>

      <div className="p-4 space-y-3.5">
        <header>
          <h3 className="text-sm font-semibold leading-tight truncate" title={c.nome}>{c.nome}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5" title={c.campanhaNome}>{c.campanhaNome}</p>
        </header>

        <div className="rounded-lg bg-background/40 border border-border/60 p-3 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <Metric label="Invest." value={fmtBRL(c.investimento, { compact: true })} small />
            <Metric label="Result." value={fmtNum(c.results)} small />
            <Metric label="Cliques" value={fmtNum(c.cliques)} small />
            <Metric label="CTR" value={fmtPct(c.ctr, 2)} small />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
            <Metric
              label="CPR"
              value={c.cpr !== null ? fmtBRL(c.cpr) : "—"}
              highlight
              valueClass={cplCor}
              hint="Custo médio por cada conversa iniciada no WhatsApp ou lead gerado no formulário, conforme calculado pelo Meta Ads Manager (campo cost_per_action_type da Graph API). Diferente do CPC, que mede custo por clique no anúncio."
            />
            <Metric
              label="CPC"
              value={c.cpc > 0 ? fmtBRL(c.cpc) : "—"}
              highlight
              valueClass="text-primary"
              hint="Custo médio por clique no anúncio. Calculado como investimento total dividido por cliques. Diferente do CPR, que mede custo por conversa iniciada."
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <RankingBadge label="Qualidade" ranking={c.qualidade} />
          <RankingBadge label="Engajamento" ranking={c.engajamento} />
          <RankingBadge label="Conversão" ranking={c.conversao} />
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
          <span className="text-muted-foreground">Frequência</span>
          <span className={cn("inline-flex items-center gap-1 font-medium num", c.frequencia > 3 ? "text-warning" : "text-foreground")}>
            {c.frequencia > 3 && <AlertTriangle className="h-3 w-3" />}
            {c.frequencia.toFixed(2)}
          </span>
        </div>

        {c.formato === "video" && (c.hookRate !== undefined || c.holdRate !== undefined) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-md border border-border/60 bg-background/40 p-2 cursor-help">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hook rate</p>
                  <p className="font-semibold num">{(c.hookRate ?? 0).toFixed(1).replace(".", ",")}%</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>% de impressões que iniciaram o vídeo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-md border border-border/60 bg-background/40 p-2 cursor-help">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hold rate</p>
                  <p className="font-semibold num">{(c.holdRate ?? 0).toFixed(1).replace(".", ",")}%</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>% de impressões que assistiram até o thruplay</TooltipContent>
            </Tooltip>
          </div>
        )}

        <Button onClick={onPreview} variant="outline" className="w-full border-border bg-background/50 hover:bg-accent gap-2">
          <Eye className="h-4 w-4" /> Ver preview
        </Button>
      </div>
    </article>
  );
};

const Metric = ({
  label,
  value,
  highlight,
  small,
  valueClass,
  hint,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  small?: boolean;
  valueClass?: string;
  hint?: string;
}) => (
  <div className={cn(highlight && "relative")}>
    <p className={cn(
      "uppercase tracking-wider text-muted-foreground font-medium inline-flex items-center gap-1",
      small ? "text-[9px]" : "text-[10px]"
    )}>
      {label}
      {hint && <InfoHint text={hint} />}
    </p>
    <p className={cn("font-semibold num", highlight ? "text-lg" : small ? "text-xs" : "text-sm", valueClass)}>{value}</p>
  </div>
);

export default Criativos;
