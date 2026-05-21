import { useEffect, useState } from "react";
import {
  aggregateCostPerResultFromInsights,
  aggregateInsights,
  cpc as cpcFn,
  ctr as ctrFn,
  fetchMeta,
  frequenciaPond,
  MetaAuthError,
  MetaInsight,
  pickResultMetric,
  ResultMetric,
  toMetaDate,
} from "@/lib/metaAds";
import { useCampaigns } from "@/contexts/CampaignsContext";
import { CampanhaStatus, mapStatus } from "./useMetaCampaigns";

export interface ConjuntoRow {
  id: string;
  nome: string;
  status: CampanhaStatus;
  campanhaId: string;
  campanhaNome: string;
  publico: string;
  investimento: number;
  conversas: number;
  results: number;
  cpr: number | null;
  resultMetric: ResultMetric;
  cliques: number;
  impressoes: number;
  ctr: number;
  cpc: number;
  frequencia: number;
}

export interface AdsetsData {
  rows: ConjuntoRow[];
  cprMedio: number;
}

const UF_BR = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]);

function resumirGeo(geo: any): string | null {
  if (!geo) return null;
  // Prioriza estados/regiões dentro do Brasil
  const regioes: string[] = (geo.regions ?? [])
    .map((r: any) => r?.key || r?.name || "")
    .filter(Boolean);
  if (regioes.length > 0) {
    // Quando vem como key tipo "BR_SC", pega só "SC"
    const ufs = regioes
      .map((r) => {
        const parts = String(r).split("_");
        const last = parts[parts.length - 1];
        return UF_BR.has(last) ? last : last;
      })
      .slice(0, 3);
    return ufs.join("/");
  }
  const cidades: string[] = (geo.cities ?? [])
    .map((c: any) => c?.name)
    .filter(Boolean)
    .slice(0, 2);
  if (cidades.length > 0) return cidades.join("/");
  const paises: string[] = (geo.countries ?? []).map(String).slice(0, 2);
  if (paises.length > 0) return paises.join("/");
  return null;
}

function resumirGenero(genders?: number[]): string | null {
  if (!genders || genders.length === 0 || genders.length === 2) return null; // ambos
  if (genders.includes(1)) return "M";
  if (genders.includes(2)) return "F";
  return null;
}

function resumirTargeting(t: any): string {
  if (!t || typeof t !== "object") return "—";
  const partes: string[] = [];
  const g = resumirGenero(t.genders);
  if (g) partes.push(g);
  const min = t.age_min;
  const max = t.age_max;
  if (min || max) partes.push(`${min ?? 18}-${max ?? 65}`);
  const geo = resumirGeo(t.geo_locations);
  if (geo) partes.push(geo);
  return partes.length ? partes.join(" · ") : "—";
}

export function useMetaAdsets(from: Date, to: Date) {
  const { effectiveCampaignIds } = useCampaigns();
  const [data, setData] = useState<AdsetsData | null>(null);
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

    (async () => {
      try {
        const arr = await fetchMeta<any>({
          endpoint: "adsets",
          params: {
            fields: `id,name,status,effective_status,optimization_goal,campaign_id,campaign{name,objective},targeting,insights.time_range(${time_range}){spend,clicks,impressions,reach,actions,cost_per_action_type,frequency,ctr,cpc}`,
            limit: 50,
          },
          campaignIds: effectiveCampaignIds,
        });
        if (cancelled) return;

        const rows: ConjuntoRow[] = arr.map((c: any) => {
          const inss: MetaInsight[] = c?.insights?.data ?? [];
          const t = aggregateInsights(inss);
          const metric = pickResultMetric(
            c?.campaign?.objective,
            c?.optimization_goal ?? c?.campaign?.optimization_goal
          );
          const cprAgg = aggregateCostPerResultFromInsights(
            inss,
            c?.campaign?.objective,
            c?.optimization_goal ?? c?.campaign?.optimization_goal
          );
          return {
            id: String(c.id),
            nome: c.name ?? "—",
            status: mapStatus(c.effective_status, c.status),
            campanhaId: String(c.campaign_id ?? c?.campaign?.id ?? ""),
            campanhaNome: c?.campaign?.name ?? "—",
            publico: resumirTargeting(c.targeting),
            investimento: t.spend,
            conversas: t.conversas,
            results: cprAgg.results,
            cpr: cprAgg.cpr,
            resultMetric: metric,
            cliques: t.cliques,
            impressoes: t.impressoes,
            ctr: ctrFn(t),
            cpc: cpcFn(t),
            frequencia: frequenciaPond(t),
          };
        });

        const totalSpend = rows.reduce((s, r) => s + r.investimento, 0);
        const totalResults = rows.reduce((s, r) => s + r.results, 0);
        const cprMedio = totalResults > 0 ? totalSpend / totalResults : 0;

        setData({ rows, cprMedio });
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
