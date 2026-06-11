// ---------------------------------------------------------------------------
// Derives normalized time-series fields from raw message timestamps.
// Used by parsers to populate monthlySeries, dailySeries, hourHistogram.
// ---------------------------------------------------------------------------

export interface DatedItem {
  ts: string;
  [key: string]: unknown;
}

/** Returns 'YYYY-MM' from a timestamp or null if invalid. */
function monthKey(ts: string): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(ts);
  if (!m) return null;
  if (Number.isNaN(Date.parse(ts))) return null;
  return `${m[1]}-${m[2]}`;
}

/** Returns 'YYYY-MM-DD' from a timestamp or null if invalid. */
function dateKey(ts: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ts);
  if (!m) return null;
  if (Number.isNaN(Date.parse(ts))) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function buildMonthlySeries(
  timestamps: string[],
): { month: string; messages: number }[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const k = monthKey(ts);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([month, messages]) => ({ month, messages }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

export function buildDailySeries(
  timestamps: string[],
): { date: string; messages: number }[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const k = dateKey(ts);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([date, messages]) => ({ date, messages }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
