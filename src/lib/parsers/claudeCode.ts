// ---------------------------------------------------------------------------
// Claude Code JSONL streaming parser → WrappedStats.
// Streams each .jsonl file (one per session) using File.stream() async generator.
// ---------------------------------------------------------------------------

import type { WrappedStats } from "../types";
import { buildMonthlySeries, buildDailySeries } from "../stats/normalize";
import { buildHourHistogram } from "../stats/histogram";
import { computeStreak } from "../stats/streaks";
import { computeSuperlatives } from "../stats/superlatives";

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
  modelTokens: Map<string, { input: number; output: number; cacheRead: number; cacheCreate: number; messages: number }>;
  parseErrors: number;
  lineCount: number;
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
    modelTokens: new Map(),
    parseErrors: 0,
    lineCount: 0,
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
    }

    if (type === "assistant") {
      acc.assistantTurns++;

      const message = event.message as Record<string, unknown> | undefined;
      if (!message) continue;

      const model = typeof message.model === "string" ? message.model : "unknown";

      // Count tool_use blocks in content
      const content = Array.isArray(message.content) ? message.content : [];
      for (const block of content) {
        const b = block as Record<string, unknown>;
        if (b?.type === "tool_use") {
          acc.toolUseCount++;
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
  let totalParseErrors = 0;
  const allTimestamps: string[] = [];

  // Per-model aggregation across all sessions
  const globalModelTokens = new Map<string, {
    input: number; output: number; cacheRead: number; cacheCreate: number; messages: number;
  }>();

  // Coding stats
  const cwdCounts = new Map<string, number>();
  const branchCounts = new Map<string, number>();

  for (let i = 0; i < jsonlFiles.length; i++) {
    const file = jsonlFiles[i];
    const acc = newAccumulator(file.name);

    await parseSessionFile(file, acc, allTimestamps);

    totalUserTurns += acc.userTurns;
    totalAssistantTurns += acc.assistantTurns;
    totalToolUseCount += acc.toolUseCount;
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
    }
    if (acc.gitBranch) {
      branchCounts.set(acc.gitBranch, (branchCounts.get(acc.gitBranch) ?? 0) + 1);
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

  const messageCount = totalUserTurns + totalAssistantTurns;

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
    source: { fileCount: jsonlFiles.length, bytes: totalBytes, parseWarnings },
    isCoding: true,
  };

  stats.superlatives = computeSuperlatives(stats);
  return stats;
}
