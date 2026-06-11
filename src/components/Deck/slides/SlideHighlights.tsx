// ---------------------------------------------------------------------------
// SlideHighlights — S9: per-provider highlight cards.
// Only shown when ≥2 providers are loaded.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";

const springBouncy = { type: "spring", stiffness: 600, damping: 20, mass: 0.8 } as const;

interface SlideHighlightsProps {
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

const PROVIDER_COLOR: Record<string, string> = {
  "claude-code": "var(--aw-claude)",
  "claude-ai": "var(--aw-claude)",
  chatgpt: "var(--aw-chatgpt)",
  codex: "var(--aw-codex)",
  grok: "var(--aw-grok)",
  gemini: "var(--aw-gemini)",
};

function providerColor(provider: string): string {
  return PROVIDER_COLOR[provider] ?? "var(--aw-coral)";
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

/** Extract the single most interesting stat to highlight for each provider. */
function getHeadlineStat(s: WrappedStats): { value: string; label: string } {
  if (s.tokenUsage && !s.tokenUsage.estimated) {
    const total = s.tokenUsage.input + s.tokenUsage.output;
    return { value: fmt(total), label: "tokens" };
  }
  if (s.toolUseCount && s.toolUseCount > 0) {
    return { value: fmt(s.toolUseCount), label: "tool calls" };
  }
  if (s.streak && s.streak.longestDays > 0) {
    return { value: String(s.streak.longestDays), label: "day streak" };
  }
  return { value: fmt(s.messageCount), label: "messages" };
}

interface HighlightCardProps {
  stats: WrappedStats;
  index: number;
  isVisible: boolean;
}

function HighlightCard({ stats, index, isVisible }: HighlightCardProps) {
  const color = providerColor(stats.provider);
  const label = PROVIDER_LABELS[stats.provider] ?? stats.provider;
  const headline = getHeadlineStat(stats);

  return (
    <motion.div
      className="flex flex-col gap-3 rounded-2xl border p-5"
      style={{
        borderColor: color,
        background: "var(--aw-surface)",
      }}
      initial={{ opacity: 0, y: 32 }}
      animate={
        isVisible
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 32 }
      }
      transition={{ ...springBouncy, delay: 0.1 + index * 0.08 }}
    >
      {/* Provider header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{ background: `${color}22`, color }}
        >
          {stats.isCoding ? "Coding" : "Chat"}
        </span>
      </div>

      {/* Headline stat */}
      <div>
        <div
          className="font-stat text-3xl leading-none"
          style={{ color: "var(--aw-ink)" }}
        >
          {headline.value}
        </div>
        <div
          className="mt-0.5 text-xs uppercase tracking-wide"
          style={{ color: "var(--aw-ink-mute)" }}
        >
          {headline.label}
        </div>
      </div>

      {/* Secondary stat */}
      <div
        className="border-t pt-3 text-xs"
        style={{ borderColor: "var(--aw-hairline)", color: "var(--aw-ink-soft)" }}
      >
        <span className="font-stat" style={{ color }}>
          {fmt(stats.conversationCount)}
        </span>{" "}
        conversations ·{" "}
        <span className="font-stat" style={{ color }}>
          {stats.range.start.slice(0, 7)}
        </span>{" "}
        to{" "}
        <span className="font-stat" style={{ color }}>
          {stats.range.end.slice(0, 7)}
        </span>
      </div>
    </motion.div>
  );
}

export function SlideHighlights({ allStats, isVisible }: SlideHighlightsProps) {
  // Only show real provider stats (not merged/coding views)
  const providerStats = allStats.filter(
    (s) => s.provider !== "merged" && s.provider !== "coding",
  );

  if (providerStats.length < 2) return null;

  return (
    <div
      className="relative flex h-full flex-col px-8 py-14"
      style={{ background: "var(--aw-paper)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 20%, oklch(70% 0.17 40 / 0.08) 0%, transparent 70%)",
        }}
      />

      <motion.div
        className="relative z-10 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2"
          style={{ color: "var(--aw-ink-mute)" }}
        >
          By source
        </p>
        <h2
          className="font-display text-3xl sm:text-4xl"
          style={{ color: "var(--aw-ink)" }}
        >
          Provider highlights
        </h2>
      </motion.div>

      <div className="relative z-10 flex-1 overflow-auto">
        <div
          className={`grid gap-4 ${providerStats.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          {providerStats.map((s, i) => (
            <HighlightCard
              key={s.provider}
              stats={s}
              index={i}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
