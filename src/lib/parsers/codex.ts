// ---------------------------------------------------------------------------
// Codex CLI JSONL streaming parser → WrappedStats.
// Handles rollout-<timestamp>-<uuid>.jsonl session files.
// ---------------------------------------------------------------------------

import type { WrappedStats } from "../types";
import { buildMonthlySeries, buildDailySeries } from "../stats/normalize";
import { buildHourHistogram } from "../stats/histogram";
import { computeStreak } from "../stats/streaks";
import { computeSuperlatives } from "../stats/superlatives";
import { extractWords, accumulateWords, topWords } from "../stats/wordExtract";

// ---------------------------------------------------------------------------
// JSONL streaming (same §6.5 pattern as claudeCode.ts)
// ---------------------------------------------------------------------------

async function* streamJsonlFile(file: File): AsyncGenerator<unknown> {
  if (typeof file.stream !== "function") {
    const text = await file.text();
    const lines = text.split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line);
      } catch {
        // skip
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
        // skip
      }
    }
  }

  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer);
    } catch {
      // skip
    }
  }
}

// ---------------------------------------------------------------------------
// Parse a single Codex session file
// ---------------------------------------------------------------------------

interface CodexSessionResult {
  sessionId: string;
  firstTimestamp: string;
  lastTimestamp: string;
  cwd: string;
  gitBranch: string;
  userMessages: number;
  agentMessages: number;
  taskCount: number;
  models: string[];
  totalDurationMs: number;
  timestamps: string[];
  userWordPayloads: string[];
}

async function parseCodexSessionFile(file: File): Promise<CodexSessionResult> {
  const result: CodexSessionResult = {
    sessionId: file.name,
    firstTimestamp: "",
    lastTimestamp: "",
    cwd: "",
    gitBranch: "",
    userMessages: 0,
    agentMessages: 0,
    taskCount: 0,
    models: [],
    totalDurationMs: 0,
    timestamps: [],
    userWordPayloads: [],
  };

  const modelSet = new Set<string>();

  for await (const raw of streamJsonlFile(file)) {
    const event = raw as Record<string, unknown>;
    const type = typeof event.type === "string" ? event.type : null;
    if (!type) continue;

    // Track envelope timestamps
    const ts = typeof event.timestamp === "string" ? event.timestamp : null;
    if (ts) {
      result.timestamps.push(ts);
      if (!result.firstTimestamp || ts < result.firstTimestamp) result.firstTimestamp = ts;
      if (!result.lastTimestamp || ts > result.lastTimestamp) result.lastTimestamp = ts;
    }

    const payload = event.payload as Record<string, unknown> | undefined;

    if (type === "session_meta" && payload) {
      if (typeof payload.id === "string") result.sessionId = payload.id;
      if (typeof payload.cwd === "string") result.cwd = payload.cwd;
      // git branch from nested git object
      const git = payload.git as Record<string, unknown> | undefined;
      if (git && typeof git.branch === "string") result.gitBranch = git.branch;
      // session start timestamp
      const startTs = typeof payload.timestamp === "string" ? payload.timestamp : null;
      if (startTs && !result.firstTimestamp) result.firstTimestamp = startTs;
    }

    if (type === "turn_context" && payload) {
      if (typeof payload.cwd === "string" && !result.cwd) result.cwd = payload.cwd;
      if (typeof payload.model === "string") modelSet.add(payload.model);
    }

    if (type === "event_msg" && payload) {
      const subtype = typeof payload.type === "string" ? payload.type : null;

      if (subtype === "user_message") {
        result.userMessages++;
        // Extract user words from payload text
        if (typeof payload.text === "string") {
          result.userWordPayloads.push(payload.text);
        }
      }
      if (subtype === "agent_message") {
        result.agentMessages++;
      }
      if (subtype === "task_started") {
        result.taskCount++;
      }
      if (subtype === "task_complete") {
        const dur = typeof payload.duration_ms === "number" ? payload.duration_ms : 0;
        result.totalDurationMs += dur;
      }
    }
  }

  result.models = [...modelSet];
  return result;
}

// ---------------------------------------------------------------------------
// Main export: parse Codex sessions folder (multiple .jsonl files)
// ---------------------------------------------------------------------------

/** Detects if a file looks like a Codex rollout session file. */
export function isCodexFile(file: File): boolean {
  return file.name.endsWith(".jsonl") && /rollout-/.test(file.name);
}

export async function parseCodexFiles(
  files: File[],
  onProgress?: (parsed: number, total: number) => void,
): Promise<WrappedStats> {
  // Accept files matching rollout-*.jsonl pattern OR any .jsonl (fallback)
  const rolloutFiles = files.filter((f) => isCodexFile(f));
  const jsonlFiles = rolloutFiles.length > 0 ? rolloutFiles : files.filter((f) => f.name.endsWith(".jsonl"));

  if (jsonlFiles.length === 0) {
    throw new Error(
      "No rollout-*.jsonl files found. Make sure you dropped the ~/.codex/sessions/ folder.",
    );
  }

  const parseWarnings: string[] = [];
  const totalBytes = jsonlFiles.reduce((s, f) => s + f.size, 0);

  let totalUserMessages = 0;
  let totalAgentMessages = 0;
  let totalTaskCount = 0;
  let totalDurationMs = 0;
  const allTimestamps: string[] = [];
  const modelCounts = new Map<string, number>();
  const cwdCounts = new Map<string, number>();
  const branchCounts = new Map<string, number>();

  // Word accumulation
  const globalUserWords = new Map<string, number>();

  // Project stats
  const projectStatsMap = new Map<string, {
    sessions: number;
    messages: number;
    firstSeen: string;
    lastSeen: string;
    activeDays: Set<string>;
  }>();

  for (let i = 0; i < jsonlFiles.length; i++) {
    const file = jsonlFiles[i];
    try {
      const session = await parseCodexSessionFile(file);

      totalUserMessages += session.userMessages;
      totalAgentMessages += session.agentMessages;
      totalTaskCount += session.taskCount;
      totalDurationMs += session.totalDurationMs;
      allTimestamps.push(...session.timestamps);

      // Accumulate user words
      for (const text of session.userWordPayloads) {
        accumulateWords(globalUserWords, extractWords(text));
      }

      for (const model of session.models) {
        modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
      }

      if (session.cwd) {
        const parts = session.cwd.replace(/\/$/, "").split("/").filter(Boolean);
        const projectName = parts.slice(-2).join("/") || session.cwd;
        cwdCounts.set(projectName, (cwdCounts.get(projectName) ?? 0) + 1);

        // Project stats
        const sessionDate = session.firstTimestamp.slice(0, 10);
        const sessionMsgs = session.userMessages + session.agentMessages;
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
      if (session.gitBranch) {
        branchCounts.set(session.gitBranch, (branchCounts.get(session.gitBranch) ?? 0) + 1);
      }
    } catch {
      parseWarnings.push(`Failed to parse session file: ${file.name}`);
    }

    onProgress?.(i + 1, jsonlFiles.length);
  }

  const monthlySeries = buildMonthlySeries(allTimestamps);
  const dailySeries = buildDailySeries(allTimestamps);
  const hourHistogram = buildHourHistogram(allTimestamps);
  const streakResult = computeStreak(dailySeries);

  const sorted = allTimestamps.slice().sort();
  const rangeStart = sorted[0]?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const rangeEnd = sorted[sorted.length - 1]?.slice(0, 10) ?? rangeStart;

  // Model breakdown (message counts per model, tokens unavailable for Codex)
  const modelBreakdown =
    modelCounts.size >= 2
      ? [...modelCounts.entries()]
          .map(([model, messages]) => ({ model, messages }))
          .sort((a, b) => b.messages - a.messages)
      : undefined;

  // Coding stats
  const topProjects = [...cwdCounts.entries()]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  const topBranches = [...branchCounts.entries()]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  const avgSessionDurationMs =
    jsonlFiles.length > 0 && totalDurationMs > 0
      ? Math.round(totalDurationMs / jsonlFiles.length)
      : undefined;

  if (parseWarnings.length === 0 && totalUserMessages === 0 && totalAgentMessages === 0) {
    parseWarnings.push(
      "Token detail is unavailable in Codex exports — counts are shown without token totals.",
    );
  }

  const messageCount = totalUserMessages + totalAgentMessages;

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

  // Word stats (user only for Codex — no per-model assistant text)
  const userTopWords = topWords(globalUserWords, 12);
  const totalUserWords = [...globalUserWords.values()].reduce((s, v) => s + v, 0);
  const distinctUserWords = globalUserWords.size;

  const wordStats: WrappedStats["wordStats"] =
    userTopWords.length > 0
      ? {
          userTopWords,
          perModelTopWords: [],
          totalUserWords,
          totalAssistantWords: 0,
          distinctUserWords,
          verbosityRatio: 0,
        }
      : undefined;

  // Extras for Codex
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
  const avgMessagesPerActiveDay = totalActiveDays > 0
    ? Math.round(messageCount / totalActiveDays)
    : 0;

  const sortedForFirst = allTimestamps.slice().sort();
  const firstSessionDate = sortedForFirst[0]?.slice(0, 10) ?? "";

  const extras: WrappedStats["extras"] =
    totalActiveDays > 0
      ? {
          busiestWeekday,
          busiestWeekdayName: WEEKDAY_NAMES[busiestWeekday] ?? "Unknown",
          totalActiveDays,
          avgMessagesPerActiveDay,
          longestSessionMessages: 0,
          longestSessionDate: "",
          firstSessionDate,
          thinkingBlockCount: 0,
        }
      : undefined;

  const stats: WrappedStats = {
    provider: "codex",
    range: { start: rangeStart, end: rangeEnd },
    sessionCount: jsonlFiles.length,
    conversationCount: totalTaskCount || jsonlFiles.length,
    messageCount,
    userMessageCount: totalUserMessages,
    assistantMessageCount: totalAgentMessages,
    monthlySeries,
    dailySeries,
    hourHistogram,
    modelBreakdown,
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
      avgSessionDurationMs,
    },
    projectStats: projectStats.length > 0 ? projectStats : undefined,
    wordStats,
    extras,
    source: { fileCount: jsonlFiles.length, bytes: totalBytes, parseWarnings },
    isCoding: true,
  };

  stats.superlatives = computeSuperlatives(stats);
  return stats;
}
