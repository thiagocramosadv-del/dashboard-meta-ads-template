import { useMemo, useState, useRef, useEffect } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { geoMercator } from "d3-geo";
import geoData from "@/assets/br-states.json";
import { fmtBRL, fmtNum } from "@/lib/format";
import type { RegiaoRow } from "@/hooks/useMetaOverview";

interface Props {
  data: RegiaoRow[];
}

interface HoverInfo {
  x: number;
  y: number;
  nome: string;
  conversas: number;
  spend: number;
  cpl: number;
}

const MAP_W = 500;
const MAP_H = 280;

// Normalize string for matching (remove accents, lowercase)
const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const BrazilHeatMap = ({ data }: Props) => {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Index of states with spend > 0
  const byState = useMemo(() => {
    const map = new Map<string, RegiaoRow>();
    for (const r of data) {
      if (r.spend > 0) map.set(norm(r.nome), r);
    }
    return map;
  }, [data]);

  const max = useMemo(
    () => Math.max(1, ...Array.from(byState.values()).map((d) => d.spend)),
    [byState]
  );

  // Color scale by INVESTMENT (spend): from base dark to vibrant blue
  const colorScale = useMemo(
    () => scaleLinear<string>().domain([0, max]).range(["#1A2041", "#4F7FFF"]),
    [max]
  );

  // Filter geographies to only those with data, then compute fitted projection
  const { visibleFeatures, projection } = useMemo(() => {
    const all = (geoData as any).features as any[];
    const visible = all.filter((f) => byState.has(norm(f.properties.name)));
    const fc = { type: "FeatureCollection", features: visible.length ? visible : all };
    const proj = geoMercator();
    if (visible.length) {
      proj.fitExtent(
        [
          [16, 16],
          [MAP_W - 16, MAP_H - 16],
        ],
        fc as any
      );
    } else {
      proj.scale(700).center([-54, -15]).translate([MAP_W / 2, MAP_H / 2]);
    }
    return { visibleFeatures: visible, projection: proj };
  }, [byState]);

  // Close mobile tooltip on outside tap
  useEffect(() => {
    if (!hover) return;
    const onDocPointer = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setHover(null);
      }
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [hover]);

  if (data.length === 0 || visibleFeatures.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-12 text-center">
        Sem dados de região no período.
      </p>
    );
  }

  // Compute clamped tooltip position to keep it on-screen on mobile
  const computeTooltipPos = (x: number, y: number) => {
    const tw = 200;
    const th = 90;
    const pad = 8;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    let left = x + 12;
    let top = y + 12;
    if (left + tw + pad > vw) left = Math.max(pad, x - tw - 12);
    if (top + th + pad > vh) top = Math.max(pad, y - th - 12);
    return { left, top };
  };

  const tooltipPos = hover ? computeTooltipPos(hover.x, hover.y) : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <ComposableMap
        projection={projection as any}
        width={MAP_W}
        height={MAP_H}
        style={{ width: "100%", height: "auto", maxHeight: MAP_H }}
      >
        <Geographies geography={{ type: "FeatureCollection", features: visibleFeatures } as any}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name: string = geo.properties.name;
              const row = byState.get(norm(name));
              if (!row || row.spend <= 0) return null;
              const fill = colorScale(row.spend);
              const showTooltip = (clientX: number, clientY: number) => {
                setHover({
                  x: clientX,
                  y: clientY,
                  nome: name,
                  conversas: row.conversas ?? 0,
                  spend: row.spend,
                  cpl: row.cpl ?? 0,
                });
              };
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(e) => showTooltip(e.clientX, e.clientY)}
                  onMouseMove={(e) =>
                    setHover((h) =>
                      h ? { ...h, x: e.clientX, y: e.clientY } : h
                    )
                  }
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => showTooltip(e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    if (t) showTooltip(t.clientX, t.clientY);
                  }}
                  style={{
                    default: {
                      fill,
                      stroke: "hsl(var(--border))",
                      strokeWidth: 0.6,
                      outline: "none",
                      transition: "fill 0.2s",
                    },
                    hover: {
                      fill: "#6B95FF",
                      stroke: "hsl(var(--border))",
                      strokeWidth: 0.9,
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: { fill, outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {hover && tooltipPos && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md max-w-[220px]"
          style={{ left: tooltipPos.left, top: tooltipPos.top }}
        >
          <p className="font-bold mb-1">{hover.nome}</p>
          <p className="num text-primary font-semibold">
            Investimento: {fmtBRL(hover.spend)}
          </p>
          <p className="num text-muted-foreground">
            Conversas: {fmtNum(hover.conversas)}
            <span className="text-[10px] align-super ml-0.5">*</span>
          </p>
          {hover.conversas > 0 && (
            <p className="num text-muted-foreground">
              Custo por resultado: {fmtBRL(hover.cpl)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
