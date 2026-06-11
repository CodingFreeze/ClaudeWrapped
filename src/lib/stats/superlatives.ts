// ---------------------------------------------------------------------------
// Superlative booleans derived from WrappedStats fields.
// ---------------------------------------------------------------------------

import type { WrappedStats } from "../types";

export interface Superlatives {
  nightOwl: boolean;
  earlyBird: boolean;
  weekendWarrior: boolean;
  marathoner: boolean;
  tokenBurner?: boolean;
}

/**
 * Derive all superlative badges from a WrappedStats object.
 */
export function computeSuperlatives(stats: WrappedStats): Superlatives {
  const hist = stats.hourHistogram;
  const daily = stats.dailySeries;

  // Night owl: >40% of activity between 22:00–02:59
  let nightOwl = false;
  if (hist && hist.length === 24) {
    const total = hist.reduce((s, v) => s + v, 0);
    if (total > 0) {
      const nightHours = hist[22] + hist[23] + hist[0] + hist[1] + hist[2];
      nightOwl = nightHours / total > 0.4;
    }
  }

  // Early bird: >40% of activity between 05:00–08:59
  let earlyBird = false;
  if (hist && hist.length === 24) {
    const total = hist.reduce((s, v) => s + v, 0);
    if (total > 0) {
      const morningHours = hist[5] + hist[6] + hist[7] + hist[8];
      earlyBird = morningHours / total > 0.4;
    }
  }

  // Weekend warrior: >40% of activity on Sat(6) or Sun(0)
  let weekendWarrior = false;
  if (daily && daily.length > 0) {
    const totalMessages = daily.reduce((s, d) => s + d.messages, 0);
    if (totalMessages > 0) {
      const weekendMessages = daily.reduce((s, d) => {
        const day = new Date(d.date).getDay();
        return s + (day === 0 || day === 6 ? d.messages : 0);
      }, 0);
      weekendWarrior = weekendMessages / totalMessages > 0.4;
    }
  }

  // Marathoner: longest streak >= 30 days
  const marathoner = (stats.streak?.longestDays ?? 0) >= 30;

  // Token burner: > 1M real tokens (only for real token counts)
  let tokenBurner: boolean | undefined = undefined;
  if (stats.tokenUsage && !stats.tokenUsage.estimated) {
    const total = stats.tokenUsage.input + stats.tokenUsage.output;
    tokenBurner = total > 1_000_000;
  }

  return { nightOwl, earlyBird, weekendWarrior, marathoner, tokenBurner };
}
