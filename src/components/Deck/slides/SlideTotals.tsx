// ---------------------------------------------------------------------------
// SlideTotals — S1 (b): conversation + message count-up.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import { useCountUp } from "../../../hooks/useCountUp";
import type { WrappedStats } from "../../../lib/types";

const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideTotalsProps {
  stats: WrappedStats;
  isVisible: boolean;
}

function BigStat({
  value,
  label,
  delay,
  enabled,
}: {
  value: number;
  label: string;
  delay: number;
  enabled: boolean;
}) {
  const displayed = useCountUp(value, 1400, enabled);
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 40 }}
      animate={enabled ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ ...springRelaxed, delay }}
    >
      <span
        className="font-stat"
        style={{
          fontSize: "clamp(3rem, 10vw, 6rem)",
          lineHeight: 1,
          color: "var(--aw-coral)",
        }}
      >
        {displayed.toLocaleString()}
      </span>
      <span
        className="text-[11px] font-bold uppercase tracking-[0.15em]"
        style={{ color: "var(--aw-ink-mute)" }}
      >
        {label}
      </span>
    </motion.div>
  );
}

export function SlideTotals({ stats, isVisible }: SlideTotalsProps) {
  const extras = stats.extras;

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center gap-10 px-8 py-14"
      style={{ background: "var(--aw-paper)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 30% 60%, oklch(70% 0.17 40 / 0.08) 0%, transparent 70%)",
        }}
      />

      <motion.h2
        className="font-display aw-display-md text-center uppercase relative z-10"
        style={{ color: "var(--aw-ink-soft)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ ...springRelaxed, delay: 0.1 }}
      >
        You were busy
      </motion.h2>

      <div className="relative z-10 flex flex-wrap justify-center gap-16">
        <BigStat
          value={stats.conversationCount}
          label="conversations"
          delay={0.2}
          enabled={isVisible}
        />
        <BigStat
          value={stats.messageCount}
          label="messages"
          delay={0.35}
          enabled={isVisible}
        />
      </div>

      {stats.userMessageCount > 0 && (
        <motion.p
          className="relative z-10 text-sm text-center"
          style={{ color: "var(--aw-ink-soft)" }}
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ ...springRelaxed, delay: 0.6 }}
        >
          {stats.userMessageCount.toLocaleString()} from you
          {stats.assistantMessageCount > 0 && (
            <> · {stats.assistantMessageCount.toLocaleString()} from AI</>
          )}
        </motion.p>
      )}

      {/* Extras: longest session + thinking blocks */}
      {extras && (extras.longestSessionMessages > 0 || extras.thinkingBlockCount > 0) && (
        <motion.div
          className="relative z-10 flex flex-wrap justify-center gap-6"
          initial={{ opacity: 0, y: 12 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ ...springRelaxed, delay: 0.8 }}
        >
          {extras.longestSessionMessages > 0 && (
            <div className="flex flex-col items-center">
              <span className="font-stat text-xl" style={{ color: "var(--aw-coral)" }}>
                {extras.longestSessionMessages}
              </span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--aw-ink-mute)" }}>
                longest session msgs
              </span>
            </div>
          )}
          {extras.thinkingBlockCount > 0 && (
            <div className="flex flex-col items-center">
              <span className="font-stat text-xl" style={{ color: "var(--aw-ink)" }}>
                {extras.thinkingBlockCount.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--aw-ink-mute)" }}>
                thinking blocks
              </span>
            </div>
          )}
          {extras.firstSessionDate && (
            <div className="flex flex-col items-center">
              <span className="font-stat text-xl" style={{ color: "var(--aw-ink)" }}>
                {extras.firstSessionDate}
              </span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--aw-ink-mute)" }}>
                first session
              </span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
