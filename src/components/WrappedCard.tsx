import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyDatum } from "../lib/wrapped";

// One real "wrapped" card: monthly message activity rendered with Recharts,
// styled with the app's existing Tailwind v4 dark tokens. A short mount reveal
// (fade + rise) plus the chart's own grow-in animation gives it one tasteful
// moment without pulling in an animation library.

function formatMonth(month: string): string {
  // 'YYYY-MM' -> 'Jan' / 'Jan ʼ25' when the year is ambiguous; keep it compact.
  const [year, mon] = month.split("-");
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleString(undefined, { month: "short" });
}

function MonthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-lg">
      <div className="font-mono text-zinc-400">{label}</div>
      <div className="font-semibold text-zinc-100">
        {count.toLocaleString()} message{count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export function WrappedCard({ series }: { series: MonthlyDatum[] }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (series.length === 0) return null;

  const total = series.reduce((sum, d) => sum + d.count, 0);
  const peak = series.reduce(
    (best, d) => (d.count > best.count ? d : best),
    series[0],
  );

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border border-zinc-800/80 p-6 sm:p-7",
        "bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950/80",
        "shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]",
        "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      ].join(" ")}
    >
      {/* warm top-edge bloom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(251,146,60,0.10),transparent_70%)]"
      />
      <div className="relative mb-5 flex items-baseline justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.9)]" />
            Your year, wrapped
          </p>
          <h3 className="mt-1.5 text-xl font-bold tracking-tight text-zinc-100">
            Monthly activity
          </h3>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums text-zinc-50">
            {total.toLocaleString()}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">
            messages
          </div>
        </div>
      </div>

      <div className="relative h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={series}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#27272a"
            />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              axisLine={{ stroke: "#3f3f46" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#71717a", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "#fb923c14" }}
              content={<MonthTooltip />}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              animationDuration={900}
              animationBegin={150}
            >
              {series.map((d) => (
                <Cell
                  key={d.month}
                  fill={d.month === peak.month ? "#fb923c" : "#52525b"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="relative mt-4 text-sm text-zinc-400">
        Busiest month:{" "}
        <span className="font-semibold text-orange-400">
          {new Date(
            Number(peak.month.split("-")[0]),
            Number(peak.month.split("-")[1]) - 1,
            1,
          ).toLocaleString(undefined, { month: "long", year: "numeric" })}
        </span>{" "}
        with {peak.count.toLocaleString()} messages.
      </p>
    </div>
  );
}
