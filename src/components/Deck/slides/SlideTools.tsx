// ---------------------------------------------------------------------------
// SlideTools — "YOUR TOOLBELT" (CC data only)
// Top tools horizontal bars + total invocations + toolMaster badge.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springBouncy = { type: "spring", stiffness: 600, damping: 20, mass: 0.8 } as const;
const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideToolsProps {
  stats: WrappedStats;
  isVisible: boolean;
}

export function SlideTools({ stats, isVisible }: SlideToolsProps) {
  const ts = stats.toolStats;
  if (!ts || ts.topTools.length === 0) return null;

  const topTools = ts.topTools.slice(0, 8);
  const maxCount = Math.max(...topTools.map((t) => t.count), 1);
  const isToolMaster = stats.superlatives?.toolMaster === true;

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
            "radial-gradient(55% 45% at 20% 80%, oklch(70% 0.17 40 / 0.07) 0%, transparent 70%)",
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
          Tools
        </motion.p>
        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          Your toolbelt
        </motion.h2>
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        {topTools.map((tool, i) => {
          const pct = tool.count / maxCount;
          return (
            <motion.div
              key={tool.name}
              className="flex flex-col gap-1"
              initial={{ opacity: 0, x: -20 }}
              animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ ...springRelaxed, delay: 0.3 + i * 0.06 }}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className="font-stat text-sm"
                  style={{ color: i === 0 ? "var(--aw-coral)" : "var(--aw-ink-soft)" }}
                >
                  {tool.name}
                </span>
                <span className="font-stat text-xs" style={{ color: "var(--aw-ink-mute)" }}>
                  {tool.count.toLocaleString()}
                </span>
              </div>

              {/* Track — explicit height so scaleX has a real dimension */}
              <div
                className="rounded-full overflow-hidden"
                style={{ background: "var(--aw-surface-2)", height: 8, width: "100%" }}
              >
                <motion.div
                  style={{
                    background: i === 0 ? "var(--aw-coral)" : "var(--aw-hairline)",
                    height: "100%",
                    width: "100%",
                    transformOrigin: "left center",
                    borderRadius: "inherit",
                  }}
                  initial={{ scaleX: 0 }}
                  animate={isVisible ? { scaleX: pct } : { scaleX: 0 }}
                  transition={{ ...springBouncy, delay: 0.4 + i * 0.06 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total + badge */}
      <div className="relative z-10 flex flex-wrap items-center gap-4">
        <motion.p
          className="font-stat text-sm"
          style={{ color: "var(--aw-ink-mute)" }}
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ ...springRelaxed, delay: 0.9 }}
        >
          {ts.totalInvocations.toLocaleString()} total invocations
        </motion.p>

        {isToolMaster && (
          <motion.span
            className="rounded-full border px-3 py-1 text-sm font-semibold"
            style={{ borderColor: "var(--aw-coral)", color: "var(--aw-coral)", background: "oklch(70% 0.17 40 / 0.08)" }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
            transition={{ ...springBouncy, delay: 1.0 }}
          >
            Tool Master
          </motion.span>
        )}
      </div>
    </div>
  );
}
