// ---------------------------------------------------------------------------
// Synthetic sample data so visitors can see the wrapped experience without
// uploading their own export. Shapes match ClaudeAiParseResult exactly so the
// existing render path is reused verbatim — no special-casing downstream.
// ---------------------------------------------------------------------------

import type { ClaudeAiParseResult } from "./types";
import type { MonthlyDatum } from "./wrapped";

/** A plausible year of activity that ramps up and peaks mid-year. */
function buildSeries(): MonthlyDatum[] {
  const shape = [42, 58, 71, 96, 130, 188, 244, 201, 167, 152, 119, 88];
  const now = new Date();
  const series: MonthlyDatum[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    series.push({ month, count: shape[11 - i] });
  }
  return series;
}

export function buildSampleResult(): ClaudeAiParseResult {
  const monthlySeries = buildSeries();
  const messageCount = monthlySeries.reduce((s, d) => s + d.count, 0);
  const earliest = `${monthlySeries[0].month}-01T09:00:00Z`;
  const latest = `${monthlySeries[monthlySeries.length - 1].month}-26T22:14:00Z`;

  return {
    source: "claude.ai",
    fileName: "sample-data.zip",
    conversationCount: 327,
    messageCount,
    senderCounts: {
      human: Math.round(messageCount * 0.5),
      assistant: messageCount - Math.round(messageCount * 0.5),
    },
    monthlySeries,
    earliest,
    latest,
    warnings: [],
  };
}
