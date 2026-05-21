// Cliente para a Edge Function meta-ads-insights e helpers de contagem oficial.
import { supabase } from "@/integrations/supabase/client";

// === CRÍTICO: igualdade EXATA, NUNCA .includes() ===
// O Meta retorna múltiplas variantes do mesmo evento. Usar .includes() conta
// a mesma conversa 2-3x. Use Set + igualdade exata.
export const CONVERSATION_ACTION_TYPES = new Set<string>([
  "onsite_conversion.messaging_conversation_started_7d",
]);

export const LEAD_ACTION_TYPES = new Set<string>([
  "onsite_conversion.lead_grouped",
]);

export interface MetaAction {
  action_type: string;
  value: string | number;
}

export interface MetaInsight {
  date_start?: string;
  date_stop?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  frequency?: string;
  ctr?: string;
  cpc?: string;
  actions?: MetaAction[];
  cost_per_action_type?: MetaAction[];
  publisher_platform?: string;
  region?: string;
  age?: string;
  gender?: string;
  device_platform?: string;
  hourly_stats_aggregated_by_advertiser_time_zone?: string;
}

// === Custo por Resultado oficial ===
// Mapeia o "resultado" conforme o objective/optimization_goal da campanha.
// Cada bucket é uma lista de action_types candidatos, escolhidos em ordem.
export type ResultMetric = "messaging" | "leads" | "link_click" | "purchase" | "reach" | "default";

const DEFAULT_MESSAGING_ACTION = "onsite_conversion.messaging_conversation_started_7d";
const DEFAULT_LEAD_ACTION = "onsite_conversion.lead_grouped";

const RESULT_ACTION_CANDIDATES: Record<ResultMetric, string[]> = {
  messaging: [
    DEFAULT_MESSAGING_ACTION,
    "onsite_conversion.total_messaging_connection",
  ],
  leads: [
    DEFAULT_LEAD_ACTION,
    "lead",
    "offsite_conversion.fb_pixel_lead",
  ],
  link_click: ["link_click"],
  purchase: [
    "purchase",
    "offsite_conversion.fb_pixel_purchase",
    "omni_purchase",
  ],
  reach: ["reach"],
  default: [DEFAULT_MESSAGING_ACTION],
};

export function pickResultMetric(objective?: string, optimizationGoal?: string): ResultMetric {
  const o = (objective ?? "").toUpperCase();
  const g = (optimizationGoal ?? "").toUpperCase();
  if (o.includes("MESSAGES") || o.includes("ENGAGEMENT") || g.includes("CONVERSATIONS") || g.includes("REPLIES"))
    return "messaging";
  if (o.includes("LEAD") || g.includes("LEAD")) return "leads";
  if (o.includes("TRAFFIC") || g === "LINK_CLICKS") return "link_click";
  if (o.includes("AWARENESS") || o.includes("REACH") || g === "REACH" || g === "IMPRESSIONS") return "reach";
  if (o.includes("SALES") || o.includes("CONVERSIONS") || g === "OFFSITE_CONVERSIONS" || g.includes("PURCHASE"))
    return "purchase";
  return "default";
}

/** Encontra o valor de um action_type específico em uma lista de actions. */
function findActionValue(actions: MetaAction[] | undefined, types: string[]): number {
  if (!actions?.length) return 0;
  for (const t of types) {
    const a = actions.find((x) => x.action_type === t);
    if (a) return Number(a.value) || 0;
  }
  return 0;
}

function findAction(actions: MetaAction[] | undefined, types: string[]): MetaAction | undefined {
  if (!actions?.length) return undefined;
  for (const t of types) {
    const a = actions.find((x) => x.action_type === t && (Number(x.value) || 0) > 0);
    if (a) return a;
  }
  return undefined;
}

/** Conta o "resultado" oficial de um insight conforme a métrica do objetivo. */
export function countResultsFromInsight(insight: MetaInsight, metric: ResultMetric): number {
  const types = RESULT_ACTION_CANDIDATES[metric];
  return findActionValue(insight.actions, types);
}

/** Pega o cost_per_action_type oficial retornado pela API (bate com Ads Manager). */
export function pickCostPerResult(insight: MetaInsight, metric: ResultMetric): number | null {
  return resolveCostPerResult(insight, metric).cost;
}

export interface CostPerResultResolution {
  actionType: string | null;
  cost: number | null;
  results: number;
  spend: number;
}

export interface CostPerResultAggregate {
  spend: number;
  results: number;
  cpr: number | null;
}

/**
 * Resolve o resultado de um insight com a cascata robusta:
 * objective -> messaging -> lead -> spend/conversões antigas -> null.
 */
export function resolveCostPerResult(insight: MetaInsight, metric: ResultMetric): CostPerResultResolution {
  const spend = Number(insight.spend) || 0;
  const action =
    findAction(insight.cost_per_action_type, RESULT_ACTION_CANDIDATES[metric]) ??
    findAction(insight.cost_per_action_type, [DEFAULT_MESSAGING_ACTION]) ??
    findAction(insight.cost_per_action_type, [DEFAULT_LEAD_ACTION]);

  if (action) {
    const actionType = action.action_type;
    const cost = Number(action.value) || null;
    const results = findActionValue(insight.actions, [actionType]);
    if (results > 0 && cost !== null) return { actionType, cost, results, spend };
  }

  const conversions = countConversionsFromInsight(insight);
  if (conversions > 0) {
    return {
      actionType: null,
      cost: spend / conversions,
      results: conversions,
      spend,
    };
  }

  return { actionType: null, cost: null, results: 0, spend };
}

export function aggregateCostPerResultFromInsights(
  insights: MetaInsight[],
  objective?: string,
  optimizationGoal?: string
): CostPerResultAggregate {
  const metric = pickResultMetric(objective, optimizationGoal);
  let spend = 0;
  let results = 0;
  for (const ins of insights) {
    const resolved = resolveCostPerResult(ins, metric);
    spend += resolved.spend;
    results += resolved.results;
  }
  return { spend, results, cpr: results > 0 ? spend / results : null };
}

export function aggregateCostPerResult(
  campaigns: any[],
  allowed: Set<string> | null = null
): CostPerResultAggregate {
  let spend = 0;
  let results = 0;
  for (const c of campaigns) {
    if (allowed && !allowed.has(String(c.id))) continue;
    const agg = aggregateCostPerResultFromInsights(c?.insights?.data ?? [], c?.objective, c?.optimization_goal);
    spend += agg.spend;
    results += agg.results;
  }
  return { spend, results, cpr: results > 0 ? spend / results : null };
}

export function countConversionsFromInsight(insight: MetaInsight): number {
  if (!insight?.actions?.length) return 0;
  let total = 0;
  for (const a of insight.actions) {
    if (
      CONVERSATION_ACTION_TYPES.has(a.action_type) ||
      LEAD_ACTION_TYPES.has(a.action_type)
    ) {
      total += Number(a.value) || 0;
    }
  }
  return total;
}

export interface FetchOpts {
  endpoint: string;
  params?: Record<string, unknown>;
  campaignIds?: string[];
}

function endpointBase(endpoint: string): string {
  return endpoint.trim().replace(/^\/+/, "").replace(/^act_[^/]+\//, "").split("/")[0];
}

function shouldBustMetaCache(endpoint: string): boolean {
  return ["campaigns", "ads", "adsets"].includes(endpointBase(endpoint));
}

export class MetaAuthError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
  }
}

export async function fetchMeta<T = unknown>({ endpoint, params, campaignIds }: FetchOpts): Promise<T[]> {
  const cacheBust = shouldBustMetaCache(endpoint) ? Date.now() : undefined;
  const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-ads-insights`;
  if (cacheBust) {
    console.log("[Meta Edge] URL:", edgeUrl, "endpoint:", endpoint, "cacheBust:", cacheBust);
  }
  const { data, error } = await supabase.functions.invoke("meta-ads-insights", {
    body: { endpoint, params, campaignIds, cacheBust },
  });
  if (error) {
    // erros HTTP do invoke (incluem 4xx/5xx)
    const ctx: any = (error as any).context;
    const status = ctx?.status;
    let bodyJson: any = null;
    try {
      bodyJson = await ctx?.json?.();
    } catch (_) {
      /* noop */
    }
    const code = bodyJson?.code;
    const msg = bodyJson?.error || error.message || "Erro ao consultar Meta Ads";
    if (status === 401 || code === 190 || code === 102) {
      throw new MetaAuthError(msg, code);
    }
    throw new Error(msg);
  }
  if ((data as any)?.error) {
    const code = (data as any)?.code;
    if (code === 190 || code === 102) throw new MetaAuthError((data as any).error, code);
    throw new Error((data as any).error);
  }
  const rows = ((data as any)?.data ?? []) as T[];
  if (cacheBust) {
    console.log("[Meta Edge] Response:", { endpoint, total: rows.length, cached: Boolean((data as any)?.cached) });
  }
  return rows;
}

// Helpers de data
export function toMetaDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function previousRange(from: Date, to: Date): { from: Date; to: Date } {
  const ms = to.getTime() - from.getTime();
  const days = Math.round(ms / 86_400_000) + 1;
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: prevFrom, to: prevTo };
}

// === Agregação ===
export interface Totais {
  spend: number;
  impressoes: number;
  cliques: number;
  reach: number;
  conversas: number;
}

export function aggregateInsights(insights: MetaInsight[]): Totais {
  const t: Totais = { spend: 0, impressoes: 0, cliques: 0, reach: 0, conversas: 0 };
  for (const ins of insights) {
    t.spend += Number(ins.spend) || 0;
    t.impressoes += Number(ins.impressions) || 0;
    t.cliques += Number(ins.clicks) || 0;
    t.reach += Number(ins.reach) || 0;
    t.conversas += countConversionsFromInsight(ins);
  }
  return t;
}

export function ctr(t: Totais): number {
  return t.impressoes > 0 ? (t.cliques / t.impressoes) * 100 : 0;
}
export function cpc(t: Totais): number {
  return t.cliques > 0 ? t.spend / t.cliques : 0;
}
export function cplConversa(t: Totais): number {
  return t.conversas > 0 ? t.spend / t.conversas : 0;
}
export function frequenciaPond(t: Totais): number {
  return t.reach > 0 ? t.impressoes / t.reach : 0;
}

export function deltaPct(atual: number, anterior: number): number {
  if (anterior === 0) return atual === 0 ? 0 : 100;
  return ((atual - anterior) / anterior) * 100;
}
