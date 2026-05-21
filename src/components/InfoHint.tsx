import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Acessível em desktop (hover/click) e mobile (toque).
 * Usa Popover do Radix porque tooltips de hover não funcionam em touch.
 */
export const InfoHint = ({ text, className, iconClassName }: Props) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label="Mais informações"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center justify-center rounded-full p-0.5 -m-0.5 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          className
        )}
      >
        <Info className={cn("h-3 w-3 text-muted-foreground/70", iconClassName)} />
      </button>
    </PopoverTrigger>
    <PopoverContent
      side="top"
      align="center"
      className="w-[260px] max-w-[calc(100vw-2rem)] text-xs leading-relaxed"
    >
      {text}
    </PopoverContent>
  </Popover>
);
