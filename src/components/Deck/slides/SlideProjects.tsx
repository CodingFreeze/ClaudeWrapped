// ---------------------------------------------------------------------------
// SlideProjects — "WHERE THE WORK HAPPENED"
// Top projects horizontal bars + sessions/messages + activeDays.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springBouncy = { type: "spring", stiffness: 600, damping: 20, mass: 0.8 } as const;
const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideProjectsProps {
  stats: WrappedStats;
  isVisible: boolean;
}

export function SlideProjects({ stats, isVisible }: SlideProjectsProps) {
  const projects = stats.projectStats;
  if (!projects || projects.length === 0) return null;

  const topProjects = projects.slice(0, 6);
  const maxMessages = Math.max(...topProjects.map((p) => p.messages), 1);

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
            "radial-gradient(55% 45% at 80% 20%, oklch(65% 0.13 260 / 0.07) 0%, transparent 70%)",
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
          Projects
        </motion.p>
        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          Where the work happened
        </motion.h2>
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        {topProjects.map((p, i) => {
          const pct = p.messages / maxMessages;
          const shortName = p.name.includes("/")
            ? p.name.split("/").slice(-1)[0]
            : p.name;

          return (
            <motion.div
              key={p.name}
              className="flex flex-col gap-1"
              initial={{ opacity: 0, x: -20 }}
              animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ ...springRelaxed, delay: 0.3 + i * 0.07 }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="font-stat text-sm truncate"
                  style={{ color: i === 0 ? "var(--aw-coral)" : "var(--aw-ink-soft)" }}
                  title={p.name}
                >
                  {shortName}
                </span>
                <span className="font-stat text-xs shrink-0" style={{ color: "var(--aw-ink-mute)" }}>
                  {p.messages.toLocaleString()} msgs · {p.sessions} sessions · {p.activeDays}d
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
                  transition={{ ...springBouncy, delay: 0.4 + i * 0.07 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
