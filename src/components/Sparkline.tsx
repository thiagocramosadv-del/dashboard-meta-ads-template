import { Line, LineChart, ResponsiveContainer } from "recharts";

interface Props {
  data: number[];
  color?: string; // hsl var name without var()
  height?: number;
}

export const Sparkline = ({ data, color = "hsl(var(--primary))", height = 36 }: Props) => {
  const formatted = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
