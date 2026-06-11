// ---------------------------------------------------------------------------
// SlideTokens — S5: tokens burned + estimated cost.
// ---------------------------------------------------------------------------

import { motion } from "motion/react";
import { useCountUp } from "../../../hooks/useCountUp";
import { formatTokens } from "../../../lib/stats/cost";
import type { WrappedStats } from "../../../lib/types";

const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideTokensProps {
  stats: WrappedStats;
  isVisible: boolean;
}

export function SlideTokens({ stats, isVisible }: SlideTokensProps) {
  const usage = stats.tokenUsage;
  if (!usage) return null;

  const total = usage.input + usage.output;
  const totalCount = useCountUp(total, 1400, isVisible);
  const costCents = Math.round((usage.estimatedCostUSD ?? 0) * 100);
  const costDisplay = useCountUp(costCents, 1200, isVisible);

  const cacheEfficiency =
    usage.cacheRead && !usage.estimated
      ? Math.round((usage.cacheRead / (usage.input + usage.cacheRead)) * 100)
      : null;

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
            "radial-gradient(60% 50% at 50% 70%, oklch(70% 0.17 40 / 0.10) 0%, transparent 70%)",
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
          {usage.estimated ? "Estimated tokens" : "Tokens burned"}
        </motion.p>
        <motion.h2
          className="font-display aw-display-md uppercase"
          style={{ color: "var(--aw-ink)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ ...springRelaxed, delay: 0.2 }}
        >
          You generated a lot
        </motion.h2>
      </div>

      <motion.div
        className="relative z-10 flex items-baseline gap-2"
        initial={{ opacity: 0, y: 30 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ ...springRelaxed, delay: 0.3 }}
      >
        <span
          className="font-stat"
          style={{ fontSize: "clamp(3rem, 9vw, 5rem)", lineHeight: 1, color: "var(--aw-coral)" }}
        >
          {formatTokens(totalCount)}
        </span>
        <span className="font-display text-xl uppercase" style={{ color: "var(--aw-ink-soft)" }}>
          tokens
        </span>
      </motion.div>

      <div className="relative z-10 flex flex-col gap-3">
        {/* Token breakdown */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ ...springRelaxed, delay: 0.5 }}
        >
          <TokenStat label="Input" value={formatTokens(usage.input)} />
          <TokenStat label="Output" value={formatTokens(usage.output)} />
          {usage.cacheRead !== undefined && (
            <TokenStat label="Cache read" value={formatTokens(usage.cacheRead)} />
          )}
          {usage.cacheCreate !== undefined && (
            <TokenStat label="Cache create" value={formatTokens(usage.cacheCreate)} />
          )}
        </motion.div>

        {/* Cost estimate */}
        {usage.estimatedCostUSD !== undefined && (
          <motion.div
            className="rounded-xl border p-3"
            style={{ borderColor: "var(--aw-hairline)", background: "var(--aw-surface)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ ...springRelaxed, delay: 0.6 }}
          >
            <div className="flex justify-between items-baseline">
              <span className="text-xs" style={{ color: "var(--aw-ink-mute)" }}>
                Estimated cost
              </span>
              <span className="font-stat text-lg" style={{ color: "var(--aw-ink)" }}>
                ${(costDisplay / 100).toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-[10px]" style={{ color: "var(--aw-ink-mute)" }}>
              Based on claude-3.5-sonnet pricing. Actual cost may vary by model.
            </p>
          </motion.div>
        )}

        {/* Cache efficiency */}
        {cacheEfficiency !== null && (
          <motion.p
            className="text-sm"
            style={{ color: "var(--aw-ink-soft)" }}
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
            transition={{ ...springRelaxed, delay: 0.7 }}
          >
            Cache hit rate:{" "}
            <span className="font-stat" style={{ color: "var(--aw-coral)" }}>
              {cacheEfficiency}%
            </span>
          </motion.p>
        )}

        {usage.estimated && (
          <p className="text-[10px]" style={{ color: "var(--aw-ink-mute)" }}>
            Token counts are estimated from message content length.
          </p>
        )}
      </div>
    </div>
  );
}

function TokenStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "var(--aw-surface)" }}
    >
      <div className="font-stat text-lg" style={{ color: "var(--aw-ink)" }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--aw-ink-mute)" }}>
        {label}
      </div>
    </div>
  );
}
