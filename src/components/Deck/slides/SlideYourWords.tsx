// ---------------------------------------------------------------------------
// SlideYourWords — "YOUR VOCABULARY"
// User top-words type-scale cloud + total words + verbosity ratio.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;
const springBouncy = { type: "spring", stiffness: 500, damping: 22, mass: 0.9 } as const;

interface SlideYourWordsProps {
  stats: WrappedStats;
  isVisible: boolean;
}

function scaleFontSize(count: number, min: number, max: number): number {
  if (max === min) return 20;
  const t = (count - min) / (max - min);
  return Math.round(12 + t * 26); // 12px–38px
}

export function SlideYourWords({ stats, isVisible }: SlideYourWordsProps) {
  const ws = stats.wordStats;
  if (!ws || ws.userTopWords.length === 0) return null;

  const words = ws.userTopWords;
  const counts = words.map((w) => w.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  return (
    <div
      className="relative flex h-full flex-col justify-center gap-7 px-8 py-14"
      style={{ background: "var(--aw-paper)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, oklch(70% 0.17 40 / 0.06) 0%, transparent 70%)",
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
          Vocabulary
        </motion.p>
        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          Your top words
        </motion.h2>
      </div>

      {/* Word cloud — flex wrap, font-size proportional to count */}
      <motion.div
        className="relative z-10 flex flex-wrap gap-x-3 gap-y-2"
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{ ...springRelaxed, delay: 0.3 }}
      >
        {words.map((w, i) => {
          const size = scaleFontSize(w.count, minCount, maxCount);
          const isTop = i === 0;
          return (
            <motion.span
              key={w.word}
              className="font-stat leading-none"
              style={{
                fontSize: size,
                color: isTop ? "var(--aw-coral)" : i < 4 ? "var(--aw-ink-soft)" : "var(--aw-ink-mute)",
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ ...springBouncy, delay: 0.35 + i * 0.05 }}
            >
              {w.word}
            </motion.span>
          );
        })}
      </motion.div>

      {/* Stats row */}
      <div className="relative z-10 flex gap-6 flex-wrap">
        <motion.div
          className="flex flex-col"
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ ...springRelaxed, delay: 0.9 }}
        >
          <span className="font-stat text-2xl" style={{ color: "var(--aw-coral)" }}>
            {ws.totalUserWords.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--aw-ink-mute)" }}>
            words typed
          </span>
        </motion.div>

        {ws.verbosityRatio > 0 && (
          <motion.div
            className="flex flex-col"
            initial={{ opacity: 0, y: 12 }}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ ...springRelaxed, delay: 1.0 }}
          >
            <span className="font-stat text-2xl" style={{ color: "var(--aw-ink)" }}>
              {ws.verbosityRatio}x
            </span>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--aw-ink-mute)" }}>
              AI words per yours
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
