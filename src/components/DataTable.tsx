import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  label: ReactNode;
  /** alinhamento */
  align?: "left" | "right";
  /** ordenável? default true */
  sortable?: boolean;
  /** valor para ordenação (default: row[key]) */
  sortValue?: (row: T) => number | string;
  /** célula custom */
  cell?: (row: T) => ReactNode;
  width?: string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  /** classe da borda esquerda colorida (semáforo) */
  rowAccent?: (row: T) => "ok" | "warn" | "bad" | "none";
  defaultSort?: { key: string; dir: "asc" | "desc" };
  empty?: ReactNode;
  rowKey: (row: T) => string;
}

const accentMap = {
  ok: "border-l-success",
  warn: "border-l-warning",
  bad: "border-l-danger",
  none: "border-l-transparent",
};

export function DataTable<T extends Record<string, any>>({
  rows,
  columns,
  rowAccent,
  defaultSort,
  empty,
  rowKey,
}: Props<T>) {
  const [sort, setSort] = useState(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const accessor =
      col.sortValue ?? ((r: T) => (r as any)[sort.key as keyof T]);
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (typeof av === "number" && typeof bv === "number") {
        return sort.dir === "asc" ? av - bv : bv - av;
      }
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv), "pt-BR")
        : String(bv).localeCompare(String(av), "pt-BR");
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "desc" };
      if (s.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        {empty ?? "Nenhum resultado encontrado."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="overflow-x-auto relative">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/30">
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {rowAccent && <th className="w-1" />}
              {columns.map((c, idx) => {
                const sortable = c.sortable !== false;
                const isSorted = sort?.key === c.key;
                const isFirst = idx === 0;
                return (
                  <th
                    key={String(c.key)}
                    className={cn(
                      "font-medium px-4 py-3 select-none",
                      c.align === "right" ? "text-right" : "text-left",
                      sortable && "cursor-pointer hover:text-foreground",
                      isFirst &&
                        "md:static sticky left-0 z-10 bg-muted/30 backdrop-blur min-w-[180px] max-w-[60vw] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)] md:shadow-none"
                    )}
                    style={{ width: c.width }}
                    onClick={() => sortable && toggleSort(String(c.key))}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        c.align === "right" && "flex-row-reverse"
                      )}
                    >
                      {c.label}
                      {sortable && (
                        <span className="opacity-60">
                          {isSorted ? (
                            sort?.dir === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const accent = rowAccent ? rowAccent(row) : "none";
              return (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-t border-border/60 hover:bg-accent/30 transition-colors group/row",
                    rowAccent && "border-l-2",
                    rowAccent && accentMap[accent]
                  )}
                >
                  {rowAccent && <td className="w-1 p-0" />}
                  {columns.map((c, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <td
                        key={String(c.key)}
                        className={cn(
                          "px-4 py-3",
                          c.align === "right" && "text-right num",
                          isFirst &&
                            "md:static sticky left-0 z-10 bg-card group-hover/row:bg-accent/30 transition-colors min-w-[180px] max-w-[60vw] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)] md:shadow-none"
                        )}
                      >
                        {c.cell ? c.cell(row) : (row as any)[c.key]}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
