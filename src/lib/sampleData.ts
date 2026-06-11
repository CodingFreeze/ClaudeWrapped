// ---------------------------------------------------------------------------
// Sample data for P2 deck preview ("Try with sample data" on landing).
// Shapes match the full WrappedStats interface.
// ---------------------------------------------------------------------------

import type { ClaudeAiParseResult } from "./types";
import type { WrappedStats } from "./types";
import type { MonthlyDatum } from "./wrapped";

// --- Legacy sample (kept for backward compat until old panels are removed) ---

function buildLegacySeries(): MonthlyDatum[] {
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
  const monthlySeries = buildLegacySeries();
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

// --- New: WrappedStats sample data for the deck ---

function buildMonthly(
  shape: number[],
  year = 2025,
): { month: string; messages: number }[] {
  return shape.map((messages, i) => ({
    month: `${year}-${String(i + 1).padStart(2, "0")}`,
    messages,
  }));
}

function buildDaily(
  monthlySeries: { month: string; messages: number }[],
): { date: string; messages: number }[] {
  const daily: { date: string; messages: number }[] = [];
  for (const { month, messages } of monthlySeries) {
    const [year, mon] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    // Spread messages across roughly 18 active days in the month
    const activeDays = Math.min(daysInMonth, Math.max(1, Math.round(messages / 15)));
    for (let d = 1; d <= activeDays; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      daily.push({ date, messages: Math.round(messages / activeDays) });
    }
  }
  return daily;
}

// Claude.ai sample — counts only, no tokens
const claudeAiMonthlySeries = buildMonthly([42, 58, 71, 96, 130, 188, 244, 201, 167, 152, 119, 88]);
export const sampleClaudeAiStats: WrappedStats = {
  provider: "claude-ai",
  range: { start: "2025-01-01", end: "2025-12-31" },
  sessionCount: 327,
  conversationCount: 327,
  messageCount: claudeAiMonthlySeries.reduce((s, d) => s + d.messages, 0),
  userMessageCount: Math.round(claudeAiMonthlySeries.reduce((s, d) => s + d.messages, 0) * 0.5),
  assistantMessageCount: Math.round(claudeAiMonthlySeries.reduce((s, d) => s + d.messages, 0) * 0.5),
  monthlySeries: claudeAiMonthlySeries,
  dailySeries: buildDaily(claudeAiMonthlySeries),
  hourHistogram: [
    2, 1, 0, 0, 1, 8, 22, 45, 67, 72, 80, 77,
    65, 58, 63, 70, 74, 82, 90, 88, 73, 50, 31, 12,
  ],
  streak: {
    longestDays: 18,
    longestStart: "2025-07-01",
    busiestDate: "2025-07-14",
    busiestCount: 34,
  },
  superlatives: {
    nightOwl: false,
    earlyBird: false,
    weekendWarrior: true,
    marathoner: false,
  },
  source: { fileCount: 1, bytes: 2_400_000, parseWarnings: [] },
  isCoding: false,
};

// ChatGPT sample — rich, with model breakdown + tokens
const chatgptMonthlySeries = buildMonthly([30, 44, 55, 88, 112, 145, 198, 166, 143, 128, 99, 71]);
export const sampleChatGptStats: WrappedStats = {
  provider: "chatgpt",
  range: { start: "2025-01-01", end: "2025-12-31" },
  sessionCount: 259,
  conversationCount: 259,
  messageCount: chatgptMonthlySeries.reduce((s, d) => s + d.messages, 0),
  userMessageCount: Math.round(chatgptMonthlySeries.reduce((s, d) => s + d.messages, 0) * 0.48),
  assistantMessageCount: Math.round(chatgptMonthlySeries.reduce((s, d) => s + d.messages, 0) * 0.52),
  monthlySeries: chatgptMonthlySeries,
  dailySeries: buildDaily(chatgptMonthlySeries),
  hourHistogram: [
    3, 2, 1, 0, 0, 5, 18, 38, 55, 64, 72, 68,
    55, 50, 58, 66, 70, 75, 80, 77, 62, 42, 25, 9,
  ],
  modelBreakdown: [
    { model: "gpt-4o", messages: 780 },
    { model: "o1-preview", messages: 245 },
    { model: "gpt-4-turbo", messages: 123 },
    { model: "gpt-3.5-turbo", messages: 31 },
  ],
  tokenUsage: {
    input: 1_240_000,
    output: 380_000,
    estimated: true,
    estimatedCostUSD: 9.42,
  },
  streak: {
    longestDays: 22,
    longestStart: "2025-06-10",
    busiestDate: "2025-07-08",
    busiestCount: 28,
  },
  superlatives: {
    nightOwl: false,
    earlyBird: true,
    weekendWarrior: false,
    marathoner: false,
    tokenBurner: false,
  },
  source: { fileCount: 1, bytes: 8_900_000, parseWarnings: [] },
  isCoding: false,
};

// Merged sample
export const sampleMergedStats: WrappedStats = {
  provider: "merged",
  range: { start: "2025-01-01", end: "2025-12-31" },
  sessionCount: sampleClaudeAiStats.sessionCount + sampleChatGptStats.sessionCount,
  conversationCount: sampleClaudeAiStats.conversationCount + sampleChatGptStats.conversationCount,
  messageCount: sampleClaudeAiStats.messageCount + sampleChatGptStats.messageCount,
  userMessageCount: sampleClaudeAiStats.userMessageCount + sampleChatGptStats.userMessageCount,
  assistantMessageCount: sampleClaudeAiStats.assistantMessageCount + sampleChatGptStats.assistantMessageCount,
  monthlySeries: claudeAiMonthlySeries.map((d, i) => ({
    month: d.month,
    messages: d.messages + chatgptMonthlySeries[i].messages,
  })),
  dailySeries: buildDaily(claudeAiMonthlySeries.map((d, i) => ({
    month: d.month,
    messages: d.messages + chatgptMonthlySeries[i].messages,
  }))),
  hourHistogram: sampleClaudeAiStats.hourHistogram?.map(
    (v, i) => v + (sampleChatGptStats.hourHistogram?.[i] ?? 0),
  ),
  modelBreakdown: sampleChatGptStats.modelBreakdown,
  tokenUsage: sampleChatGptStats.tokenUsage,
  streak: {
    longestDays: 22,
    longestStart: "2025-06-10",
    busiestDate: "2025-07-08",
    busiestCount: 44,
  },
  superlatives: {
    nightOwl: false,
    earlyBird: true,
    weekendWarrior: true,
    marathoner: false,
    tokenBurner: false,
  },
  source: {
    fileCount: 2,
    bytes: sampleClaudeAiStats.source.bytes + sampleChatGptStats.source.bytes,
    parseWarnings: [],
  },
  isCoding: false,
};
