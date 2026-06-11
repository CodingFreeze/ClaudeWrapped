// ---------------------------------------------------------------------------
// filterStatsByRange — scope a WrappedStats snapshot to a sub-range.
//
// Design notes:
//
// What CAN be re-derived from dailySeries / monthlySeries:
//   - messageCount, userMessageCount, assistantMessageCount
//     The message split (user/assistant ratio) is preserved proportionally
//     from the filtered dailySeries total vs the original totals.
//   - monthlySeries — filter to months that overlap [start, end]
//   - dailySeries   — filter to dates within [start, end] inclusive
//   - range          — updated to the filtered bounds
//   - streak         — recomputed via computeStreak on filtered dailySeries
//
// What CANNOT be re-derived (raw per-event timestamps are discarded at parse time;
// only aggregate arrays survive in WrappedStats):
//   - hourHistogram: the 24-bucket array is built from raw ISO timestamps during
//     parsing. No per-hour granularity is retained in WrappedStats after that.
//     We drop it (set to undefined) unless the selected range covers the full
//     import range, in which case the original value is exact and is kept.
//   - modelBreakdown, tokenUsage, codingStats: similarly built from raw events;
//     only the final aggregates exist. We keep them but emit a parseWarning so
//     downstream slides know the caveats.
//   - sessionCount / conversationCount: not tracked per-day in dailySeries.
//     We scale proportionally to the message count ratio.
//   - superlatives: recomputed from the filtered stats (weekendWarrior is derived
//     from dailySeries; nightOwl/earlyBird require hourHistogram which may be dropped).
// ---------------------------------------------------------------------------

import type { WrappedStats } from "../types";
import { computeStreak } from "./streaks";
import { computeSuperlatives } from "./superlatives";

/** Returns true when [start, end] covers the full import range of stats. */
function coversFullRange(
  stats: WrappedStats,
  start: string,
  end: string,
): boolean {
  return start <= stats.range.start && end >= stats.range.end;
}

/**
 * Filter a WrappedStats to a sub-date-range [start, end] (inclusive, YYYY-MM-DD).
 *
 * Exact re-derivations: monthlySeries, dailySeries, messageCount / userMessageCount /
 * assistantMessageCount, streak, range.
 *
 * Degraded fields: hourHistogram (dropped unless full range), modelBreakdown /
 * tokenUsage / codingStats (kept with a warning), sessionCount /
 * conversationCount (scaled proportionally).
 *
 * All-time passthrough: if [start, end] covers the full import range, returns
 * a shallow clone with updated range and no warnings added.
 */
export function filterStatsByRange(
  stats: WrappedStats,
  start: string,
  end: string,
): WrappedStats {
  // Passthrough: range covers full import — no filtering needed.
  if (coversFullRange(stats, start, end)) {
    return { ...stats, range: { start, end } };
  }

  // --- Filter dailySeries -----------------------------------------------
  const filteredDaily = (stats.dailySeries ?? []).filter(
    (d) => d.date >= start && d.date <= end,
  );

  // --- Filter monthlySeries -----------------------------------------------
  // A month overlaps [start, end] if its first day <= end and its last day >= start.
  const filteredMonthly = stats.monthlySeries.filter((m) => {
    const monthStart = m.month + "-01";
    // Last day of month: first day of next month minus one day.
    const [y, mo] = m.month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, mo, 0));
    const monthEnd = lastDay.toISOString().slice(0, 10);
    return monthStart <= end && monthEnd >= start;
  });

  // Clip partial months at boundaries so chart bar heights are accurate.
  // For each month in filteredMonthly, sum only days in dailySeries that fall
  // within [start, end] for that month.
  const dailyByMonth = new Map<string, number>();
  for (const d of filteredDaily) {
    const monthKey = d.date.slice(0, 7);
    dailyByMonth.set(monthKey, (dailyByMonth.get(monthKey) ?? 0) + d.messages);
  }

  const clippedMonthly = filteredMonthly.map((m) => ({
    month: m.month,
    messages: dailyByMonth.get(m.month) ?? m.messages,
  }));

  // --- Recompute message counts ------------------------------------------
  const filteredTotal = filteredDaily.reduce((s, d) => s + d.messages, 0);
  const originalTotal = stats.messageCount;

  // Derive user/assistant split proportionally from the original ratio.
  let newUserCount: number;
  let newAssistantCount: number;

  if (originalTotal > 0) {
    const ratio = filteredTotal / originalTotal;
    newUserCount = Math.round(stats.userMessageCount * ratio);
    newAssistantCount = filteredTotal - newUserCount;
    // Avoid negative due to rounding
    if (newAssistantCount < 0) newAssistantCount = 0;
  } else {
    newUserCount = 0;
    newAssistantCount = 0;
  }

  const scalingRatio = originalTotal > 0 ? filteredTotal / originalTotal : 0;
  const newSessionCount = Math.round(stats.sessionCount * scalingRatio);
  const newConversationCount = Math.round(stats.conversationCount * scalingRatio);

  // --- Streak (exact recompute from filtered daily) ----------------------
  const streakResult = computeStreak(filteredDaily);

  // --- hourHistogram ---------------------------------------------------
  // Cannot be re-derived: raw timestamps are discarded at parse time.
  // Keep undefined; slides skip the rhythm card when histogram is missing.
  const newHourHistogram = undefined;

  // --- Imprecise fields (warn but keep) ---------------------------------
  const rangeWarning =
    "Model/token/word/tool details reflect the full import, not the selected date range.";
  const legacyRangeWarning =
    "Model/token details reflect the full import, not the selected date range.";
  const existingWarnings = stats.source.parseWarnings;
  const newWarnings =
    (stats.modelBreakdown ||
      stats.tokenUsage ||
      stats.codingStats ||
      stats.wordStats ||
      stats.toolStats ||
      stats.projectStats) &&
    !existingWarnings.includes(rangeWarning) &&
    !existingWarnings.includes(legacyRangeWarning)
      ? [...existingWarnings, rangeWarning]
      : existingWarnings;

  // --- Derive new range bounds from actual data -------------------------
  const sortedDates = filteredDaily.map((d) => d.date).sort();
  const newStart = sortedDates[0] ?? start;
  const newEnd = sortedDates[sortedDates.length - 1] ?? end;

  // --- projectStats: keep only projects whose lifespan overlaps the range.
  // Per-project counts remain full-import (covered by rangeWarning).
  const newProjectStats = stats.projectStats?.filter(
    (p) => p.firstSeen <= end && p.lastSeen >= start,
  );

  // --- extras: recompute what dailySeries supports exactly; the rest
  // (longest session, thinking blocks) stays full-import (covered by warning).
  let newExtras = stats.extras;
  if (newExtras) {
    const weekdayTotals = new Array<number>(7).fill(0);
    for (const d of filteredDaily) {
      const dow = new Date(d.date + "T00:00:00Z").getUTCDay();
      weekdayTotals[dow] += d.messages;
    }
    const busiestWeekday = weekdayTotals.indexOf(Math.max(...weekdayTotals));
    const weekdayNames = [
      "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    ];
    const totalActiveDays = filteredDaily.length;
    newExtras = {
      ...newExtras,
      busiestWeekday,
      busiestWeekdayName: weekdayNames[busiestWeekday],
      totalActiveDays,
      avgMessagesPerActiveDay:
        totalActiveDays > 0 ? Math.round(filteredTotal / totalActiveDays) : 0,
      firstSessionDate: newStart,
    };
  }

  const filtered: WrappedStats = {
    ...stats,
    range: { start: newStart, end: newEnd },
    sessionCount: newSessionCount,
    conversationCount: newConversationCount,
    messageCount: filteredTotal,
    userMessageCount: newUserCount,
    assistantMessageCount: newAssistantCount,
    monthlySeries: clippedMonthly,
    dailySeries: filteredDaily.length > 0 ? filteredDaily : undefined,
    hourHistogram: newHourHistogram,
    projectStats: newProjectStats,
    extras: newExtras,
    streak: streakResult
      ? {
          longestDays: streakResult.longestDays,
          longestStart: streakResult.longestStart,
          busiestDate: streakResult.busiestDate,
          busiestCount: streakResult.busiestCount,
        }
      : undefined,
    source: {
      ...stats.source,
      parseWarnings: newWarnings,
    },
  };

  filtered.superlatives = computeSuperlatives(filtered);
  return filtered;
}
