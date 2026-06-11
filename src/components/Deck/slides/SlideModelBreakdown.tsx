// ---------------------------------------------------------------------------
// SlideModelBreakdown — S4: model usage breakdown (Tier 1 only).
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springBouncy = { type: "spring", stiffness: 600, damping: 20, mass: 0.8 } as const;
const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideModelBreakdownProps {
  stats: WrappedStats;
  isVisible: boolean;
}

export function SlideModelBreakdown({ stats, isVisible }: SlideModelBreakdownProps) {
  const models = stats.modelBreakdown;
  if (!models || models.length < 2) return null;

  const total = models.reduce((s, m) => s + m.messages, 0);
  const topModels = models.slice(0, 6);

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
            "radial-gradient(50% 50% at 70% 30%, oklch(65% 0.12 155 / 0.08) 0%, transparent 70%)",
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
          Model breakdown
        </motion.p>
        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          Your favorite models
        </motion.h2>
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        {topModels.map((m, i) => {
          const pct = total > 0 ? m.messages / total : 0;
          return (
            <motion.div
              key={m.model}
              className="flex flex-col gap-1"
              initial={{ opacity: 0, x: -20 }}
              animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ ...springRelaxed, delay: 0.3 + i * 0.06 }}
            >
              <div className="flex justify-between items-center">
                <span
                  className="font-stat text-sm truncate"
                  style={{ color: i === 0 ? "var(--aw-coral)" : "var(--aw-ink-soft)" }}
                >
                  {m.model}
                </span>
                <span className="font-stat text-xs ml-3 shrink-0" style={{ color: "var(--aw-ink-mute)" }}>
                  {m.messages.toLocaleString()}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--aw-surface-2)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: i === 0 ? "var(--aw-coral)" : "var(--aw-surface-2)" }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={isVisible ? { scaleX: pct, originX: 0 } : { scaleX: 0, originX: 0 }}
                  transition={{ ...springBouncy, delay: 0.4 + i * 0.06 }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: i === 0 ? "var(--aw-coral)" : "var(--aw-hairline)",
                      width: "100%",
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
