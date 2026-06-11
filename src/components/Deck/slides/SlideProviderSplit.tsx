// ---------------------------------------------------------------------------
// SlideProviderSplit — S6: provider breakdown (merged mode only).
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springBouncy = { type: "spring", stiffness: 600, damping: 20, mass: 0.8 } as const;
const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideProviderSplitProps {
  allStats: WrappedStats[];
  isVisible: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  "claude-ai": "Claude.ai",
  chatgpt: "ChatGPT",
  codex: "Codex CLI",
  grok: "Grok",
  gemini: "Gemini",
};

const PROVIDER_COLORS: Record<string, string> = {
  "claude-code": "var(--aw-claude)",
  "claude-ai": "var(--aw-claude)",
  chatgpt: "var(--aw-chatgpt)",
  codex: "var(--aw-codex)",
  grok: "var(--aw-grok)",
  gemini: "var(--aw-gemini)",
};

export function SlideProviderSplit({ allStats, isVisible }: SlideProviderSplitProps) {
  if (allStats.length < 2) return null;

  const total = allStats.reduce((s, st) => s + st.messageCount, 0);
  const sorted = [...allStats].sort((a, b) => b.messageCount - a.messageCount);

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
            "radial-gradient(60% 40% at 60% 30%, oklch(65% 0.12 250 / 0.07) 0%, transparent 70%)",
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
          Provider split
        </motion.p>
        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          Your AI mix
        </motion.h2>
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        {sorted.map((s, i) => {
          const pct = total > 0 ? s.messageCount / total : 0;
          const color = PROVIDER_COLORS[s.provider] ?? "var(--aw-ink-mute)";
          const label = PROVIDER_LABELS[s.provider] ?? s.provider;

          return (
            <motion.div
              key={s.provider}
              className="flex flex-col gap-1"
              initial={{ opacity: 0, x: -20 }}
              animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ ...springRelaxed, delay: 0.3 + i * 0.08 }}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold" style={{ color: "var(--aw-ink)" }}>
                  {label}
                </span>
                <span className="font-stat text-sm" style={{ color: "var(--aw-ink-soft)" }}>
                  {Math.round(pct * 100)}% · {s.messageCount.toLocaleString()} msgs
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--aw-surface-2)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={isVisible ? { scaleX: pct, originX: 0 } : { scaleX: 0, originX: 0 }}
                  transition={{ ...springBouncy, delay: 0.4 + i * 0.08 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
