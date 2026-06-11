// ---------------------------------------------------------------------------
// SlideCodingVsChat — S7: coding split + top projects/branches.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideCodingVsChatProps {
  stats: WrappedStats;
  isVisible: boolean;
}

export function SlideCodingVsChat({ stats, isVisible }: SlideCodingVsChatProps) {
  const coding = stats.codingStats;
  if (!coding || coding.topProjects.length < 3) return null;

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
            "radial-gradient(60% 40% at 40% 60%, oklch(70% 0.08 240 / 0.10) 0%, transparent 70%)",
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
          Coding stats
        </motion.p>
        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          Top projects
        </motion.h2>
      </div>

      <div className="relative z-10 flex flex-col gap-2">
        {coding.topProjects.slice(0, 5).map((p, i) => (
          <motion.div
            key={p.name}
            className="flex justify-between items-center rounded-lg p-3"
            style={{ background: "var(--aw-surface)" }}
            initial={{ opacity: 0, x: -16 }}
            animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
            transition={{ ...springRelaxed, delay: 0.3 + i * 0.07 }}
          >
            <span className="font-stat text-sm truncate" style={{ color: "var(--aw-ink)" }}>
              {p.name}
            </span>
            <span className="font-stat text-xs ml-3 shrink-0" style={{ color: "var(--aw-ink-mute)" }}>
              {p.sessions} sessions
            </span>
          </motion.div>
        ))}
      </div>

      {coding.topBranches.length > 0 && (
        <div className="relative z-10">
          <motion.p
            className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2"
            style={{ color: "var(--aw-ink-mute)" }}
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
            transition={{ ...springRelaxed, delay: 0.7 }}
          >
            Top branches
          </motion.p>
          <div className="flex flex-wrap gap-2">
            {coding.topBranches.slice(0, 5).map((b, i) => (
              <motion.span
                key={b.name}
                className="rounded border px-2 py-0.5 font-stat text-xs"
                style={{ borderColor: "var(--aw-hairline)", color: "var(--aw-ink-soft)" }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ ...springRelaxed, delay: 0.75 + i * 0.05 }}
              >
                {b.name}
              </motion.span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
