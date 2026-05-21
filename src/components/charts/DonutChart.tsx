import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS_BY_NAME: Record<string, string> = {
  Feed: "hsl(var(--primary))",
  Stories: "hsl(var(--success))",
  Reels: "hsl(var(--warning))",
  Messenger: "hsl(var(--warning))",
  Instagram: "hsl(var(--success))",
  "Audience Network": "hsl(var(--info))",
  Mobile: "hsl(var(--primary))",
  Desktop: "hsl(var(--success))",
  Outros: "hsl(var(--muted-foreground))",
};

const fallbackColors = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--accent))",
];

interface Props {
  title: string;
  subtitle?: string;
  data: { nome: string; valor: number }[];
  /** Formatter para o tooltip */
  formatValue?: (v: number) => string;
  /** Como renderizar cada item da legenda à direita */
  legendValue?: "percent" | "raw";
  legendFormatter?: (v: number) => string;
  /** Mapa de cores customizado por nome de fatia (sobrepõe COLORS_BY_NAME) */
  colorMap?: Record<string, string>;
}

export const DonutChart = ({
  title,
  subtitle,
  data,
  formatValue,
  legendValue = "percent",
  legendFormatter,
  colorMap,
}: Props) => {
  const total = data.reduce((s, d) => s + d.valor, 0);
  const colorFor = (name: string, i: number) =>
    colorMap?.[name] ?? COLORS_BY_NAME[name] ?? fallbackColors[i % fallbackColors.length];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card h-full min-w-0 flex flex-col">
      <header className="mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      <div className="h-64 min-h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={data}
              dataKey="valor"
              nameKey="nome"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.nome} fill={colorFor(d.nome, i)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, n: string) => [
                formatValue ? formatValue(v) : `${v}`,
                n,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.nome} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: colorFor(d.nome, i) }}
              />
              <span className="text-muted-foreground">{d.nome}</span>
            </span>
            <span className="font-medium num">
              {legendValue === "raw" && legendFormatter
                ? legendFormatter(d.valor)
                : `${total > 0 ? ((d.valor / total) * 100).toFixed(0) : 0}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
