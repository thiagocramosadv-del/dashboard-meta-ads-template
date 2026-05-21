import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DayPoint } from "@/data/mock";
import { fmtBRL, fmtNum } from "@/lib/format";

interface Props {
  data: DayPoint[];
}

export const InvestVsConversasChart = ({ data }: Props) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Investimento e conversas por dia</h3>
          <p className="text-xs text-muted-foreground">
            Acompanhe se o aumento de investimento gerou mais conversas
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Investimento</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-muted-foreground">Conversas</span>
          </span>
        </div>
      </header>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => fmtBRL(v, { compact: true })}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) =>
                name === "investimento"
                  ? [fmtBRL(value), "Investimento"]
                  : [fmtNum(value), "Conversas"]
              }
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="investimento"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="conversas"
              stroke="hsl(var(--success))"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
