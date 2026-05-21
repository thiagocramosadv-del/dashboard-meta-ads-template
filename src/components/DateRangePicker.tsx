import { CalendarDays, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { fmtDateRangeBR } from "@/lib/format";
import {
  PresetKey,
  useDateRange,
} from "@/contexts/DateRangeContext";
import { useIsMobile } from "@/hooks/use-mobile";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "14d", label: "Últimos 14 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "90d", label: "Últimos 90 dias" },
  { key: "este_mes", label: "Este mês" },
  { key: "mes_passado", label: "Mês passado" },
];

export const DateRangePicker = () => {
  const { range, setPreset, setCustom } = useDateRange();
  const [open, setOpen] = useState(false);
  const [custom, setCustomState] = useState<{ from?: Date; to?: Date }>({});
  const isMobile = useIsMobile();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-11 sm:h-10 gap-2 border-border bg-card hover:bg-accent text-foreground shrink-0"
        >
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{range.label}</span>
          <span className="text-muted-foreground hidden md:inline">
            · {fmtDateRangeBR(range.from, range.to)}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="w-auto max-w-[calc(100vw-2rem)] p-0 bg-popover border-border shadow-elevated"
      >
        <div className="flex flex-col sm:flex-row max-h-[80vh] overflow-auto">
          <div className="w-full sm:w-44 border-b sm:border-b-0 sm:border-r border-border p-2 grid grid-cols-2 sm:grid-cols-1 gap-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  setPreset(p.key);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 sm:py-2 rounded-md text-sm hover:bg-accent transition-colors",
                  range.preset === p.key &&
                    "bg-primary/15 text-primary font-medium"
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => {
                setCustomState({});
                setPreset("personalizado");
              }}
              className={cn(
                "w-full text-left px-3 py-2.5 sm:py-2 rounded-md text-sm hover:bg-accent transition-colors col-span-2 sm:col-span-1",
                range.preset === "personalizado" &&
                  "bg-primary/15 text-primary font-medium"
              )}
            >
              Personalizado
            </button>
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              selected={{ from: custom.from ?? range.from, to: custom.to ?? range.to }}
              onSelect={(r) => {
                if (!r) return;
                setCustomState({ from: r.from, to: r.to });
                if (r.from && r.to) {
                  setCustom(r.from, r.to);
                }
              }}
              numberOfMonths={isMobile ? 1 : 2}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
