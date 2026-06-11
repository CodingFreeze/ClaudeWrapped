// ---------------------------------------------------------------------------
// Claude Code JSONL streaming parser → WrappedStats.
// Streams each .jsonl file (one per session) using File.stream() async generator.
// ---------------------------------------------------------------------------

import type { WrappedStats } from "../types";
import { buildMonthlySeries, buildDailySeries } from "../stats/normalize";
import { buildHourHistogram } from "../stats/histogram";
import { computeStreak } from "../stats/streaks";
import { computeSuperlatives } from "../stats/superlatives";
import { extractWords, accumulateWords, topWords } from "../stats/wordExtract";

// ---------------------------------------------------------------------------
// Streaming JSONL line parser (§6.5 pattern)
// ---------------------------------------------------------------------------

async function* streamJsonlFile(file: File): AsyncGenerator<unknown> {
  if (typeof file.stream !== "function") {
    // Polyfill path: read entire file
    const text = await file.text();
    const lines = text.split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line);
      } catch {
        // skip malformed line
      }
    }
    return;
  }

  const reader = (file.stream() as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line);
      } catch {
        // skip malformed line
      }
    }
  }

  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer);
    } catch {
      // skip final malformed fragment
    }
  }
}

// ---------------------------------------------------------------------------
// Per-session accumulator
// ---------------------------------------------------------------------------

interface SessionAccumulator {
  sessionId: string;
  firstTimestamp: string;
  lastTimestamp: string;
  cwd: string;
  gitBranch: string;
  userTurns: number;
  assistantTurns: number;
  toolUseCount: number;
  thinkingBlockCount: number;
  modelTokens: Map<string, { input: number; output: number; cacheRead: number; cacheCreate: number; messages: number }>;
  // Tool name counts
  toolCounts: Map<string, number>;
  parseErrors: number;
  lineCount: number;
  // Per-session message count (for longestSession detection)
  messageCount: number;
}

function newAccumulator(sessionId: string): SessionAccumulator {
  return {
    sessionId,
    firstTimestamp: "",
    lastTimestamp: "",
    cwd: "",
    gitBranch: "",
    userTurns: 0,
    assistantTurns: 0,
    toolUseCount: 0,
    thinkingBlockCount: 0,
    modelTokens: new Map(),
    toolCounts: new Map(),
    parseErrors: 0,
    lineCount: 0,
    messageCount: 0,
  };
}

const SKIP_TYPES = new Set(["attachment", "mode", "file-history-snapshot", "last-prompt"]);

// ---------------------------------------------------------------------------
// Parse a single session file
// ---------------------------------------------------------------------------

async function parseSessionFile(
  file: File,
  acc: SessionAccumulator,
  allTimestamps: string[],
  globalUserWords: Map<string, number>,
  globalModelWords: Map<string, Map<string, number>>,
  globalToolCounts: Map<string, number>,
): Promise<void> {
  for await (const raw of streamJsonlFile(file)) {
    const event = raw as Record<string, unknown>;
    acc.lineCount++;

    const type = typeof event.type === "string" ? event.type : null;
    if (!type) continue;
    if (SKIP_TYPES.has(type)) continue;

    // Skip sidechain events
    if (event.isSidechain === true) continue;

    const ts = typeof event.timestamp === "string" ? event.timestamp : null;
    if (ts) {
      allTimestamps.push(ts);
      if (!acc.firstTimestamp || ts < acc.firstTimestamp) acc.firstTimestamp = ts;
      if (!acc.lastTimestamp || ts > acc.lastTimestamp) acc.lastTimestamp = ts;
    }

    // Capture cwd / gitBranch from any event that has them
    if (typeof event.cwd === "string" && event.cwd && !acc.cwd) {
      acc.cwd = event.cwd;
    }
    if (typeof event.gitBranch === "string" && event.gitBranch && !acc.gitBranch) {
      acc.gitBranch = event.gitBranch;
    }

    if (type === "user") {
      // Skip isMeta user events (hook injections)
      if (event.isMeta === true) continue;
      acc.userTurns++;
      acc.messageCount++;

      // Extract user words from text content
      const message = event.message as Record<string, unknown> | undefined;
      if (message) {
        const content = message.content;
        if (typeof content === "string") {
          accumulateWords(globalUserWords, extractWords(content));
        } else if (Array.isArray(content)) {
          for (const block of content) {
            const b = block as Record<string, unknown>;
            if (b?.type === "text" && typeof b.text === "string") {
              accumulateWords(globalUserWords, extractWords(b.text));
            }
          }
        }
      }
    }

    if (type === "assistant") {
      acc.assistantTurns++;
      acc.messageCount++;

      const message = event.message as Record<string, unknown> | undefined;
      if (!message) continue;

      const model = typeof message.model === "string" ? message.model : "unknown";

      // Count tool_use blocks and thinking blocks in content; extract text words per model
      const content = Array.isArray(message.content) ? message.content : [];
      for (const block of content) {
        const b = block as Record<string, unknown>;
        if (b?.type === "tool_use") {
          acc.toolUseCount++;
          const toolName = typeof b.name === "string" ? b.name : "unknown";
          globalToolCounts.set(toolName, (globalToolCounts.get(toolName) ?? 0) + 1);
          acc.toolCounts.set(toolName, (acc.toolCounts.get(toolName) ?? 0) + 1);
        }
        if (b?.type === "thinking") {
          acc.thinkingBlockCount++;
        }
        if (b?.type === "text" && typeof b.text === "string") {
          // Per-model word accumulation (assistant text only)
          let modelBucket = globalModelWords.get(model);
          if (!modelBucket) {
            modelBucket = new Map<string, number>();
            globalModelWords.set(model, modelBucket);
          }
          accumulateWords(modelBucket, extractWords(b.text));
        }
      }

      // Accumulate token counts per model
      const usage = message.usage as Record<string, unknown> | undefined;
      if (usage) {
        const existing = acc.modelTokens.get(model) ?? {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheCreate: 0,
          messages: 0,
        };
        existing.input += typeof usage.input_tokens === "number" ? usage.input_tokens : 0;
        existing.output += typeof usage.output_tokens === "number" ? usage.output_tokens : 0;
        existing.cacheRead += typeof usage.cache_read_input_tokens === "number" ? usage.cache_read_input_tokens : 0;
        existing.cacheCreate += typeof usage.cache_creation_input_tokens === "number" ? usage.cache_creation_input_tokens : 0;
        existing.messages++;
        acc.modelTokens.set(model, existing);
      } else {
        // No usage — still track message count
        const existing = acc.modelTokens.get(model) ?? {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheCreate: 0,
          messages: 0,
        };
        existing.messages++;
        acc.modelTokens.set(model, existing);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Top-N helper
// ---------------------------------------------------------------------------

function topN<T extends { sessions: number }>(arr: T[], n = 10): T[] {
  return arr.slice().sort((a, b) => b.sessions - a.sessions).slice(0, n);
}

// ---------------------------------------------------------------------------
// Main export: parse Claude Code folder (multiple .jsonl files)
// ---------------------------------------------------------------------------

export async function parseClaudeCodeFiles(
  files: File[],
  onProgress?: (parsed: number, total: number) => void,
): Promise<WrappedStats> {
  const jsonlFiles = files.filter((f) => f.name.endsWith(".jsonl"));

  if (jsonlFiles.length === 0) {
    throw new Error(
      "No .jsonl files found. Make sure you dropped the ~/.claude/projects/ folder.",
    );
  }

  const parseWarnings: string[] = [];
  const totalBytes = jsonlFiles.reduce((s, f) => s + f.size, 0);

  let totalUserTurns = 0;
  let totalAssistantTurns = 0;
  let totalToolUseCount = 0;
  let totalThinkingBlockCount = 0;
  let totalParseErrors = 0;
  const allTimestamps: string[] = [];

  // Per-model aggregation across all sessions
  const globalModelTokens = new Map<string, {
    input: number; output: number; cacheRead: number; cacheCreate: number; messages: number;
  }>();

  // Word accumulation
  const globalUserWords = new Map<string, number>();
  const globalModelWords = new Map<string, Map<string, number>>();
  const globalToolCounts = new Map<string, number>();

  // Project stats accumulation: name → { sessions, messages, firstSeen, lastSeen, activeDays set }
  const projectStatsMap = new Map<string, {
    sessions: number;
    messages: number;
    firstSeen: string;
    lastSeen: string;
    activeDays: Set<string>;
  }>();

  // Coding stats
  const cwdCounts = new Map<string, number>();
  const branchCounts = new Map<string, number>();

  // Longest session tracking
  let longestSessionMessages = 0;
  let longestSessionDate = "";
  let firstSessionDate = "";

  for (let i = 0; i < jsonlFiles.length; i++) {
    const file = jsonlFiles[i];
    const acc = newAccumulator(file.name);

    await parseSessionFile(file, acc, allTimestamps, globalUserWords, globalModelWords, globalToolCounts);

    totalUserTurns += acc.userTurns;
    totalAssistantTurns += acc.assistantTurns;
    totalToolUseCount += acc.toolUseCount;
    totalThinkingBlockCount += acc.thinkingBlockCount;
    totalParseErrors += acc.parseErrors;

    // Track high parse error rate
    if (acc.lineCount > 10 && acc.parseErrors / acc.lineCount > 0.2) {
      parseWarnings.push(
        `High parse error rate in ${file.name} (${acc.parseErrors}/${acc.lineCount} lines). File may be corrupted.`,
      );
    }

    // Merge model tokens
    for (const [model, tok] of acc.modelTokens) {
      const existing = globalModelTokens.get(model) ?? {
        input: 0, output: 0, cacheRead: 0, cacheCreate: 0, messages: 0,
      };
      existing.input += tok.input;
      existing.output += tok.output;
      existing.cacheRead += tok.cacheRead;
      existing.cacheCreate += tok.cacheCreate;
      existing.messages += tok.messages;
      globalModelTokens.set(model, existing);
    }

    // Coding stats: project from parent directory, branch
    if (acc.cwd) {
      // Use the last two path segments for project name
      const parts = acc.cwd.replace(/\/$/, "").split("/").filter(Boolean);
      const projectName = parts.slice(-2).join("/") || acc.cwd;
      cwdCounts.set(projectName, (cwdCounts.get(projectName) ?? 0) + 1);

      // Project stats: accumulate per-project session/message counts
      const sessionDate = acc.firstTimestamp.slice(0, 10);
      const sessionMsgs = acc.userTurns + acc.assistantTurns;
      const existing = projectStatsMap.get(projectName);
      if (existing) {
        existing.sessions++;
        existing.messages += sessionMsgs;
        if (sessionDate && sessionDate < existing.firstSeen) existing.firstSeen = sessionDate;
        if (sessionDate && sessionDate > existing.lastSeen) existing.lastSeen = sessionDate;
        if (sessionDate) existing.activeDays.add(sessionDate);
      } else {
        projectStatsMap.set(projectName, {
          sessions: 1,
          messages: sessionMsgs,
          firstSeen: sessionDate,
          lastSeen: sessionDate,
          activeDays: new Set(sessionDate ? [sessionDate] : []),
        });
      }
    }
    if (acc.gitBranch) {
      branchCounts.set(acc.gitBranch, (branchCounts.get(acc.gitBranch) ?? 0) + 1);
    }

    // Longest session
    if (acc.messageCount > longestSessionMessages) {
      longestSessionMessages = acc.messageCount;
      longestSessionDate = acc.firstTimestamp.slice(0, 10);
    }
    // First session date
    if (acc.firstTimestamp) {
      if (!firstSessionDate || acc.firstTimestamp.slice(0, 10) < firstSessionDate) {
        firstSessionDate = acc.firstTimestamp.slice(0, 10);
      }
    }

    onProgress?.(i + 1, jsonlFiles.length);
  }

  // High global parse error rate warning
  if (totalParseErrors > 0 && jsonlFiles.length > 0) {
    parseWarnings.push(`Total parse errors across all files: ${totalParseErrors}.`);
  }

  const monthlySeries = buildMonthlySeries(allTimestamps);
  const dailySeries = buildDailySeries(allTimestamps);
  const hourHistogram = buildHourHistogram(allTimestamps);
  const streakResult = computeStreak(dailySeries);

  const sorted = allTimestamps.slice().sort();
  const rangeStart = sorted[0]?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const rangeEnd = sorted[sorted.length - 1]?.slice(0, 10) ?? rangeStart;

  // Model breakdown
  const modelBreakdown =
    globalModelTokens.size > 0
      ? [...globalModelTokens.entries()]
          .map(([model, tok]) => ({
            model,
            messages: tok.messages,
            tokens: tok.input + tok.output,
          }))
          .sort((a, b) => b.messages - a.messages)
      : undefined;

  // Token totals
  let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheCreate = 0;
  for (const tok of globalModelTokens.values()) {
    totalInput += tok.input;
    totalOutput += tok.output;
    totalCacheRead += tok.cacheRead;
    totalCacheCreate += tok.cacheCreate;
  }

  const tokenUsage =
    totalInput + totalOutput > 0
      ? {
          input: totalInput,
          output: totalOutput,
          cacheRead: totalCacheRead,
          cacheCreate: totalCacheCreate,
          estimated: false,
        }
      : undefined;

  // Coding stats
  const topProjects = topN(
    [...cwdCounts.entries()].map(([name, sessions]) => ({ name, sessions })),
  );
  const topBranches = topN(
    [...branchCounts.entries()].map(([name, sessions]) => ({ name, sessions })),
  );

  // First-class project stats (top 8 by messages)
  const projectStats = [...projectStatsMap.entries()]
    .map(([name, p]) => ({
      name,
      sessions: p.sessions,
      messages: p.messages,
      firstSeen: p.firstSeen,
      lastSeen: p.lastSeen,
      activeDays: p.activeDays.size,
    }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 8);

  // Word stats
  const userTopWords = topWords(globalUserWords, 12);
  const totalUserWords = [...globalUserWords.values()].reduce((s, v) => s + v, 0);

  // Per-model top words (top 8 each)
  const perModelTopWords = [...globalModelWords.entries()].map(([model, map]) => ({
    model,
    words: topWords(map, 8),
  }));

  // Assistant word count estimate: sum all per-model word maps
  let totalAssistantWords = 0;
  for (const wmap of globalModelWords.values()) {
    for (const count of wmap.values()) {
      totalAssistantWords += count;
    }
  }

  const distinctUserWords = globalUserWords.size;
  const verbosityRatio = totalUserWords > 0
    ? Math.round((totalAssistantWords / totalUserWords) * 10) / 10
    : 0;

  const wordStats: WrappedStats["wordStats"] =
    userTopWords.length > 0
      ? { userTopWords, perModelTopWords, totalUserWords, totalAssistantWords, distinctUserWords, verbosityRatio }
      : undefined;

  // Tool stats
  const topTools = [...globalToolCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const toolStats: WrappedStats["toolStats"] =
    topTools.length > 0
      ? { topTools, totalInvocations: totalToolUseCount }
      : undefined;

  // Extras: busiest weekday, activeDays, avg messages/day, longest session
  const WEEKDAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const weekdayTotals = new Array<number>(7).fill(0);
  const activeDaySet = new Set<string>();
  for (const d of dailySeries ?? []) {
    const day = new Date(d.date + "T00:00:00").getDay();
    weekdayTotals[day] = (weekdayTotals[day] ?? 0) + d.messages;
    activeDaySet.add(d.date);
  }
  const busiestWeekday = weekdayTotals.indexOf(Math.max(...weekdayTotals));
  const totalActiveDays = activeDaySet.size;
  const messageCount = totalUserTurns + totalAssistantTurns;
  const avgMessagesPerActiveDay = totalActiveDays > 0
    ? Math.round(messageCount / totalActiveDays)
    : 0;

  const extras: WrappedStats["extras"] =
    totalActiveDays > 0
      ? {
          busiestWeekday,
          busiestWeekdayName: WEEKDAY_NAMES[busiestWeekday] ?? "Unknown",
          totalActiveDays,
          avgMessagesPerActiveDay,
          longestSessionMessages,
          longestSessionDate,
          firstSessionDate,
          thinkingBlockCount: totalThinkingBlockCount,
        }
      : undefined;

  const stats: WrappedStats = {
    provider: "claude-code",
    range: { start: rangeStart, end: rangeEnd },
    sessionCount: jsonlFiles.length,
    conversationCount: jsonlFiles.length,
    messageCount,
    userMessageCount: totalUserTurns,
    assistantMessageCount: totalAssistantTurns,
    toolUseCount: totalToolUseCount > 0 ? totalToolUseCount : undefined,
    monthlySeries,
    dailySeries,
    hourHistogram,
    modelBreakdown,
    tokenUsage,
    streak: streakResult
      ? {
          longestDays: streakResult.longestDays,
          longestStart: streakResult.longestStart,
          busiestDate: streakResult.busiestDate,
          busiestCount: streakResult.busiestCount,
        }
      : undefined,
    codingStats: {
      topProjects,
      topBranches,
    },
    projectStats: projectStats.length > 0 ? projectStats : undefined,
    wordStats,
    toolStats,
    extras,
    source: { fileCount: jsonlFiles.length, bytes: totalBytes, parseWarnings },
    isCoding: true,
  };

  stats.superlatives = computeSuperlatives(stats);
  return stats;
}
