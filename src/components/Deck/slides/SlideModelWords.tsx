// ---------------------------------------------------------------------------
// SlideModelWords — "WHAT THE MODELS KEPT SAYING"
// Per-model word chips (max 3 models, 6 words each).
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;
const springBouncy = { type: "spring", stiffness: 500, damping: 22, mass: 0.9 } as const;

interface SlideModelWordsProps {
  stats: WrappedStats;
  isVisible: boolean;
}

// Shorten model name for display
function shortModelName(model: string): string {
  return model
    .replace(/^claude-/, "")
    .replace(/-\d{4}-\d{2}-\d{2}$/, "")
    .replace(/-latest$/, "");
}

export function SlideModelWords({ stats, isVisible }: SlideModelWordsProps) {
  const ws = stats.wordStats;
  if (!ws || ws.perModelTopWords.length === 0) return null;

  const models = ws.perModelTopWords.slice(0, 3);

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
            "radial-gradient(50% 40% at 30% 70%, oklch(65% 0.12 155 / 0.06) 0%, transparent 70%)",
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
          Model vocabulary
        </motion.p>
        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          What the models kept saying
        </motion.h2>
      </div>

      <div className="relative z-10 flex flex-col gap-6">
        {models.map((m, mi) => (
          <motion.div
            key={m.model}
            initial={{ opacity: 0, x: -16 }}
            animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
            transition={{ ...springRelaxed, delay: 0.35 + mi * 0.15 }}
          >
            <p
              className="font-stat text-xs uppercase tracking-[0.1em] mb-2"
              style={{ color: mi === 0 ? "var(--aw-coral)" : "var(--aw-ink-mute)" }}
            >
              {shortModelName(m.model)}
            </p>
            <div className="flex flex-wrap gap-2">
              {m.words.slice(0, 6).map((w, wi) => (
                <motion.span
                  key={w.word}
                  className="rounded-full border px-3 py-1 font-stat text-sm"
                  style={{
                    borderColor: mi === 0 ? "var(--aw-coral)" : "var(--aw-hairline)",
                    color: mi === 0 && wi === 0 ? "var(--aw-coral)" : "var(--aw-ink-soft)",
                    background: "transparent",
                  }}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
                  transition={{ ...springBouncy, delay: 0.4 + mi * 0.15 + wi * 0.04 }}
                >
                  {w.word}
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
