// ---------------------------------------------------------------------------
// SlideIntro — S1: "Your year in AI" opener with provider info.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

const PROVIDER_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  "claude-ai": "Claude.ai",
  chatgpt: "ChatGPT",
  codex: "Codex CLI",
  grok: "Grok",
  gemini: "Gemini",
  merged: "All AI Tools",
  coding: "Coding",
};

interface SlideIntroProps {
  stats: WrappedStats;
  isVisible: boolean;
}

export function SlideIntro({ stats, isVisible }: SlideIntroProps) {
  const year = stats.range.start.slice(0, 4);
  const providerLabel = PROVIDER_LABELS[stats.provider] ?? stats.provider;

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center px-8 py-16 text-center"
      style={{ background: "var(--aw-paper)" }}
    >
      {/* Background radial bloom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 40%, oklch(70% 0.17 40 / 0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Year badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ ...springRelaxed, delay: 0.1 }}
        >
          <span
            className="inline-block rounded-full border border-dashed px-4 py-1.5 font-stat text-sm"
            style={{ borderColor: "var(--aw-coral)", color: "var(--aw-coral)" }}
          >
            {year}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          className="font-display aw-display-xl uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          Your year in AI
        </motion.h2>

        {/* Provider label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.35 }}
        >
          <span
            className="text-lg font-semibold"
            style={{ color: "var(--aw-coral)" }}
          >
            {providerLabel}
          </span>
        </motion.div>

        {/* Date range */}
        <motion.p
          className="font-stat text-sm"
          style={{ color: "var(--aw-ink-mute)" }}
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ ...springRelaxed, delay: 0.5 }}
        >
          {formatDate(stats.range.start)} — {formatDate(stats.range.end)}
        </motion.p>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
