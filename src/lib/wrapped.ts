// ---------------------------------------------------------------------------
// Pure data transforms for the "wrapped" visualizations.
//
// These are deliberately free of any React / Recharts dependency so they can be
// unit-tested in isolation (see wrapped.test.ts) and reused across cards.
// ---------------------------------------------------------------------------

/** Anything with an optional timestamp string is enough to bucket by month. */
export interface DatedMessage {
  ts?: string;
  [key: string]: unknown;
}

/** A single bar in the monthly-activity chart. */
export interface MonthlyDatum {
  /** Calendar month as 'YYYY-MM'. */
  month: string;
  /** Number of messages in that month. */
  count: number;
}

const MONTH_KEY = /^(\d{4})-(\d{2})/;

/** Extracts a 'YYYY-MM' key from a timestamp, or null if it isn't a real date. */
function monthKey(ts: string): string | null {
  const match = MONTH_KEY.exec(ts);
  if (!match) return null;
  // Reject things that match the prefix but aren't valid dates (e.g. month 99).
  if (Number.isNaN(Date.parse(ts))) return null;
  return `${match[1]}-${match[2]}`;
}

/**
 * Buckets messages by calendar month.
 *
 * Messages without a usable timestamp are skipped. The result contains only
 * months that actually have messages, sorted ascending by month — ideal for a
 * left-to-right activity chart.
 */
export function toMonthlySeries(messages: DatedMessage[]): MonthlyDatum[] {
  const counts = new Map<string, number>();

  for (const msg of messages) {
    if (typeof msg?.ts !== "string") continue;
    const key = monthKey(msg.ts);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
}
