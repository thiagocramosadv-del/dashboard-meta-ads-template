import { useEffect, useState } from "react";
import {
  aggregateCostPerResultFromInsights,
  countConversionsFromInsight,
  fetchMeta,
  MetaAuthError,
  MetaInsight,
  pickResultMetric,
  ResultMetric,
  toMetaDate,
} from "@/lib/metaAds";
import { useCampaigns } from "@/contexts/CampaignsContext";

export type CriativoFormato = "imagem" | "video" | "carrossel";
export type CriativoStatus = "ativo" | "pausado";
export type RankingValor = "acima" | "media" | "abaixo" | "desconhecido";

export interface CriativoItem {
  id: string;
  nome: string;
  status: CriativoStatus;
  campanhaId: string;
  campanhaNome: string;
  adsetNome: string;
  formato: CriativoFormato;
  thumb: string;
  videoId?: string;
  resultMetric: ResultMetric;
  // métricas período completo
  investimento: number;
  conversas: number;
  /** "Resultados" oficiais do Meta para o objective desta campanha */
  results: number;
  cliques: number;
  impressoes: number;
  reach: number;
  frequencia: number;
  ctr: number;
  cpc: number;
  /** Custo por Resultado oficial (cost_per_action_type ponderado) */
  cpr: number | null;
  // vídeo
  hookRate?: number;
  holdRate?: number;
  // rankings
  qualidade: RankingValor;
  engajamento: RankingValor;
  conversao: RankingValor;
  // fadiga
  cpr7d?: number | null;
  cprDelta7dPct?: number; // (cpr7d - cpr) / cpr * 100
  isFadiga: boolean;
  // preview do criativo
  objectStorySpec?: any;
}

export interface CriativosData {
  items: CriativoItem[];
  cprMedio: number;
}

function mapStatus(effective?: string, status?: string): CriativoStatus {
  const s = (effective ?? status ?? "").toUpperCase();
  return s === "ACTIVE" ? "ativo" : "pausado";
}

function mapRanking(v?: string): RankingValor {
  const s = (v ?? "").toUpperCase();
  if (s === "ABOVE_AVERAGE") return "acima";
  if (s === "AVERAGE") return "media";
  if (s.startsWith("BELOW_AVERAGE")) return "abaixo";
  return "desconhecido";
}

function detectFormato(creative: any): CriativoFormato {
  if (creative?.video_id) return "video";
  if (creative?.object_type === "SHARE" && Array.isArray(creative?.asset_feed_spec?.videos) && creative.asset_feed_spec.videos.length > 0)
    return "video";
  if (Array.isArray(creative?.asset_feed_spec?.videos) && creative.asset_feed_spec.videos.length > 0)
    return "video";
  if (creative?.object_type === "CAROUSEL" || Array.isArray(creative?.object_story_spec?.link_data?.child_attachments))
    return "carrossel";
  return "imagem";
}

function aggregate(inss: MetaInsight[]) {
  let spend = 0, impr = 0, clicks = 0, reach = 0, conv = 0;
  let videoPlays = 0, thruplays = 0;
  let freqWeighted = 0, freqWeight = 0;
  let qual: string | undefined, eng: string | undefined, conr: string | undefined;
  for (const ins of inss) {
    spend += Number(ins.spend) || 0;
    impr += Number(ins.impressions) || 0;
    clicks += Number(ins.clicks) || 0;
    reach += Number(ins.reach) || 0;
    conv += countConversionsFromInsight(ins);
    const f = Number(ins.frequency) || 0;
    if (f > 0 && (Number(ins.impressions) || 0) > 0) {
      freqWeighted += f * (Number(ins.impressions) || 0);
      freqWeight += Number(ins.impressions) || 0;
    }
    const vp = (ins as any).video_play_actions;
    if (Array.isArray(vp) && vp.length > 0) videoPlays += Number(vp[0].value) || 0;
    const tp = (ins as any).video_thruplay_watched_actions;
    if (Array.isArray(tp) && tp.length > 0) thruplays += Number(tp[0].value) || 0;
    qual = qual ?? (ins as any).quality_ranking;
    eng = eng ?? (ins as any).engagement_rate_ranking;
    conr = conr ?? (ins as any).conversion_rate_ranking;
  }
  const frequencia = freqWeight > 0 ? freqWeighted / freqWeight : (reach > 0 ? impr / reach : 0);
  return {
    spend, impr, clicks, reach, conv, frequencia,
    videoPlays, thruplays,
    qualidade: mapRanking(qual),
    engajamento: mapRanking(eng),
    conversao: mapRanking(conr),
  };
}

const INSIGHT_FIELDS =
  "spend,clicks,impressions,reach,frequency,ctr,cpc,actions,cost_per_action_type,video_play_actions,video_thruplay_watched_actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking";

const AD_FIELDS = (timeRange: string, recentRange: string) =>
  `id,name,status,effective_status,campaign{id,name,objective},adset{id,name},` +
  `creative{id,name,thumbnail_url,image_url,video_id,object_type,object_story_spec,asset_feed_spec},` +
  `insights.time_range(${timeRange}){${INSIGHT_FIELDS}},` +
  `recent:insights.time_range(${recentRange}){spend,impressions,actions,cost_per_action_type,frequency}`;

function lastNDaysRange(to: Date, days: number) {
  const end = new Date(to);
  const start = new Date(to);
  start.setDate(start.getDate() - (days - 1));
  return { from: start, to: end };
}

export function useMetaCreatives(from: Date, to: Date) {
  const { effectiveCampaignIds } = useCampaigns();
  const [data, setData] = useState<CriativosData | null>(null);
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
    const recent = lastNDaysRange(to, 7);
    const recent_range = JSON.stringify({ since: toMetaDate(recent.from), until: toMetaDate(recent.to) });

    (async () => {
      try {
        const ads = await fetchMeta<any>({
          endpoint: "ads",
          params: {
            fields: AD_FIELDS(time_range, recent_range),
            limit: 50,
          },
          campaignIds: effectiveCampaignIds,
        });
        if (cancelled) return;

        const items: CriativoItem[] = ads.map((ad: any) => {
          const inss: MetaInsight[] = ad?.insights?.data ?? [];
          const recentInss: MetaInsight[] = ad?.recent?.data ?? [];
          const t = aggregate(inss);
          const r7 = aggregate(recentInss);

          const metric = pickResultMetric(
            ad?.campaign?.objective,
            undefined
          );

          const cprAgg = aggregateCostPerResultFromInsights(inss, ad?.campaign?.objective);
          const cprAgg7d = aggregateCostPerResultFromInsights(recentInss, ad?.campaign?.objective);
          const cpr = cprAgg.cpr;
          const cpr7d = cprAgg7d.cpr;
          const cprDelta7dPct = cpr !== null && cpr > 0 && cpr7d !== null ? ((cpr7d - cpr) / cpr) * 100 : 0;
          const isFadiga = t.frequencia > 3 && cpr7d !== null && cpr !== null && cpr > 0 && cprDelta7dPct > 30;

          const creative = ad?.creative ?? {};
          const formato = detectFormato(creative);
          const hookRate = formato === "video" && t.impr > 0 ? (t.videoPlays / t.impr) * 100 : undefined;
          const holdRate = formato === "video" && t.impr > 0 ? (t.thruplays / t.impr) * 100 : undefined;

          return {
            id: String(ad.id),
            nome: ad.name ?? "—",
            status: mapStatus(ad.effective_status, ad.status),
            campanhaId: String(ad?.campaign?.id ?? ""),
            campanhaNome: ad?.campaign?.name ?? "—",
            adsetNome: ad?.adset?.name ?? "—",
            formato,
            thumb: creative?.thumbnail_url ?? creative?.image_url ?? "",
            videoId: creative?.video_id,
            resultMetric: metric,
            investimento: t.spend,
            conversas: t.conv,
            results: cprAgg.results,
            cliques: t.clicks,
            impressoes: t.impr,
            reach: t.reach,
            frequencia: t.frequencia,
            ctr: t.impr > 0 ? (t.clicks / t.impr) * 100 : 0,
            cpc: t.clicks > 0 ? t.spend / t.clicks : 0,
            cpr,
            hookRate,
            holdRate,
            qualidade: t.qualidade,
            engajamento: t.engajamento,
            conversao: t.conversao,
            cpr7d,
            cprDelta7dPct,
            isFadiga,
            objectStorySpec: creative?.object_story_spec,
          };
        });

        const totalSpend = items.reduce((s, x) => s + x.investimento, 0);
        const totalResults = items.reduce((s, x) => s + x.results, 0);
        const cprMedio = totalResults > 0 ? totalSpend / totalResults : 0;

        setData({ items, cprMedio });
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
