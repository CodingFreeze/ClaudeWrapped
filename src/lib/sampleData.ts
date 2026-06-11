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
  wordStats: {
    userTopWords: [
      { word: "refactor", count: 142 },
      { word: "component", count: 118 },
      { word: "deploy", count: 97 },
      { word: "animation", count: 88 },
      { word: "database", count: 76 },
      { word: "layout", count: 65 },
      { word: "pipeline", count: 58 },
      { word: "function", count: 54 },
      { word: "schema", count: 48 },
      { word: "performance", count: 44 },
      { word: "migration", count: 39 },
      { word: "integration", count: 35 },
    ],
    perModelTopWords: [],
    totalUserWords: 52_400,
    totalAssistantWords: 0,
    distinctUserWords: 3_820,
    verbosityRatio: 0,
  },
  superlatives: {
    nightOwl: false,
    earlyBird: false,
    weekendWarrior: true,
    marathoner: false,
    wordsmith: true,
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

// Claude Code sample — rich, with tokens, tools, projectStats, wordStats, extras
const claudeCodeMonthlySeries = buildMonthly([18, 24, 38, 55, 84, 112, 156, 138, 110, 94, 77, 52]);
export const sampleClaudeCodeStats: WrappedStats = {
  provider: "claude-code",
  range: { start: "2025-01-01", end: "2025-12-31" },
  sessionCount: 412,
  conversationCount: 412,
  messageCount: claudeCodeMonthlySeries.reduce((s, d) => s + d.messages, 0) * 2,
  userMessageCount: claudeCodeMonthlySeries.reduce((s, d) => s + d.messages, 0),
  assistantMessageCount: claudeCodeMonthlySeries.reduce((s, d) => s + d.messages, 0),
  toolUseCount: 1_248,
  monthlySeries: claudeCodeMonthlySeries,
  dailySeries: buildDaily(claudeCodeMonthlySeries),
  hourHistogram: [
    1, 0, 0, 0, 0, 3, 12, 28, 52, 66, 78, 74,
    60, 55, 62, 68, 72, 79, 85, 82, 65, 45, 22, 7,
  ],
  modelBreakdown: [
    { model: "claude-opus-4-8", messages: 784, tokens: 4_200_000 },
    { model: "claude-sonnet-4-5", messages: 312, tokens: 1_800_000 },
    { model: "claude-haiku-3-5", messages: 98, tokens: 420_000 },
    { model: "claude-sonnet-3-7", messages: 42, tokens: 180_000 },
  ],
  tokenUsage: {
    input: 4_800_000,
    output: 1_800_000,
    cacheRead: 2_200_000,
    cacheCreate: 980_000,
    estimated: false,
  },
  streak: {
    longestDays: 34,
    longestStart: "2025-06-15",
    busiestDate: "2025-07-22",
    busiestCount: 48,
  },
  codingStats: {
    topProjects: [
      { name: "repos/ClaudeWrapped", sessions: 88 },
      { name: "repos/Klyo", sessions: 72 },
      { name: "repos/tandle", sessions: 54 },
      { name: "repos/portfolio", sessions: 38 },
      { name: "repos/AlgoVault", sessions: 28 },
    ],
    topBranches: [
      { name: "feat/ai-wrapped", sessions: 66 },
      { name: "main", sessions: 120 },
      { name: "feat/dashboard", sessions: 44 },
    ],
  },
  projectStats: [
    { name: "repos/ClaudeWrapped", sessions: 88, messages: 1_240, firstSeen: "2025-03-12", lastSeen: "2025-12-28", activeDays: 62 },
    { name: "repos/Klyo", sessions: 72, messages: 980, firstSeen: "2025-02-08", lastSeen: "2025-12-30", activeDays: 54 },
    { name: "repos/tandle", sessions: 54, messages: 740, firstSeen: "2025-04-01", lastSeen: "2025-11-15", activeDays: 42 },
    { name: "repos/portfolio", sessions: 38, messages: 520, firstSeen: "2025-01-20", lastSeen: "2025-10-08", activeDays: 30 },
    { name: "repos/AlgoVault", sessions: 28, messages: 380, firstSeen: "2025-05-14", lastSeen: "2025-09-22", activeDays: 22 },
    { name: "repos/ThreadViz", sessions: 18, messages: 240, firstSeen: "2025-06-01", lastSeen: "2025-08-30", activeDays: 16 },
  ],
  wordStats: {
    userTopWords: [
      { word: "refactor", count: 288 },
      { word: "component", count: 234 },
      { word: "deploy", count: 196 },
      { word: "animation", count: 172 },
      { word: "database", count: 148 },
      { word: "layout", count: 132 },
      { word: "pipeline", count: 118 },
      { word: "schema", count: 104 },
      { word: "performance", count: 96 },
      { word: "migration", count: 88 },
      { word: "integration", count: 82 },
      { word: "parser", count: 76 },
    ],
    perModelTopWords: [
      {
        model: "claude-opus-4-8",
        words: [
          { word: "implementation", count: 412 },
          { word: "approach", count: 384 },
          { word: "consider", count: 356 },
          { word: "structure", count: 328 },
          { word: "pattern", count: 298 },
          { word: "interface", count: 272 },
        ],
      },
      {
        model: "claude-sonnet-4-5",
        words: [
          { word: "solution", count: 188 },
          { word: "optimize", count: 164 },
          { word: "refactored", count: 142 },
          { word: "efficient", count: 128 },
          { word: "returns", count: 116 },
          { word: "following", count: 104 },
        ],
      },
      {
        model: "claude-haiku-3-5",
        words: [
          { word: "updated", count: 88 },
          { word: "created", count: 76 },
          { word: "added", count: 64 },
          { word: "removed", count: 56 },
          { word: "fixed", count: 48 },
          { word: "changed", count: 42 },
        ],
      },
    ],
    totalUserWords: 68_400,
    totalAssistantWords: 412_800,
    distinctUserWords: 4_240,
    verbosityRatio: 6.0,
  },
  toolStats: {
    topTools: [
      { name: "Read", count: 342 },
      { name: "Edit", count: 288 },
      { name: "Bash", count: 244 },
      { name: "Write", count: 178 },
      { name: "TodoWrite", count: 112 },
      { name: "TodoRead", count: 88 },
      { name: "LS", count: 62 },
      { name: "Grep", count: 48 },
    ],
    totalInvocations: 1_248,
  },
  extras: {
    busiestWeekday: 2,
    busiestWeekdayName: "Tuesday",
    totalActiveDays: 218,
    avgMessagesPerActiveDay: 8,
    longestSessionMessages: 142,
    longestSessionDate: "2025-07-22",
    firstSessionDate: "2025-01-08",
    thinkingBlockCount: 284,
  },
  superlatives: {
    nightOwl: false,
    earlyBird: false,
    weekendWarrior: false,
    marathoner: true,
    tokenBurner: true,
    polyglot: true,
    toolMaster: true,
    wordsmith: true,
    projectHopper: true,
  },
  source: { fileCount: 412, bytes: 48_000_000, parseWarnings: [] },
  isCoding: true,
};

// Merged sample — combines ClaudeAI + ChatGPT + CC
export const sampleMergedStats: WrappedStats = {
  provider: "merged",
  range: { start: "2025-01-01", end: "2025-12-31" },
  sessionCount: sampleClaudeAiStats.sessionCount + sampleChatGptStats.sessionCount + sampleClaudeCodeStats.sessionCount,
  conversationCount: sampleClaudeAiStats.conversationCount + sampleChatGptStats.conversationCount + sampleClaudeCodeStats.conversationCount,
  messageCount: sampleClaudeAiStats.messageCount + sampleChatGptStats.messageCount + sampleClaudeCodeStats.messageCount,
  userMessageCount: sampleClaudeAiStats.userMessageCount + sampleChatGptStats.userMessageCount + sampleClaudeCodeStats.userMessageCount,
  assistantMessageCount: sampleClaudeAiStats.assistantMessageCount + sampleChatGptStats.assistantMessageCount + sampleClaudeCodeStats.assistantMessageCount,
  toolUseCount: sampleClaudeCodeStats.toolUseCount,
  monthlySeries: claudeAiMonthlySeries.map((d, i) => ({
    month: d.month,
    messages: d.messages + chatgptMonthlySeries[i].messages + claudeCodeMonthlySeries[i].messages * 2,
  })),
  dailySeries: buildDaily(claudeAiMonthlySeries.map((d, i) => ({
    month: d.month,
    messages: d.messages + chatgptMonthlySeries[i].messages + claudeCodeMonthlySeries[i].messages * 2,
  }))),
  hourHistogram: sampleClaudeAiStats.hourHistogram?.map(
    (v, i) => v + (sampleChatGptStats.hourHistogram?.[i] ?? 0) + (sampleClaudeCodeStats.hourHistogram?.[i] ?? 0),
  ),
  modelBreakdown: [
    ...(sampleChatGptStats.modelBreakdown ?? []),
    ...(sampleClaudeCodeStats.modelBreakdown ?? []),
  ].sort((a, b) => b.messages - a.messages),
  tokenUsage: sampleClaudeCodeStats.tokenUsage,
  streak: {
    longestDays: 34,
    longestStart: "2025-06-15",
    busiestDate: "2025-07-22",
    busiestCount: 66,
  },
  projectStats: sampleClaudeCodeStats.projectStats,
  wordStats: {
    userTopWords: [
      { word: "refactor", count: 430 },
      { word: "component", count: 352 },
      { word: "deploy", count: 293 },
      { word: "animation", count: 260 },
      { word: "database", count: 224 },
      { word: "layout", count: 197 },
      { word: "pipeline", count: 176 },
      { word: "schema", count: 152 },
      { word: "performance", count: 140 },
      { word: "migration", count: 127 },
      { word: "integration", count: 117 },
      { word: "parser", count: 111 },
    ],
    perModelTopWords: sampleClaudeCodeStats.wordStats!.perModelTopWords,
    totalUserWords: 120_800,
    totalAssistantWords: 412_800,
    distinctUserWords: 7_440,
    verbosityRatio: 3.4,
  },
  toolStats: sampleClaudeCodeStats.toolStats,
  extras: sampleClaudeCodeStats.extras,
  superlatives: {
    nightOwl: false,
    earlyBird: true,
    weekendWarrior: true,
    marathoner: true,
    tokenBurner: true,
    polyglot: true,
    toolMaster: true,
    wordsmith: true,
    projectHopper: true,
  },
  source: {
    fileCount: sampleClaudeAiStats.source.fileCount + sampleChatGptStats.source.fileCount + sampleClaudeCodeStats.source.fileCount,
    bytes: sampleClaudeAiStats.source.bytes + sampleChatGptStats.source.bytes + sampleClaudeCodeStats.source.bytes,
    parseWarnings: [],
  },
  isCoding: false,
};
