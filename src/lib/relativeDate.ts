import { formatDistanceToNowStrict, format, differenceInCalendarDays, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

export function parseMetaDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function relativeFromNow(s: string | null | undefined): string {
  const d = parseMetaDate(s);
  if (!d) return "—";
  if (isToday(d)) return "hoje";
  if (isYesterday(d)) return "ontem";
  const days = differenceInCalendarDays(new Date(), d);
  if (days < 7) return `há ${days} dias`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? "há 1 semana" : `há ${w} semanas`;
  }
  return `há ${formatDistanceToNowStrict(d, { locale: ptBR, unit: days < 365 ? "month" : "year" })}`;
}

export function fullDateBR(s: string | null | undefined): string {
  const d = parseMetaDate(s);
  if (!d) return "—";
  return format(d, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
}

export function daysSince(s: string | null | undefined): number | null {
  const d = parseMetaDate(s);
  if (!d) return null;
  return differenceInCalendarDays(new Date(), d);
}
