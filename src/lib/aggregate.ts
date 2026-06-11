// ---------------------------------------------------------------------------
// Merge multiple WrappedStats objects into a single merged or coding-only view.
// ---------------------------------------------------------------------------

import type { WrappedStats } from "./types";
import { computeStreak } from "./stats/streaks";
import { computeSuperlatives } from "./stats/superlatives";

/** Merge a map of month→messages from multiple series. */
function mergeMonthlySeries(
  series: { month: string; messages: number }[][],
): { month: string; messages: number }[] {
  const counts = new Map<string, number>();
  for (const s of series) {
    for (const { month, messages } of s) {
      counts.set(month, (counts.get(month) ?? 0) + messages);
    }
  }
  return [...counts.entries()]
    .map(([month, messages]) => ({ month, messages }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

/** Merge daily series. */
function mergeDailySeries(
  series: Array<{ date: string; messages: number }[] | undefined>,
): { date: string; messages: number }[] | undefined {
  const filtered = series.filter((s): s is { date: string; messages: number }[] => !!s);
  if (filtered.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const s of filtered) {
    for (const { date, messages } of s) {
      counts.set(date, (counts.get(date) ?? 0) + messages);
    }
  }
  return [...counts.entries()]
    .map(([date, messages]) => ({ date, messages }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Merge hour histograms. */
function mergeHistograms(
  hists: Array<number[] | undefined>,
): number[] | undefined {
  const filtered = hists.filter((h): h is number[] => !!h && h.length === 24);
  if (filtered.length === 0) return undefined;
  return filtered.reduce((acc, h) => acc.map((v, i) => v + h[i]), new Array<number>(24).fill(0));
}

/** Aggregate merged stats. */
export function aggregateStats(
  allStats: WrappedStats[],
  provider: WrappedStats["provider"] = "merged",
): WrappedStats {
  if (allStats.length === 0) {
    throw new Error("Cannot aggregate empty stats array");
  }
  if (allStats.length === 1) {
    return { ...allStats[0], provider };
  }

  const starts = allStats.map((s) => s.range.start).sort();
  const ends = allStats.map((s) => s.range.end).sort();

  const monthlySeries = mergeMonthlySeries(allStats.map((s) => s.monthlySeries));
  const dailySeries = mergeDailySeries(allStats.map((s) => s.dailySeries));
  const hourHistogram = mergeHistograms(allStats.map((s) => s.hourHistogram));

  const streak = dailySeries ? computeStreak(dailySeries) : undefined;

  // Merge model breakdowns
  const mbMap = new Map<string, { messages: number; tokens?: number }>();
  for (const s of allStats) {
    for (const m of s.modelBreakdown ?? []) {
      const existing = mbMap.get(m.model);
      if (existing) {
        existing.messages += m.messages;
        if (m.tokens !== undefined) existing.tokens = (existing.tokens ?? 0) + m.tokens;
      } else {
        mbMap.set(m.model, { messages: m.messages, tokens: m.tokens });
      }
    }
  }
  const modelBreakdown = mbMap.size > 0
    ? [...mbMap.entries()]
        .map(([model, v]) => ({ model, ...v }))
        .sort((a, b) => b.messages - a.messages)
    : undefined;

  // Merge token usage (only combine real token stats)
  const realTokenStats = allStats
    .map((s) => s.tokenUsage)
    .filter((t): t is NonNullable<typeof t> => !!t && !t.estimated);
  const estimatedTokenStats = allStats
    .map((s) => s.tokenUsage)
    .filter((t): t is NonNullable<typeof t> => !!t && t.estimated);
  const tokenUsage =
    realTokenStats.length > 0
      ? {
          input: realTokenStats.reduce((s, t) => s + t.input, 0),
          output: realTokenStats.reduce((s, t) => s + t.output, 0),
          cacheRead: realTokenStats.reduce((s, t) => s + (t.cacheRead ?? 0), 0),
          cacheCreate: realTokenStats.reduce((s, t) => s + (t.cacheCreate ?? 0), 0),
          estimated: false,
        }
      : estimatedTokenStats.length > 0
        ? {
            input: estimatedTokenStats.reduce((s, t) => s + t.input, 0),
            output: estimatedTokenStats.reduce((s, t) => s + t.output, 0),
            estimated: true,
          }
        : undefined;

  const merged: WrappedStats = {
    provider,
    range: { start: starts[0], end: ends[ends.length - 1] },
    sessionCount: allStats.reduce((s, x) => s + x.sessionCount, 0),
    conversationCount: allStats.reduce((s, x) => s + x.conversationCount, 0),
    messageCount: allStats.reduce((s, x) => s + x.messageCount, 0),
    userMessageCount: allStats.reduce((s, x) => s + x.userMessageCount, 0),
    assistantMessageCount: allStats.reduce((s, x) => s + x.assistantMessageCount, 0),
    toolUseCount: allStats.some((s) => s.toolUseCount !== undefined)
      ? allStats.reduce((s, x) => s + (x.toolUseCount ?? 0), 0)
      : undefined,
    monthlySeries,
    dailySeries,
    hourHistogram,
    modelBreakdown,
    tokenUsage,
    streak: streak
      ? {
          longestDays: streak.longestDays,
          longestStart: streak.longestStart,
          busiestDate: streak.busiestDate,
          busiestCount: streak.busiestCount,
        }
      : undefined,
    codingStats:
      allStats.some((s) => s.codingStats) ? undefined : undefined, // merged coding stats TBD in P3
    source: {
      fileCount: allStats.reduce((s, x) => s + x.source.fileCount, 0),
      bytes: allStats.reduce((s, x) => s + x.source.bytes, 0),
      parseWarnings: allStats.flatMap((s) => s.source.parseWarnings),
    },
    isCoding: allStats.every((s) => s.isCoding),
  };

  merged.superlatives = computeSuperlatives(merged);
  return merged;
}

/** Filter to only coding providers (claude-code, codex). */
export function filterCodingStats(allStats: WrappedStats[]): WrappedStats[] {
  return allStats.filter((s) => s.isCoding);
}
