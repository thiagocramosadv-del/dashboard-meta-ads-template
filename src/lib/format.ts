// Utilitários de formatação PT-BR
export const fmtBRL = (v: number, opts: { compact?: boolean } = {}) => {
  if (opts.compact && Math.abs(v) >= 1000) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

export const fmtNum = (v: number, digits = 0) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);

export const fmtPct = (v: number, digits = 2) =>
  `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v)}%`;

export const fmtDelta = (v: number) => {
  const sign = v > 0 ? "+" : "";
  return `${sign}${fmtNum(v, 1)}%`;
};

export const fmtDateBR = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(d);

export const fmtDateRangeBR = (a: Date, b: Date) =>
  `${fmtDateBR(a)} – ${fmtDateBR(b)}`;
