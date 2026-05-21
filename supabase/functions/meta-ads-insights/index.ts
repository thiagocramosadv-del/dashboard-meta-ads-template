// Edge Function: meta-ads-insights
// Proxy seguro para Meta Graph API v21.0
// Body: { endpoint: string, params: Record<string, string|number|boolean> }
// endpoint pode ser:
//   - relativo à conta:  "campaigns", "ads", "insights" (será prefixado com act_<ID>/)
//   - absoluto:          começa com "/" e é usado como caminho após /v21.0
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Cache em memória (instância da função). Vive enquanto a instância estiver quente.
type CacheEntry = { expires: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function buildUrl(endpoint: string, accountId: string, params: Record<string, unknown>) {
  let path = endpoint.trim();
  if (path.startsWith("/")) {
    path = path.slice(1);
  } else {
    // Endpoint relativo à conta de anúncios
    path = `act_${accountId}/${path}`;
  }
  const url = new URL(`${GRAPH_BASE}/${path}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;
    url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return url.toString();
}

function endpointBase(endpoint: string): string {
  const clean = endpoint.trim().replace(/^\/+/, "");
  const accountPrefix = /^act_[^/]+\//;
  return clean.replace(accountPrefix, "").split("/")[0];
}

function shouldAllowAllStatuses(endpoint: string): boolean {
  return ["campaigns", "ads", "adsets"].includes(endpointBase(endpoint));
}

function logStatusBreakdown(endpoint: string, data: unknown[]) {
  if (!shouldAllowAllStatuses(endpoint)) return;
  const breakdown = data.reduce((acc: Record<string, number>, row: any) => {
    const key = `${String(row?.effective_status ?? "UNKNOWN")}/${String(row?.status ?? "UNKNOWN")}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  console.log("meta-ads-insights status breakdown", { endpoint, breakdown });
}

async function fetchAllPages(
  initialUrl: string,
  token: string,
): Promise<{ data: unknown[]; raw: any }> {
  const all: unknown[] = [];
  let url: string | null = initialUrl;
  let raw: any = null;
  let safety = 50; // teto de páginas para evitar loops
  while (url && safety-- > 0) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) {
      const err = body?.error;
      const code = err?.code ?? res.status;
      throw new Response(
        JSON.stringify({
          error: err?.message || `Meta API error (${res.status})`,
          code,
          subcode: err?.error_subcode,
          type: err?.type,
        }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    raw = body;
    if (Array.isArray(body?.data)) {
      all.push(...body.data);
      url = body?.paging?.next ?? null;
    } else {
      // resposta sem data[] (ex: objeto único)
      return { data: [body], raw: body };
    }
  }
  return { data: all, raw };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = Deno.env.get("META_ADS_TOKEN");
    const accountId = Deno.env.get("META_AD_ACCOUNT_ID");
    if (!token || !accountId) {
      return json({ error: "Credenciais Meta Ads não configuradas." }, 500);
    }

    const { endpoint, params, campaignIds, cacheBust } = await req.json().catch(() => ({}));
    if (!endpoint || typeof endpoint !== "string") {
      return json({ error: "endpoint (string) é obrigatório." }, 400);
    }

    // Aplica filtering por campanha quando uma lista não-vazia for enviada.
    const effectiveParams: Record<string, unknown> = { ...(params ?? {}) };
    const statusParamBefore = effectiveParams.effective_status ?? effectiveParams.configured_status ?? null;
    const allowAllStatuses = shouldAllowAllStatuses(endpoint);
    if (allowAllStatuses) {
      delete effectiveParams.effective_status;
      delete effectiveParams.configured_status;
    }
    if (Array.isArray(campaignIds) && campaignIds.length > 0) {
      const existing = effectiveParams.filtering;
      let arr: unknown[] = [];
      if (typeof existing === "string") {
        try { arr = JSON.parse(existing); } catch { arr = []; }
      } else if (Array.isArray(existing)) {
        arr = existing as unknown[];
      }
      arr.push({ field: "campaign.id", operator: "IN", value: campaignIds });
      effectiveParams.filtering = arr;
    }

    const skipCache = allowAllStatuses || Boolean(cacheBust) || req.headers.has("x-cache-bust");
    const cacheKey = JSON.stringify({ endpoint, params: effectiveParams });
    const cached = !skipCache ? cache.get(cacheKey) : undefined;
    if (cached && cached.expires > Date.now()) {
      return json({ data: cached.data, cached: true });
    }

    const url = buildUrl(endpoint, accountId, effectiveParams);
    console.log("meta-ads-insights request", {
      endpoint,
      allowAllStatuses,
      skipCache,
      statusParamBefore,
      statusParamSent: effectiveParams.effective_status ?? effectiveParams.configured_status ?? null,
      graphUrl: url,
    });
    const { data } = await fetchAllPages(url, token);
    logStatusBreakdown(endpoint, data);
    console.log("meta-ads-insights response", { endpoint, count: data.length, cached: false });

    if (!skipCache) cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, data });
    return json({ data, cached: false });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("meta-ads-insights error:", msg);
    return json({ error: msg }, 500);
  }
});
