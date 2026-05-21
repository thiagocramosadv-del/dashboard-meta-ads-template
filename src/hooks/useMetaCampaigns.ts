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

export type CampanhaStatus = "ativa" | "pausada" | "encerrada";

export interface CampanhaRow {
  id: string;
  nome: string;
  status: CampanhaStatus;
  objetivo: string;
  resultMetric: ResultMetric;
  investimento: number;
  /** conversas iniciadas (Messenger/WhatsApp) — métrica fixa para o KPI específico */
  conversas: number;
  /** "Resultados" oficiais conforme objective da campanha */
  results: number;
  /** Custo por Resultado oficial do Meta (cost_per_action_type) */
  cpr: number | null;
  cliques: number;
  impressoes: number;
  ctr: number;
  cpc: number;
  frequencia: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export function mapStatus(effective?: string, status?: string): CampanhaStatus {
  const eff = (effective ?? "").toUpperCase();
  const configured = (status ?? "").toUpperCase();
  const statuses = [eff, configured].filter(Boolean);
  if (statuses.some((s) => s === "ARCHIVED" || s === "DELETED")) return "encerrada";
  if (
    statuses.some((s) =>
      s === "PAUSED" ||
      s === "CAMPAIGN_PAUSED" ||
      s === "ADSET_PAUSED" ||
      s === "IN_PROCESS" ||
      s === "WITH_ISSUES" ||
      s === "DISAPPROVED" ||
      s === "PENDING_REVIEW"
    )
  ) {
    return "pausada";
  }
  if (eff === "ACTIVE" || (!eff && configured === "ACTIVE")) return "ativa";
  return "pausada";
}

export interface CampanhasData {
  rows: CampanhaRow[];
  /** CPR médio ponderado (sum spend / sum results) */
  cprMedio: number;
}

export function useMetaCampaigns(from: Date, to: Date) {
  const [data, setData] = useState<CampanhasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAuthError(false);

    const time_range = JSON.stringify({ since: toMetaDate(from), until: toMetaDate(to) });

    (async () => {
      try {
        const [arr, insightsArr] = await Promise.all([
          fetchMeta<any>({
            endpoint: "campaigns",
            params: {
              fields: "id,name,status,effective_status,objective,created_time,updated_time",
              limit: 25,
            },
          }),
          fetchMeta<MetaInsight & { campaign_id?: string }>({
            endpoint: "insights",
            params: {
              time_range,
              fields: "campaign_id,spend,clicks,impressions,reach,actions,cost_per_action_type,frequency,ctr,cpc",
              level: "campaign",
              limit: 50,
            },
          }),
        ]);
        if (cancelled) return;

        const insightsByCampaign = new Map<string, MetaInsight[]>();
        for (const ins of insightsArr) {
          const id = String(ins.campaign_id ?? "");
          if (!id) continue;
          const list = insightsByCampaign.get(id) ?? [];
          list.push(ins);
          insightsByCampaign.set(id, list);
        }

        const statusBreakdown = arr.reduce((acc: Record<string, number>, c: any) => {
          const key = `${String(c.effective_status ?? "UNKNOWN")}/${String(c.status ?? "UNKNOWN")}`;
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});
        console.log("[Campaigns API]", arr.length, "total. Effective/status breakdown:", statusBreakdown);

        const rows: CampanhaRow[] = arr
          .map((c: any) => {
            const inss: MetaInsight[] = insightsByCampaign.get(String(c.id)) ?? [];
            const t = aggregateInsights(inss);
            const metric = pickResultMetric(c.objective);

            const cprAgg = aggregateCostPerResultFromInsights(inss, c.objective);

            return {
              id: String(c.id),
              nome: c.name ?? "—",
              status: mapStatus(c.effective_status, c.status),
              objetivo: c.objective ?? "—",
              resultMetric: metric,
              investimento: t.spend,
              conversas: t.conversas,
              results: cprAgg.results,
              cpr: cprAgg.cpr,
              cliques: t.cliques,
              impressoes: t.impressoes,
              ctr: ctrFn(t),
              cpc: cpcFn(t),
              frequencia: frequenciaPond(t),
              createdAt: c.created_time ?? null,
              updatedAt: c.updated_time ?? null,
            };
          });

        // CPR médio: soma(spend) / soma(results) — média ponderada compatível com Ads Manager.
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
  }, [from.getTime(), to.getTime()]);

  return { data, loading, error, authError };
}
