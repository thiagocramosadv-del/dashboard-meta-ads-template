// Exportação CSV client-side com BOM UTF-8 para Excel
import { toMetaDate } from "@/lib/metaAds";

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

export function exportCsv<T>(
  rows: T[],
  columns: CsvColumn<T>[],
  filename: string,
) {
  const BOM = "\uFEFF";
  const sep = ";"; // Excel BR default

  const header = columns.map((c) => escapeCsv(c.header)).join(sep);
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsv(String(c.value(row)))).join(sep)
  );

  const csv = BOM + [header, ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(val: string): string {
  if (val.includes(";") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function buildCsvFilename(tela: string, from: Date, to: Date): string {
  return `santos-${tela}-${toMetaDate(from)}-a-${toMetaDate(to)}.csv`;
}
