import { useEffect, useState } from "react";
import {
  countConversionsFromInsight,
  fetchMeta,
  MetaAuthError,
  MetaInsight,
  toMetaDate,
} from "@/lib/metaAds";
import { useCampaigns } from "@/contexts/CampaignsContext";

export interface IdadeRow {
  faixa: string;
  masc: number;
  fem: number;
  cplMasc: number;
  cplFem: number;
}

export interface RegiaoRow {
  nome: string;
  conversas: number;
  investimento: number;
  cpl: number;
}

export interface SliceRow {
  nome: string;
  valor: number; // investimento
  conversas: number;
}

export interface HeatCell {
  dia: number; // 0 = Dom, 6 = Sáb
  hora: number; // 0..23
  conversas: number;
  spend: number;
  cpl: number;
}

export interface AudienceData {
  idade: IdadeRow[];
  regioes: RegiaoRow[];
  placement: SliceRow[];
  dispositivo: SliceRow[];
  heat: HeatCell[];
}

const FAIXAS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

function bucketAge(age: string): string {
  // O Meta retorna "18-24","25-34",..."65+" diretamente
  if (FAIXAS.includes(age)) return age;
  // tentativas de fallback
  const n = parseInt(age, 10);
  if (Number.isFinite(n)) {
    if (n < 25) return "18-24";
    if (n < 35) return "25-34";
    if (n < 45) return "35-44";
    if (n < 55) return "45-54";
    if (n < 65) return "55-64";
    return "65+";
  }
  return age;
}

const PLACEMENT_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  messenger: "Messenger",
  audience_network: "Audience Network",
  whatsapp: "WhatsApp",
  unknown: "Outros",
};

export const PLACEMENT_COLORS: Record<string, string> = {
  Facebook: "hsl(var(--primary))",
  Instagram: "hsl(var(--success))",
  Messenger: "hsl(var(--warning))",
  "Audience Network": "hsl(var(--info))",
  WhatsApp: "hsl(var(--danger))",
  Outros: "hsl(var(--muted-foreground))",
};

export const DEVICE_COLORS: Record<string, string> = {
  Mobile: "hsl(var(--primary))",
  Desktop: "hsl(var(--success))",
  Outros: "hsl(var(--muted-foreground))",
};

function deviceBucket(d: string): "Mobile" | "Desktop" | "Outros" {
  const k = (d ?? "").toLowerCase();
  if (
    k.startsWith("mobile") ||
    k.startsWith("android") ||
    k === "iphone" ||
    k === "ipad" ||
    k === "ipod"
  ) return "Mobile";
  if (k.startsWith("desktop")) return "Desktop";
  return "Outros";
}

function parseHourBucket(s?: string): number | null {
  // "00:00:00 - 00:59:59"
  if (!s) return null;
  const m = /^(\d{2}):/.exec(s);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  return Number.isFinite(h) ? h : null;
}

export function useMetaAudience(from: Date, to: Date) {
  const { effectiveCampaignIds } = useCampaigns();
  const [data, setData] = useState<AudienceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const campaignKey = effectiveCampaignIds.join(",");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAuthError(false);

    const time_range = JSON.stringify({ since: toMetaDate(from), until: toMetaDate(to) });
    const baseFields = "spend,clicks,impressions,reach,actions,ctr,cpc,frequency";

    const call = (breakdowns: string, extra: Record<string, unknown> = {}) =>
      fetchMeta<MetaInsight>({
        endpoint: "insights",
        params: {
          time_range,
          fields: baseFields,
          level: "account",
          breakdowns,
          limit: 500,
          ...extra,
        },
        campaignIds: effectiveCampaignIds,
      });

    (async () => {
      try {
        const [ageGenderArr, regionArr, placementArr, deviceArr, hourArr] = await Promise.all([
          call("age,gender"),
          call("region"),
          call("publisher_platform"),
          call("impression_device"),
          // Para heatmap precisamos dia + hora -> time_increment=1 + breakdown horário
          call("hourly_stats_aggregated_by_advertiser_time_zone", { time_increment: 1 }),
        ]);

        if (cancelled) return;

        // === Idade & Gênero ===
        const idadeMap = new Map<string, IdadeRow>();
        for (const f of FAIXAS) idadeMap.set(f, { faixa: f, masc: 0, fem: 0, cplMasc: 0, cplFem: 0 });
        // acumuladores de spend para CPL
        const spendByFaixaGen = new Map<string, { masc: number; fem: number }>();
        for (const f of FAIXAS) spendByFaixaGen.set(f, { masc: 0, fem: 0 });

        for (const row of ageGenderArr) {
          const faixa = bucketAge((row as any).age ?? "");
          if (!idadeMap.has(faixa)) continue;
          const conv = countConversionsFromInsight(row);
          const spend = Number(row.spend) || 0;
          const gen = ((row as any).gender ?? "unknown").toLowerCase();
          const tgt = idadeMap.get(faixa)!;
          const sp = spendByFaixaGen.get(faixa)!;
          if (gen === "male") {
            tgt.masc += conv;
            sp.masc += spend;
          } else if (gen === "female") {
            tgt.fem += conv;
            sp.fem += spend;
          }
        }
        const idade: IdadeRow[] = FAIXAS.map((f) => {
          const r = idadeMap.get(f)!;
          const sp = spendByFaixaGen.get(f)!;
          return {
            ...r,
            cplMasc: r.masc > 0 ? sp.masc / r.masc : 0,
            cplFem: r.fem > 0 ? sp.fem / r.fem : 0,
          };
        });

        // === Região ===
        const regionMap = new Map<string, { conversas: number; spend: number }>();
        for (const row of regionArr) {
          const k = (row as any).region ?? "—";
          const cur = regionMap.get(k) ?? { conversas: 0, spend: 0 };
          cur.conversas += countConversionsFromInsight(row);
          cur.spend += Number(row.spend) || 0;
          regionMap.set(k, cur);
        }
        const regioes: RegiaoRow[] = Array.from(regionMap.entries())
          .map(([nome, v]) => ({
            nome,
            conversas: v.conversas,
            investimento: v.spend,
            cpl: v.conversas > 0 ? v.spend / v.conversas : 0,
          }))
          .sort((a, b) => b.conversas - a.conversas)
          .slice(0, 10);

        // === Placement (por CONVERSAS) — top 4 ===
        const placementMap = new Map<string, { spend: number; conv: number }>();
        for (const row of placementArr) {
          const k = ((row as any).publisher_platform ?? "unknown").toLowerCase();
          const label = PLACEMENT_LABEL[k] ?? (k.charAt(0).toUpperCase() + k.slice(1));
          const cur = placementMap.get(label) ?? { spend: 0, conv: 0 };
          cur.spend += Number(row.spend) || 0;
          cur.conv += countConversionsFromInsight(row);
          placementMap.set(label, cur);
        }
        const placement: SliceRow[] = Array.from(placementMap.entries())
          .map(([nome, v]) => ({ nome, valor: v.conv, conversas: v.conv }))
          .filter((s) => s.valor > 0)
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 4);

        // === Dispositivo (por CONVERSAS) — buckets simples ===
        const deviceMap = new Map<string, { spend: number; conv: number }>();
        for (const row of deviceArr) {
          const raw = (row as any).impression_device ?? "";
          const label = deviceBucket(raw);
          const cur = deviceMap.get(label) ?? { spend: 0, conv: 0 };
          cur.spend += Number(row.spend) || 0;
          cur.conv += countConversionsFromInsight(row);
          deviceMap.set(label, cur);
        }
        const dispositivo: SliceRow[] = Array.from(deviceMap.entries())
          .map(([nome, v]) => ({ nome, valor: v.conv, conversas: v.conv }))
          .filter((s) => s.valor > 0)
          .sort((a, b) => b.valor - a.valor);

        // === Heatmap dia x hora ===
        const heatAgg = new Map<string, { conv: number; spend: number }>();
        for (const row of hourArr) {
          const hora = parseHourBucket((row as any).hourly_stats_aggregated_by_advertiser_time_zone);
          const dateStr = (row as any).date_start;
          if (hora === null || !dateStr) continue;
          const d = new Date(dateStr + "T00:00:00");
          if (isNaN(d.getTime())) continue;
          const dia = d.getDay(); // 0..6
          const key = `${dia}-${hora}`;
          const cur = heatAgg.get(key) ?? { conv: 0, spend: 0 };
          cur.conv += countConversionsFromInsight(row);
          cur.spend += Number(row.spend) || 0;
          heatAgg.set(key, cur);
        }
        const heat: HeatCell[] = [];
        for (let dia = 0; dia < 7; dia++) {
          for (let hora = 0; hora < 24; hora++) {
            const v = heatAgg.get(`${dia}-${hora}`) ?? { conv: 0, spend: 0 };
            heat.push({
              dia,
              hora,
              conversas: v.conv,
              spend: v.spend,
              cpl: v.conv > 0 ? v.spend / v.conv : 0,
            });
          }
        }

        setData({ idade, regioes, placement, dispositivo, heat });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof MetaAuthError) setAuthError(true);
        setError(e instanceof Error ? e.message : "Erro inesperado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [from.getTime(), to.getTime(), campaignKey]);

  return { data, loading, error, authError };
}
