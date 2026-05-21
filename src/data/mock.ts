// =============================================================
// Mock data realista para Santos Advocacia (direito bancário)
// Determinístico (seed) para evitar valores diferentes a cada render.
// =============================================================

export type CampaignStatus = "ativa" | "pausada" | "encerrada";

export interface Campaign {
  id: string;
  nome: string;
  status: CampaignStatus;
  investimento: number;
  conversas: number;
  cliques: number;
  impressoes: number;
  alcance: number;
  frequencia: number;
}

export interface AdSet {
  id: string;
  nome: string;
  campanhaId: string;
  campanhaNome: string;
  status: CampaignStatus;
  publico: string;
  investimento: number;
  conversas: number;
  cliques: number;
  impressoes: number;
  alcance: number;
  frequencia: number;
}

export type CreativeFormat = "imagem" | "video" | "carrossel";
export type Ranking = "acima" | "media" | "abaixo";

export interface Creative {
  id: string;
  nome: string;
  campanhaNome: string;
  adsetNome: string;
  formato: CreativeFormat;
  status: "ativo" | "pausado";
  thumb: string;
  investimento: number;
  conversas: number;
  cliques: number;
  impressoes: number;
  frequencia: number;
  qualidade: Ranking;
  engajamento: Ranking;
  conversao: Ranking;
  hookRate?: number; // % a 3s
  holdRate?: number; // % a 25%/75% — só vídeo
  cplTrend7d: number; // delta % nos últimos 7 dias (positivo = piorou)
}

// ---------- helpers ----------
const seedRand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};
const r = seedRand(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
const rng = (min: number, max: number, decimals = 0) => {
  const v = min + r() * (max - min);
  return decimals > 0
    ? Number(v.toFixed(decimals))
    : Math.round(v);
};

// ---------- nomes ----------
const nomesBase = [
  "Consultoria Dívidas SC",
  "Superendividamento",
  "Defesa Bancária",
  "Cartão de Crédito",
  "Empréstimo Consignado",
  "Revisão de Contratos",
  "Juros Abusivos",
  "Negativados Serasa",
  "Cheque Especial",
  "Renegociação Bancária",
  "Financiamento Veicular",
  "Bloqueio Indevido",
  "Score Baixo",
  "Dívidas no Banco",
];

const publicos = [
  "SC · 30-55 · Negativados",
  "SC · 25-45 · Endividados",
  "BR-Sul · 35-65 · Aposentados",
  "Florianópolis · 30-60",
  "SC · Lookalike Clientes 1%",
  "SC · Interesse Direito",
  "SC · 40-65 · Renda alta",
  "BR · 30-55 · Empréstimos",
];

// ---------- séries temporais (últimos 30 dias) ----------
export interface DayPoint {
  date: string;       // ISO yyyy-mm-dd
  label: string;      // dd/MM
  investimento: number;
  conversas: number;
  cliques: number;
  impressoes: number;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

export const serieDiaria: DayPoint[] = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() - (29 - i));
  const base = 380 + r() * 220 + Math.sin(i / 4) * 80;
  const investimento = Math.round(base);
  const conversas = Math.max(2, Math.round(investimento / rng(45, 95)));
  const cliques = Math.round(investimento / rng(2, 4, 2));
  const impressoes = cliques * rng(35, 70);
  return {
    date: d.toISOString().slice(0, 10),
    label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
    investimento,
    conversas,
    cliques,
    impressoes,
  };
});

// ---------- campanhas ----------
export const campanhas: Campaign[] = nomesBase.map((nome, i) => {
  const status: CampaignStatus =
    i === 1 ? "pausada" : i === 9 ? "encerrada" : "ativa";
  const investimento = rng(800, 2400);
  const conversas = Math.max(4, Math.round(investimento / rng(40, 110)));
  const cliques = Math.round(investimento / rng(2, 4, 2));
  const impressoes = cliques * rng(35, 80);
  const alcance = Math.round(impressoes / rng(15, 28, 1) * 10);
  return {
    id: `c${i + 1}`,
    nome,
    status,
    investimento,
    conversas,
    cliques,
    impressoes,
    alcance,
    frequencia: Number((impressoes / Math.max(alcance, 1)).toFixed(2)),
  };
});

// ---------- conjuntos ----------
export const conjuntos: AdSet[] = Array.from({ length: 30 }).map((_, i) => {
  const camp = campanhas[i % campanhas.length];
  const investimento = rng(180, 900);
  const conversas = Math.max(2, Math.round(investimento / rng(40, 120)));
  const cliques = Math.round(investimento / rng(2, 4, 2));
  const impressoes = cliques * rng(35, 80);
  const alcance = Math.round(impressoes / rng(12, 28, 1) * 10);
  const frequencia = Number((impressoes / Math.max(alcance, 1)).toFixed(2));
  return {
    id: `as${i + 1}`,
    nome: `${camp.nome} · ${pick(["Vídeo 30s", "Imagem", "Carrossel", "Depoimento", "Antes/Depois"])}`,
    campanhaId: camp.id,
    campanhaNome: camp.nome,
    status: camp.status,
    publico: pick(publicos),
    investimento,
    conversas,
    cliques,
    impressoes,
    alcance,
    frequencia: i % 7 === 0 ? Number((frequencia + 1.8).toFixed(2)) : frequencia,
  };
});

// ---------- criativos ----------
const thumbs = [
  // SVG inline — placeholder estável temático
  ...Array.from({ length: 12 }).map(
    (_, i) =>
      `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'>
          <defs>
            <linearGradient id='g${i}' x1='0' x2='1' y1='0' y2='1'>
              <stop offset='0' stop-color='hsl(${(i * 37) % 360}, 50%, 35%)'/>
              <stop offset='1' stop-color='hsl(${(i * 37 + 60) % 360}, 60%, 18%)'/>
            </linearGradient>
          </defs>
          <rect width='320' height='180' fill='url(#g${i})'/>
          <circle cx='${40 + (i % 4) * 70}' cy='${40 + (i % 3) * 30}' r='42' fill='white' fill-opacity='0.06'/>
          <rect x='24' y='130' width='${120 + (i * 13) % 140}' height='10' rx='3' fill='white' fill-opacity='0.18'/>
          <rect x='24' y='150' width='${60 + (i * 11) % 110}' height='8' rx='3' fill='white' fill-opacity='0.12'/>
        </svg>`
      )}`
  ),
];

const rankingPick = (): Ranking => {
  const v = r();
  if (v > 0.7) return "acima";
  if (v > 0.35) return "media";
  return "abaixo";
};

export const criativos: Creative[] = Array.from({ length: 12 }).map((_, i) => {
  const camp = campanhas[i % campanhas.length];
  const adset = conjuntos[i % conjuntos.length];
  const formato: CreativeFormat = i % 3 === 0 ? "video" : i % 5 === 0 ? "carrossel" : "imagem";
  const investimento = rng(160, 1900);
  const conversas = Math.max(2, Math.round(investimento / rng(38, 130)));
  const cliques = Math.round(investimento / rng(2, 4, 2));
  const impressoes = cliques * rng(35, 80);
  const frequencia = i === 2 || i === 7 ? rng(31, 42, 1) / 10 : rng(12, 28, 1) / 10;
  return {
    id: `cr${i + 1}`,
    nome: `${pick(["Aprovação 24h", "Limpe seu nome", "Pare de pagar juros", "Negocie com o banco", "Você tem direito", "Fim das dívidas"])} v${i + 1}`,
    campanhaNome: camp.nome,
    adsetNome: adset.nome,
    formato,
    status: i === 5 ? "pausado" : "ativo",
    thumb: thumbs[i],
    investimento,
    conversas,
    cliques,
    impressoes,
    frequencia,
    qualidade: rankingPick(),
    engajamento: rankingPick(),
    conversao: rankingPick(),
    hookRate: formato === "video" ? rng(180, 450, 1) / 10 : undefined,
    holdRate: formato === "video" ? rng(80, 280, 1) / 10 : undefined,
    cplTrend7d: i === 2 || i === 7 ? rng(35, 70) : rng(-25, 18),
  };
});

// ---------- breakdowns ----------
export const placement = [
  { nome: "Feed", valor: 42 },
  { nome: "Stories", valor: 28 },
  { nome: "Reels", valor: 18 },
  { nome: "Messenger", valor: 12 },
];

export const dispositivo = [
  { nome: "Mobile", valor: 85 },
  { nome: "Desktop", valor: 15 },
];

export const regioes = [
  { nome: "Florianópolis · SC", conversas: 84, investimento: 4120, cpl: 49.05 },
  { nome: "Joinville · SC", conversas: 56, investimento: 2980, cpl: 53.21 },
  { nome: "Blumenau · SC", conversas: 41, investimento: 2240, cpl: 54.63 },
  { nome: "Criciúma · SC", conversas: 33, investimento: 1880, cpl: 56.97 },
  { nome: "Itajaí · SC", conversas: 28, investimento: 1640, cpl: 58.57 },
  { nome: "Chapecó · SC", conversas: 21, investimento: 1320, cpl: 62.86 },
  { nome: "Lages · SC", conversas: 17, investimento: 1180, cpl: 69.41 },
];

export const idadeGenero = [
  { faixa: "18-24", masc: 12, fem: 9 },
  { faixa: "25-34", masc: 38, fem: 31 },
  { faixa: "35-44", masc: 54, fem: 47 },
  { faixa: "45-54", masc: 61, fem: 52 },
  { faixa: "55-64", masc: 44, fem: 36 },
  { faixa: "65+", masc: 19, fem: 14 },
];

// heatmap 7d × 24h (conversas)
export const horarioHeatmap: number[][] = Array.from({ length: 7 }).map((_, d) =>
  Array.from({ length: 24 }).map((_, h) => {
    const peak = (h >= 10 && h <= 13) || (h >= 18 && h <= 22);
    const weekendBoost = d === 0 || d === 6 ? 0.6 : 1;
    return Math.round((peak ? rng(6, 14) : rng(0, 5)) * weekendBoost);
  })
);

// ---------- agregados úteis ----------
export const totais = {
  investimento: serieDiaria.reduce((s, d) => s + d.investimento, 0),
  conversas: serieDiaria.reduce((s, d) => s + d.conversas, 0),
  cliques: serieDiaria.reduce((s, d) => s + d.cliques, 0),
  impressoes: serieDiaria.reduce((s, d) => s + d.impressoes, 0),
};

export const cplMedio = totais.investimento / Math.max(totais.conversas, 1);
export const ctrMedio = (totais.cliques / Math.max(totais.impressoes, 1)) * 100;
export const frequenciaMedia = 1.8;

// deltas vs período anterior (mock estável)
export const deltas = {
  investimento: 12.4,
  conversas: 18.7,
  cpl: -5.3,    // negativo é bom (CPL caiu)
  ctr: 9.1,
  frequencia: 4.2, // positivo é ruim
};

// helpers para CPL por campanha/adset/criativo
export const cpl = (invest: number, conv: number) =>
  conv > 0 ? invest / conv : 0;
export const ctr = (cliq: number, imp: number) =>
  imp > 0 ? (cliq / imp) * 100 : 0;
export const cpc = (invest: number, cliq: number) =>
  cliq > 0 ? invest / cliq : 0;
