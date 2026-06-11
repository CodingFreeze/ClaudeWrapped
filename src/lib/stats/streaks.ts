// ---------------------------------------------------------------------------
// Streak computation from a daily series.
// ---------------------------------------------------------------------------

export interface DailyMessage {
  date: string;
  messages: number;
}

export interface StreakResult {
  longestDays: number;
  longestStart: string;
  busiestDate: string;
  busiestCount: number;
}

/** Returns the number of calendar days between two ISO date strings (YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

/**
 * Compute the longest consecutive-day streak and the busiest single day
 * from a daily series.
 */
export function computeStreak(dailySeries: DailyMessage[]): StreakResult | undefined {
  const active = dailySeries.filter((d) => d.messages > 0);
  if (active.length === 0) return undefined;

  // Busiest day
  const busiest = active.reduce(
    (best, d) => (d.messages > best.messages ? d : best),
    active[0],
  );

  // Sorted unique dates
  const sorted = [...new Set(active.map((d) => d.date))].sort();
  if (sorted.length === 0) return undefined;

  // Walk sorted dates; evaluate every run (including the first) identically.
  // Strict > means ties keep the EARLIEST start (first run wins).
  let longestDays = 0;
  let longestStart = sorted[0];
  let currentStart = sorted[0];
  let currentLen = 1;

  // Helper to close out and record a completed run.
  function closeRun() {
    if (currentLen > longestDays) {
      longestDays = currentLen;
      longestStart = currentStart;
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    if (daysBetween(sorted[i - 1], sorted[i]) === 1) {
      currentLen++;
    } else {
      closeRun();
      currentStart = sorted[i];
      currentLen = 1;
    }
  }
  // Close the final run.
  closeRun();

  return {
    longestDays,
    longestStart,
    busiestDate: busiest.date,
    busiestCount: busiest.messages,
  };
}
