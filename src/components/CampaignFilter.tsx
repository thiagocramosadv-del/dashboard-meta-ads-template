import { useMemo, useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, Filter, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCampaigns } from "@/contexts/CampaignsContext";
import { cn } from "@/lib/utils";

const isActiveStatus = (s?: string) =>
  !!s && (s === "ACTIVE" || s.toUpperCase() === "ACTIVE");

export const CampaignFilter = () => {
  const {
    campaigns,
    loading,
    selectedIds,
    isAllSelected,
    toggleSelected,
    selectAll,
    clearAll,
    isExcludedFromChampion,
    toggleExcludedFromChampion,
  } = useCampaigns();

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

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const label = isAllSelected
    ? "Todas as campanhas"
    : `${selectedIds.length} ${selectedIds.length === 1 ? "campanha selecionada" : "campanhas selecionadas"}`;

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
              onClick={selectAll}
              className="text-primary hover:underline font-medium"
            >
              Selecionar todas
            </button>
            <button
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="max-h-[340px] overflow-y-auto py-1">
          {loading && (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              Carregando campanhas…
            </p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              Nenhuma campanha encontrada.
            </p>
          )}
          {filtered.map((c) => {
            const checked = selectedSet.has(c.id);
            const active = isActiveStatus(c.effective_status ?? c.status);
            const excluded = isExcludedFromChampion(c.id);
            return (
              <div
                key={c.id}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 group min-h-[40px]"
              >
                <button
                  type="button"
                  onClick={() => toggleSelected(c.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExcludedFromChampion(c.id);
                      }}
                      className={cn(
                        "p-1 rounded hover:bg-accent shrink-0 transition-colors",
                        excluded ? "text-warning" : "text-muted-foreground/60 hover:text-foreground"
                      )}
                      aria-label="Excluir do cálculo de Criativo Campeão"
                    >
                      {excluded ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    {excluded
                      ? "Incluir no cálculo de Criativo Campeão"
                      : "Excluir do cálculo de Criativo Campeão"}
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
