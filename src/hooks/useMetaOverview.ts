import { useEffect, useState } from "react";
import {
  aggregateCostPerResult,
  aggregateCostPerResultFromInsights,
  aggregateInsights,
  cpc,
  countConversionsFromInsight,
  ctr,
  deltaPct,
  fetchMeta,
  frequenciaPond,
  MetaAuthError,
  MetaInsight,
  previousRange,
  toMetaDate,
  Totais,
} from "@/lib/metaAds";
import { useCampaigns } from "@/contexts/CampaignsContext";

export interface OverviewKpis {
  totais: Totais;
  ctr: number;
  cpc: number;
  /** Custo por Resultado oficial, ponderado pelas campanhas */
  cpr: number | null;
  /** Total de "Resultados" oficiais somados das campanhas */
  results: number;
  frequencia: number;
  deltas: {
    spend: number;
    conversas: number;
    cpr: number;
    ctr: number;
    frequencia: number;
  };
}

export interface SerieDia {
  data: string;
  investimento: number;
  conversas: number;
}

export interface PlacementSlice {
  name: string;
  value: number;
}

export interface RegiaoRow {
  nome: string;
  conversas: number;
  cpl: number;
  spend: number;
}

export interface CriativoRow {
  id: string;
  nome: string;
  campanhaNome: string;
  campanhaId: string;
  thumb: string;
  conversas: number;
  investimento: number;
  cpl: number | null;
  adActive: boolean;
  campaignActive: boolean;
}

export interface OverviewData {
  kpis: OverviewKpis;
  serie: SerieDia[];
  placement: PlacementSlice[];
  regioes: RegiaoRow[];
  topCriativos: CriativoRow[];
  champion: CriativoRow | null;
}

const PLACEMENT_LABEL: Record<string, string> = {
  facebook: "Feed",
  instagram: "Stories/Reels",
  audience_network: "Audience Network",
  messenger: "Messenger",
};

function isStrictlyActive(effective?: string, configured?: string): boolean {
  const eff = (effective ?? "").toUpperCase();
  const status = (configured ?? "").toUpperCase();
  return eff === "ACTIVE" && (!status || status === "ACTIVE");
}

export function useMetaOverview(from: Date, to: Date) {
  const { effectiveCampaignIds, excludedFromChampion } = useCampaigns();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const campaignKey = effectiveCampaignIds.join(",");
  const excludedKey = excludedFromChampion.join(",");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAuthError(false);

    const time_range = JSON.stringify({ since: toMetaDate(from), until: toMetaDate(to) });
    const prev = previousRange(from, to);
    const prev_range = JSON.stringify({ since: toMetaDate(prev.from), until: toMetaDate(prev.to) });

    (async () => {
      try {
        const insightFields = "spend,impressions,clicks,reach,frequency,ctr,cpc,actions";

        // Para CPR oficial precisamos chamar /campaigns com cost_per_action_type
        const campaignFieldsActual = `id,name,objective,insights.time_range(${time_range}){spend,actions,cost_per_action_type}`;
        const campaignFieldsPrev = `id,name,objective,insights.time_range(${prev_range}){spend,actions,cost_per_action_type}`;

        const [
          atualArr,
          anteriorArr,
          serieArr,
          placementArr,
          regiaoArr,
          adsArr,
          campaignsActual,
          campaignsPrev,
        ] = await Promise.all([
          fetchMeta<MetaInsight>({
            endpoint: "insights",
            params: { time_range, fields: insightFields, level: "account" },
            campaignIds: effectiveCampaignIds,
          }),
          fetchMeta<MetaInsight>({
            endpoint: "insights",
            params: { time_range: prev_range, fields: insightFields, level: "account" },
            campaignIds: effectiveCampaignIds,
          }),
          fetchMeta<MetaInsight>({
            endpoint: "insights",
            params: {
              time_range,
              fields: "spend,impressions,clicks,actions",
              time_increment: 1,
              level: "account",
            },
            campaignIds: effectiveCampaignIds,
          }),
          fetchMeta<MetaInsight>({
            endpoint: "insights",
            params: {
              time_range,
              fields: "impressions,spend,actions",
              breakdowns: "publisher_platform",
              level: "account",
            },
            campaignIds: effectiveCampaignIds,
          }),
          fetchMeta<MetaInsight>({
            endpoint: "insights",
            params: {
              time_range,
              fields: "spend,actions",
              breakdowns: "region",
              level: "account",
              limit: 50,
            },
            campaignIds: effectiveCampaignIds,
          }),
          fetchMeta<any>({
            endpoint: "ads",
            params: {
              fields: `id,name,status,effective_status,campaign{id,name,objective,status,effective_status},creative{thumbnail_url,image_url},insights.time_range(${time_range}){spend,actions,cost_per_action_type}`,
              limit: 50,
            },
            campaignIds: effectiveCampaignIds,
          }),
          fetchMeta<any>({
            endpoint: "campaigns",
            params: { fields: campaignFieldsActual, limit: 25 },
          }),
          fetchMeta<any>({
            endpoint: "campaigns",
            params: { fields: campaignFieldsPrev, limit: 25 },
          }),
        ]);

        if (cancelled) return;

        const totais = aggregateInsights(atualArr);
        const totaisAnt = aggregateInsights(anteriorArr);

        const allowed = effectiveCampaignIds.length > 0 ? new Set(effectiveCampaignIds) : null;
        const aggAtual = aggregateCostPerResult(campaignsActual, allowed);
        const aggAnt = aggregateCostPerResult(campaignsPrev, allowed);

        const kpis: OverviewKpis = {
          totais,
          ctr: ctr(totais),
          cpc: cpc(totais),
          cpr: aggAtual.cpr,
          results: aggAtual.results,
          frequencia: frequenciaPond(totais),
          deltas: {
            spend: deltaPct(totais.spend, totaisAnt.spend),
            conversas: deltaPct(totais.conversas, totaisAnt.conversas),
            cpr: aggAtual.cpr !== null && aggAnt.cpr !== null ? deltaPct(aggAtual.cpr, aggAnt.cpr) : 0,
            ctr: deltaPct(ctr(totais), ctr(totaisAnt)),
            frequencia: deltaPct(frequenciaPond(totais), frequenciaPond(totaisAnt)),
          },
        };

        const serie: SerieDia[] = serieArr.map((d) => ({
          data: d.date_start ?? "",
          investimento: Number(d.spend) || 0,
          conversas: countConversionsFromInsight(d),
        }));

        const placementMap = new Map<string, number>();
        for (const p of placementArr) {
          const k = p.publisher_platform ?? "outros";
          placementMap.set(k, (placementMap.get(k) ?? 0) + (Number(p.impressions) || 0));
        }
        const placement: PlacementSlice[] = Array.from(placementMap.entries())
          .map(([k, v]) => ({ name: PLACEMENT_LABEL[k] ?? k, value: v }))
          .sort((a, b) => b.value - a.value);

        const regioes: RegiaoRow[] = regiaoArr
          .map((r) => {
            const conv = countConversionsFromInsight(r);
            const spend = Number(r.spend) || 0;
            return {
              nome: r.region ?? "—",
              conversas: conv,
              spend,
              cpl: conv > 0 ? spend / conv : 0,
            };
          })
          .sort((a, b) => b.conversas - a.conversas);

        // Criativos: usa spend/results pela cascata robusta do CPR.
        const criativos: CriativoRow[] = (adsArr as any[]).map((ad) => {
          const inss: MetaInsight[] = ad?.insights?.data ?? [];
          const agg = aggregateCostPerResultFromInsights(inss, ad?.campaign?.objective);
          return {
            id: String(ad.id),
            nome: ad.name ?? "—",
            campanhaNome: ad?.campaign?.name ?? "—",
            campanhaId: String(ad?.campaign?.id ?? ""),
            thumb: ad?.creative?.thumbnail_url ?? ad?.creative?.image_url ?? "",
            conversas: agg.results,
            investimento: agg.spend,
            cpl: agg.cpr,
            adActive: isStrictlyActive(ad?.effective_status, ad?.status),
            campaignActive: isStrictlyActive(ad?.campaign?.effective_status, ad?.campaign?.status),
          };
        });

        const excludedSet = new Set(excludedFromChampion);
        const selectedSet = effectiveCampaignIds.length > 0 ? new Set(effectiveCampaignIds) : null;
        const champion =
          criativos
            .filter(
              (c) =>
                c.adActive &&
                c.campaignActive &&
                (!selectedSet || selectedSet.has(c.campanhaId)) &&
                c.conversas >= 10 &&
                c.investimento >= 100 &&
                c.cpl !== null &&
                !excludedSet.has(c.campanhaId)
            )
            .sort((a, b) => (a.cpl ?? Number.POSITIVE_INFINITY) - (b.cpl ?? Number.POSITIVE_INFINITY))[0] ?? null;

        const topCriativos = criativos
          .filter((c) => c.conversas >= 3 && c.cpl !== null)
          .sort((a, b) => (a.cpl ?? Number.POSITIVE_INFINITY) - (b.cpl ?? Number.POSITIVE_INFINITY))
          .slice(0, 3);

        setData({ kpis, serie, placement, regioes, topCriativos, champion });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof MetaAuthError) {
          setAuthError(true);
        }
        setError(e instanceof Error ? e.message : "Erro inesperado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [from.getTime(), to.getTime(), campaignKey, excludedKey]);

  return { data, loading, error, authError };
}
