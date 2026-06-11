// ---------------------------------------------------------------------------
// Hour histogram from ISO timestamp strings.
// ---------------------------------------------------------------------------

/**
 * Builds a 24-element array (index = hour 0–23) counting how many timestamps
 * fall in each hour. Timestamps must be ISO 8601 strings.
 */
export function buildHourHistogram(timestamps: string[]): number[] {
  const hist = new Array<number>(24).fill(0);
  for (const ts of timestamps) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    const h = d.getHours();
    hist[h]++;
  }
  return hist;
}
