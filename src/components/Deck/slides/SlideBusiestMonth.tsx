// ---------------------------------------------------------------------------
// SlideBusiestMonth — S2: animated bar chart.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springBouncy = { type: "spring", stiffness: 600, damping: 20, mass: 0.8 } as const;
const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideBusiestMonthProps {
  stats: WrappedStats;
  isVisible: boolean;
}

function formatMonthShort(month: string): string {
  const [year, mon] = month.split("-");
  const d = new Date(Number(year), Number(mon) - 1, 1);
  return d.toLocaleString(undefined, { month: "short" });
}

function formatMonthFull(month: string): string {
  const [year, mon] = month.split("-");
  const d = new Date(Number(year), Number(mon) - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export function SlideBusiestMonth({ stats, isVisible }: SlideBusiestMonthProps) {
  const series = stats.monthlySeries;
  if (series.length === 0) return null;

  const maxMessages = Math.max(...series.map((d) => d.messages));
  const busiest = series.reduce((best, d) => (d.messages > best.messages ? d : best), series[0]);

  return (
    <div
      className="relative flex h-full flex-col justify-center gap-8 px-6 py-12"
      style={{ background: "var(--aw-paper)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 80% 20%, oklch(70% 0.17 40 / 0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10">
        <motion.p
          className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2"
          style={{ color: "var(--aw-coral)" }}
          initial={{ opacity: 0, x: -16 }}
          animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
          transition={{ ...springRelaxed, delay: 0.1 }}
        >
          Your busiest month
        </motion.p>

        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          {formatMonthFull(busiest.month)}
        </motion.h2>

        <motion.p
          className="mt-1 font-stat text-2xl"
          style={{ color: "var(--aw-coral)" }}
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ ...springRelaxed, delay: 0.35 }}
        >
          {busiest.messages.toLocaleString()} messages
        </motion.p>
      </div>

      {/* Bar chart */}
      <div className="relative z-10 flex items-end gap-1" style={{ height: 120 }}>
        {series.map((d, i) => {
          const frac = maxMessages > 0 ? d.messages / maxMessages : 0;
          const isActive = d.month === busiest.month;
          return (
            <div
              key={d.month}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="relative w-full flex items-end" style={{ height: 100 }}>
                <motion.div
                  className="w-full rounded-t"
                  style={{
                    background: isActive ? "var(--aw-coral)" : "var(--aw-surface-2)",
                    borderRadius: "4px 4px 0 0",
                  }}
                  initial={{ scaleY: 0, originY: 1 }}
                  animate={
                    isVisible
                      ? { scaleY: frac, originY: 1 }
                      : { scaleY: 0, originY: 1 }
                  }
                  transition={{ ...springBouncy, delay: 0.4 + i * 0.04 }}
                  title={`${formatMonthFull(d.month)}: ${d.messages.toLocaleString()}`}
                />
              </div>
              <span
                className="text-[9px]"
                style={{
                  color: isActive ? "var(--aw-coral)" : "var(--aw-ink-mute)",
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {formatMonthShort(d.month)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
