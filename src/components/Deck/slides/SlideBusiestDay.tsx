// ---------------------------------------------------------------------------
// SlideBusiestDay — S3: busiest single day + longest streak.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import { useCountUp } from "../../../hooks/useCountUp";
import type { WrappedStats } from "../../../lib/types";

const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideBusiestDayProps {
  stats: WrappedStats;
  isVisible: boolean;
}

export function SlideBusiestDay({ stats, isVisible }: SlideBusiestDayProps) {
  const streak = stats.streak;
  if (!streak) return null;

  const streakCount = useCountUp(streak.longestDays, 1200, isVisible);
  const busiestCount = useCountUp(streak.busiestCount, 1000, isVisible);
  const extras = stats.extras;

  return (
    <div
      className="relative flex h-full flex-col justify-center gap-8 px-8 py-14"
      style={{ background: "var(--aw-paper)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 50% at 20% 80%, oklch(70% 0.17 40 / 0.08) 0%, transparent 70%)",
        }}
      />

      {/* Busiest day */}
      <div className="relative z-10">
        <motion.p
          className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2"
          style={{ color: "var(--aw-coral)" }}
          initial={{ opacity: 0, x: -16 }}
          animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
          transition={{ ...springRelaxed, delay: 0.1 }}
        >
          Busiest day
        </motion.p>
        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          {formatFullDate(streak.busiestDate)}
        </motion.h2>
        <motion.p
          className="mt-1 font-stat text-2xl"
          style={{ color: "var(--aw-coral)" }}
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ ...springRelaxed, delay: 0.3 }}
        >
          {busiestCount.toLocaleString()} messages
        </motion.p>
      </div>

      {/* Streak */}
      <div className="relative z-10">
        <motion.div
          className="flex items-baseline gap-3"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ ...springRelaxed, delay: 0.45 }}
        >
          <span
            className="font-stat"
            style={{ fontSize: "clamp(3rem, 8vw, 5rem)", lineHeight: 1, color: "var(--aw-ink)" }}
          >
            {streakCount}
          </span>
          <span
            className="font-display text-2xl uppercase"
            style={{ color: "var(--aw-ink-soft)" }}
          >
            day streak
          </span>
        </motion.div>
        <motion.p
          className="mt-2 text-sm"
          style={{ color: "var(--aw-ink-mute)" }}
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ ...springRelaxed, delay: 0.6 }}
        >
          Starting {formatFullDate(streak.longestStart)}
        </motion.p>
      </div>

      {/* Extras row: busiest weekday, active days, avg/day */}
      {extras && (
        <motion.div
          className="relative z-10 flex flex-wrap gap-5"
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ ...springRelaxed, delay: 0.75 }}
        >
          <div className="flex flex-col">
            <span className="font-stat text-xl" style={{ color: "var(--aw-coral)" }}>
              {extras.busiestWeekdayName}
            </span>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--aw-ink-mute)" }}>
              busiest weekday
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-stat text-xl" style={{ color: "var(--aw-ink)" }}>
              {extras.totalActiveDays}
            </span>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--aw-ink-mute)" }}>
              active days
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-stat text-xl" style={{ color: "var(--aw-ink)" }}>
              {extras.avgMessagesPerActiveDay}
            </span>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--aw-ink-mute)" }}>
              avg msgs / day
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function formatFullDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
