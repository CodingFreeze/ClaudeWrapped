// ---------------------------------------------------------------------------
// SlideRhythm — S8: hour histogram + superlatives.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springBouncy = { type: "spring", stiffness: 600, damping: 20, mass: 0.8 } as const;
const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideRhythmProps {
  stats: WrappedStats;
  isVisible: boolean;
}

const HOUR_LABELS = ["12a", "", "", "", "", "5a", "", "", "8a", "", "", "", "12p", "", "", "", "", "5p", "", "", "", "", "10p", ""];

export function SlideRhythm({ stats, isVisible }: SlideRhythmProps) {
  const hist = stats.hourHistogram;
  const sups = stats.superlatives;

  if (!hist || hist.length < 24) return null;

  const maxVal = Math.max(...hist, 1);

  const activeSups = sups
    ? [
        sups.nightOwl && "Night Owl",
        sups.earlyBird && "Early Bird",
        sups.weekendWarrior && "Weekend Warrior",
        sups.marathoner && "Marathoner",
        sups.tokenBurner && "Token Burner",
        sups.polyglot && "Polyglot",
        sups.toolMaster && "Tool Master",
        sups.wordsmith && "Wordsmith",
        sups.projectHopper && "Project Hopper",
      ].filter((s): s is string => Boolean(s))
    : [];

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
            "radial-gradient(60% 40% at 50% 80%, oklch(70% 0.17 40 / 0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10">
        <motion.p
          className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2"
          style={{ color: "var(--aw-coral)" }}
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ ...springRelaxed, delay: 0.1 }}
        >
          Your rhythm
        </motion.p>
        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          When you work
        </motion.h2>
      </div>

      {/* Hour histogram */}
      <div className="relative z-10 flex items-end gap-0.5" style={{ height: 80 }}>
        {hist.map((v, h) => {
          const frac = v / maxVal;
          const isPeakHour = v === maxVal;
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex items-end" style={{ height: 64 }}>
                <motion.div
                  className="w-full rounded-t"
                  style={{
                    background: isPeakHour ? "var(--aw-coral)" : "var(--aw-surface-2)",
                    borderRadius: "2px 2px 0 0",
                    height: "100%", // scaleY needs a real height to scale from
                  }}
                  initial={{ scaleY: 0, originY: 1 }}
                  animate={isVisible ? { scaleY: frac || 0.02, originY: 1 } : { scaleY: 0, originY: 1 }}
                  transition={{ ...springBouncy, delay: 0.35 + h * 0.015 }}
                  title={`${h}:00 — ${v.toLocaleString()} msgs`}
                />
              </div>
              {HOUR_LABELS[h] && (
                <span className="text-[8px]" style={{ color: "var(--aw-ink-mute)" }}>
                  {HOUR_LABELS[h]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Superlatives */}
      {activeSups.length > 0 && (
        <motion.div
          className="relative z-10 flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.9 }}
        >
          {activeSups.map((s) => (
            <span
              key={s}
              className="rounded-full border px-3 py-1 text-sm font-semibold"
              style={{ borderColor: "var(--aw-coral)", color: "var(--aw-coral)", background: "oklch(70% 0.17 40 / 0.08)" }}
            >
              {s}
            </span>
          ))}
        </motion.div>
      )}
    </div>
  );
}
