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

/** Merge wordStats across providers: sum counts, re-top. */
function mergeWordStats(
  allStats: WrappedStats[],
): WrappedStats["wordStats"] | undefined {
  const withWords = allStats.filter((s) => s.wordStats);
  if (withWords.length === 0) return undefined;

  // Merge user word maps
  const userWordMap = new Map<string, number>();
  for (const s of withWords) {
    for (const { word, count } of s.wordStats!.userTopWords) {
      userWordMap.set(word, (userWordMap.get(word) ?? 0) + count);
    }
  }
  const userTopWords = [...userWordMap.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // Merge per-model top words: collect by model name, sum counts, re-top
  const modelWordMaps = new Map<string, Map<string, number>>();
  for (const s of withWords) {
    for (const { model, words } of s.wordStats!.perModelTopWords) {
      let mmap = modelWordMaps.get(model);
      if (!mmap) { mmap = new Map(); modelWordMaps.set(model, mmap); }
      for (const { word, count } of words) {
        mmap.set(word, (mmap.get(word) ?? 0) + count);
      }
    }
  }
  const perModelTopWords = [...modelWordMaps.entries()].map(([model, mmap]) => ({
    model,
    words: [...mmap.entries()]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  }));

  const totalUserWords = withWords.reduce((s, x) => s + (x.wordStats!.totalUserWords), 0);
  const totalAssistantWords = withWords.reduce((s, x) => s + (x.wordStats!.totalAssistantWords), 0);
  const distinctUserWords = userWordMap.size;
  const verbosityRatio = totalUserWords > 0
    ? Math.round((totalAssistantWords / totalUserWords) * 10) / 10
    : 0;

  return { userTopWords, perModelTopWords, totalUserWords, totalAssistantWords, distinctUserWords, verbosityRatio };
}

/** Merge toolStats across providers: sum counts, re-top. */
function mergeToolStats(
  allStats: WrappedStats[],
): WrappedStats["toolStats"] | undefined {
  const withTools = allStats.filter((s) => s.toolStats);
  if (withTools.length === 0) return undefined;

  const toolMap = new Map<string, number>();
  let totalInvocations = 0;
  for (const s of withTools) {
    for (const { name, count } of s.toolStats!.topTools) {
      toolMap.set(name, (toolMap.get(name) ?? 0) + count);
    }
    totalInvocations += s.toolStats!.totalInvocations;
  }
  const topTools = [...toolMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return { topTools, totalInvocations };
}

/** Merge projectStats across providers: combine by name. */
function mergeProjectStats(
  allStats: WrappedStats[],
): WrappedStats["projectStats"] | undefined {
  const withProjects = allStats.filter((s) => s.projectStats && s.projectStats.length > 0);
  if (withProjects.length === 0) return undefined;

  const projectMap = new Map<string, {
    sessions: number;
    messages: number;
    firstSeen: string;
    lastSeen: string;
    activeDays: number;
  }>();

  for (const s of withProjects) {
    for (const p of s.projectStats!) {
      const existing = projectMap.get(p.name);
      if (existing) {
        existing.sessions += p.sessions;
        existing.messages += p.messages;
        if (p.firstSeen < existing.firstSeen) existing.firstSeen = p.firstSeen;
        if (p.lastSeen > existing.lastSeen) existing.lastSeen = p.lastSeen;
        existing.activeDays += p.activeDays;
      } else {
        projectMap.set(p.name, { ...p });
      }
    }
  }

  return [...projectMap.entries()]
    .map(([name, p]) => ({ name, ...p }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 8);
}

/** Merge extras across providers: pick busiest weekday, sum activeDays. */
function mergeExtras(
  allStats: WrappedStats[],
): WrappedStats["extras"] | undefined {
  const withExtras = allStats.filter((s) => s.extras);
  if (withExtras.length === 0) return undefined;

  const WEEKDAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const weekdayTotals = new Array<number>(7).fill(0);
  // We can't re-derive weekday from merged daily, but we can aggregate the per-weekday totals
  // by summing across providers (approximation).
  // For merged stats we take the provider with the most activeDays as anchor.
  const anchor = withExtras.reduce((a, b) =>
    (a.extras!.totalActiveDays > b.extras!.totalActiveDays ? a : b),
  );

  const totalActiveDays = withExtras.reduce((s, x) => s + x.extras!.totalActiveDays, 0);
  const messageCount = allStats.reduce((s, x) => s + x.messageCount, 0);
  const avgMessagesPerActiveDay = totalActiveDays > 0
    ? Math.round(messageCount / totalActiveDays)
    : 0;

  // Pick the longest session across providers
  const longestProvider = withExtras.reduce((a, b) =>
    (a.extras!.longestSessionMessages > b.extras!.longestSessionMessages ? a : b),
  );

  // Earliest firstSessionDate
  const firstSessionDate = withExtras
    .map((s) => s.extras!.firstSessionDate)
    .filter(Boolean)
    .sort()[0] ?? "";

  const thinkingBlockCount = withExtras.reduce((s, x) => s + (x.extras!.thinkingBlockCount ?? 0), 0);

  // Rebuild weekday totals estimate: use the anchor provider's weekday
  for (let d = 0; d < 7; d++) weekdayTotals[d] = 0;
  weekdayTotals[anchor.extras!.busiestWeekday] += 1;
  const busiestWeekday = anchor.extras!.busiestWeekday;

  return {
    busiestWeekday,
    busiestWeekdayName: WEEKDAY_NAMES[busiestWeekday] ?? "Unknown",
    totalActiveDays,
    avgMessagesPerActiveDay,
    longestSessionMessages: longestProvider.extras!.longestSessionMessages,
    longestSessionDate: longestProvider.extras!.longestSessionDate,
    firstSessionDate,
    thinkingBlockCount,
  };
}

/** Merge codingStats across providers: combine topProjects/topBranches by name. */
function mergeCodingStats(
  allStats: WrappedStats[],
): WrappedStats["codingStats"] | undefined {
  const withCoding = allStats.filter((s) => s.codingStats);
  if (withCoding.length === 0) return undefined;

  // Merge topProjects by name, summing sessions, then sort desc, top 5.
  const projectMap = new Map<string, number>();
  for (const s of withCoding) {
    for (const p of s.codingStats!.topProjects) {
      projectMap.set(p.name, (projectMap.get(p.name) ?? 0) + p.sessions);
    }
  }
  const topProjects = [...projectMap.entries()]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  // Merge topBranches by name, summing sessions, then sort desc, top 5.
  const branchMap = new Map<string, number>();
  for (const s of withCoding) {
    for (const b of s.codingStats!.topBranches) {
      branchMap.set(b.name, (branchMap.get(b.name) ?? 0) + b.sessions);
    }
  }
  const topBranches = [...branchMap.entries()]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  // Duration-weighted mean of avgSessionDurationMs across sources that have it.
  const withDuration = withCoding.filter(
    (s) => s.codingStats!.avgSessionDurationMs !== undefined,
  );
  let avgSessionDurationMs: number | undefined;
  if (withDuration.length > 0) {
    const totalSessions = withDuration.reduce(
      (sum, s) => sum + s.codingStats!.topProjects.reduce((ps, p) => ps + p.sessions, 0),
      0,
    );
    if (totalSessions > 0) {
      avgSessionDurationMs =
        withDuration.reduce((sum, s) => {
          const sessions = s.codingStats!.topProjects.reduce((ps, p) => ps + p.sessions, 0);
          return sum + s.codingStats!.avgSessionDurationMs! * sessions;
        }, 0) / totalSessions;
    }
  }

  return { topProjects, topBranches, avgSessionDurationMs };
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
    codingStats: mergeCodingStats(allStats),
    projectStats: mergeProjectStats(allStats),
    wordStats: mergeWordStats(allStats),
    toolStats: mergeToolStats(allStats),
    extras: mergeExtras(allStats),
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
