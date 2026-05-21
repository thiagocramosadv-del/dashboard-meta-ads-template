import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Filter, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchMeta } from "@/lib/metaAds";
import { Scope } from "@/lib/scopedCampaignSelection";
import { useScopedCampaignSelection } from "@/hooks/useScopedCampaignSelection";
import { cn } from "@/lib/utils";

interface CampaignLite {
  id: string;
  name: string;
  effective_status?: string;
  status?: string;
}

const isActiveStatus = (s?: string) => !!s && s.toUpperCase() === "ACTIVE";

export const ScopedCampaignFilter = ({ scope }: { scope: Scope }) => {
  // Reaproveita o cache do React Query da CampaignsContext.
  const { data: campaigns = [], isLoading } = useQuery<CampaignLite[]>({
    queryKey: ["meta", "campaigns"],
    queryFn: async () =>
      fetchMeta<CampaignLite>({
        endpoint: "campaigns",
        params: { fields: "id,name,status,effective_status", limit: 200 },
      }),
    staleTime: 60_000,
  });

  const allIds = useMemo(() => campaigns.map((c) => c.id), [campaigns]);
  const sel = useScopedCampaignSelection(scope, allIds);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => [...campaigns].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [campaigns]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(q));
  }, [sorted, query]);

  // Garante que ids selecionados que não existem mais sejam removidos
  useEffect(() => {
    if (!sel.selectedSet || campaigns.length === 0) return;
    const valid = new Set(allIds);
    const cleaned = new Set(Array.from(sel.selectedSet).filter((id) => valid.has(id)));
    if (cleaned.size !== sel.selectedSet.size) sel.setIds(Array.from(cleaned));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns.length]);

  const label = sel.isAllSelected
    ? "Todas as campanhas"
    : sel.selectedCount === 0
    ? "Todas as campanhas"
    : `${sel.selectedCount} ${sel.selectedCount === 1 ? "campanha selecionada" : "campanhas selecionadas"}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-11 sm:h-10 gap-2 border-border bg-card hover:bg-accent min-w-0 sm:min-w-[200px] flex-1 sm:flex-none justify-between"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-sm">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-[360px] p-0"
        align="end"
        collisionPadding={16}
      >
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar campanha…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <button
              onClick={sel.selectAll}
              className="text-primary hover:underline font-medium"
            >
              Selecionar todas
            </button>
            <button
              onClick={sel.clearAll}
              className="text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="max-h-[340px] overflow-y-auto py-1">
          {isLoading && (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              Carregando campanhas…
            </p>
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              Nenhuma campanha encontrada.
            </p>
          )}
          {filtered.map((c) => {
            const checked = sel.isAllSelected
              ? false
              : !!sel.selectedSet?.has(c.id);
            const active = isActiveStatus(c.effective_status ?? c.status);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => sel.toggle(c.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 text-left min-h-[40px]"
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                    checked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input bg-background"
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </div>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    active ? "bg-success" : "bg-muted-foreground/40"
                  )}
                  aria-label={active ? "Ativa" : "Pausada"}
                />
                <span className="text-sm truncate flex-1">{c.name}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
