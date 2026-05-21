import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export type PresetKey =
  | "hoje"
  | "ontem"
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "este_mes"
  | "mes_passado"
  | "personalizado";

export interface DateRange {
  preset: PresetKey;
  label: string;
  from: Date;
  to: Date;
}

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const buildRange = (preset: PresetKey): DateRange => {
  const t = today();
  switch (preset) {
    case "hoje":
      return { preset, label: "Hoje", from: t, to: t };
    case "ontem": {
      const y = addDays(t, -1);
      return { preset, label: "Ontem", from: y, to: y };
    }
    case "7d":
      return { preset, label: "Últimos 7 dias", from: addDays(t, -6), to: t };
    case "14d":
      return { preset, label: "Últimos 14 dias", from: addDays(t, -13), to: t };
    case "30d":
      return { preset, label: "Últimos 30 dias", from: addDays(t, -29), to: t };
    case "90d":
      return { preset, label: "Últimos 90 dias", from: addDays(t, -89), to: t };
    case "este_mes": {
      const f = new Date(t.getFullYear(), t.getMonth(), 1);
      return { preset, label: "Este mês", from: f, to: t };
    }
    case "mes_passado": {
      const f = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      const to = new Date(t.getFullYear(), t.getMonth(), 0);
      return { preset, label: "Mês passado", from: f, to };
    }
    case "personalizado":
      return { preset, label: "Personalizado", from: addDays(t, -29), to: t };
  }
};

interface Ctx {
  range: DateRange;
  setPreset: (p: PresetKey) => void;
  setCustom: (from: Date, to: Date) => void;
}

const DateRangeCtx = createContext<Ctx | null>(null);

export const DateRangeProvider = ({ children }: { children: ReactNode }) => {
  const [range, setRange] = useState<DateRange>(() => buildRange("30d"));

  const value = useMemo<Ctx>(
    () => ({
      range,
      setPreset: (p) => setRange(buildRange(p)),
      setCustom: (from, to) =>
        setRange({ preset: "personalizado", label: "Personalizado", from, to }),
    }),
    [range]
  );

  return <DateRangeCtx.Provider value={value}>{children}</DateRangeCtx.Provider>;
};

export const useDateRange = () => {
  const ctx = useContext(DateRangeCtx);
  if (!ctx) throw new Error("useDateRange precisa estar dentro de DateRangeProvider");
  return ctx;
};
