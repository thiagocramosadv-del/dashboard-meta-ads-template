import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play, Image as ImageIcon } from "lucide-react";
import { fmtBRL, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CriativoItem } from "@/hooks/useMetaCreatives";

interface Props {
  item: CriativoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreativePreviewDialog = ({ item, open, onOpenChange }: Props) => {
  const isMobile = useIsMobile();

  if (!item) return null;

  const spec = item.objectStorySpec;
  const linkData = spec?.link_data;
  const videoData = spec?.video_data;

  const primaryText = videoData?.message ?? linkData?.message ?? "";
  const headline = linkData?.name ?? videoData?.title ?? "";
  const description = linkData?.description ?? "";
  const ctaLabel = linkData?.call_to_action?.type?.replace(/_/g, " ") ??
    videoData?.call_to_action?.type?.replace(/_/g, " ") ?? "";
  const link = linkData?.link ?? videoData?.link ?? "";

  const mediaUrl = item.thumb;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-lg gap-0 p-0 overflow-hidden",
          isMobile && "h-full max-h-full w-full max-w-full rounded-none border-0"
        )}
      >
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm font-semibold truncate">
            {item.nome}
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{item.campanhaNome}</p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[80vh] px-4 pb-4 space-y-4">
          {/* Primary text */}
          {primaryText && (
            <p className="text-sm leading-relaxed whitespace-pre-line">{primaryText}</p>
          )}

          {/* Media */}
          <div className="relative rounded-lg overflow-hidden bg-muted/40 border border-border">
            {mediaUrl ? (
              item.formato === "video" ? (
                <div className="relative">
                  <img
                    src={mediaUrl}
                    alt={item.nome}
                    className="w-full object-contain max-h-[400px]"
                  />
                  <div className="absolute inset-0 grid place-items-center bg-black/20">
                    <div className="h-14 w-14 rounded-full bg-background/90 grid place-items-center shadow-elevated">
                      <Play className="h-6 w-6 text-foreground fill-foreground ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={mediaUrl}
                  alt={item.nome}
                  className="w-full object-contain max-h-[400px]"
                />
              )
            ) : (
              <div className="h-48 grid place-items-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Headline + Description + CTA */}
          {(headline || description || ctaLabel) && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              {headline && (
                <p className="text-sm font-semibold leading-tight">{headline}</p>
              )}
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {ctaLabel && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wide">
                    {ctaLabel}
                  </span>
                )}
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {new URL(link).hostname}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox label="Resultados" value={fmtNum(item.results)} />
            <MetricBox
              label="CPR"
              value={item.cpr !== null ? fmtBRL(item.cpr) : "—"}
            />
            <MetricBox label="Frequência" value={item.frequencia.toFixed(2)} />
            {item.formato === "video" && item.hookRate !== undefined && (
              <MetricBox
                label="Hook Rate"
                value={`${item.hookRate.toFixed(1).replace(".", ",")}%`}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MetricBox = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border bg-background/40 p-2.5">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      {label}
    </p>
    <p className="text-sm font-semibold num mt-0.5">{value}</p>
  </div>
);
