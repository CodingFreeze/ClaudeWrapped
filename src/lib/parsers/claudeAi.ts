// ---------------------------------------------------------------------------
// Claude.ai ZIP parser — emits WrappedStats.
// Refactored from claudeAiZip.ts; old function still re-exported for compat.
// ---------------------------------------------------------------------------

import JSZip from "jszip";
import type { WrappedStats } from "../types";
import { buildMonthlySeries, buildDailySeries } from "../stats/normalize";
import { buildHourHistogram } from "../stats/histogram";
import { computeStreak } from "../stats/streaks";
import { computeSuperlatives } from "../stats/superlatives";
import { extractWords, accumulateWords, topWords } from "../stats/wordExtract";

// Keep legacy import-compat
export { parseClaudeAiZip } from "../claudeAiZip";

const CONVERSATIONS_ENTRY = /(^|\/)conversations\.json$/i;

interface ClaudeAiMessage {
  sender?: string;
  text?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface ClaudeAiConversation {
  uuid?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  chat_messages?: ClaudeAiMessage[];
  [key: string]: unknown;
}

/**
 * Parse a Claude.ai export ZIP and return a normalized WrappedStats object.
 */
export async function parseClaudeAiZipToStats(file: File): Promise<WrappedStats> {
  const parseWarnings: string[] = [];
  const zip = await JSZip.loadAsync(file);

  const entry = Object.values(zip.files).find(
    (f) => !f.dir && CONVERSATIONS_ENTRY.test(f.name),
  );
  if (!entry) {
    throw new Error(
      "No conversations.json found in the ZIP. Make sure this is a Claude.ai data export.",
    );
  }

  const raw = await entry.async("string");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("conversations.json is not valid JSON.");
  }

  if (!Array.isArray(data)) {
    throw new Error("Expected conversations.json to be an array.");
  }

  const conversations = data as ClaudeAiConversation[];
  const allTimestamps: string[] = [];
  let messageCount = 0;
  let userMessageCount = 0;
  let assistantMessageCount = 0;
  const userWordMap = new Map<string, number>();

  for (const convo of conversations) {
    const messages: ClaudeAiMessage[] = Array.isArray(convo?.chat_messages)
      ? convo.chat_messages
      : [];

    if (!Array.isArray(convo?.chat_messages) && parseWarnings.length < 10) {
      parseWarnings.push(
        `Conversation "${convo?.name ?? convo?.uuid ?? "(unknown)"}" has no chat_messages.`,
      );
    }

    for (const msg of messages) {
      messageCount++;
      const sender = typeof msg?.sender === "string" ? msg.sender : "(unknown)";
      if (sender === "human") {
        userMessageCount++;
        // Extract words from text field (already walked path, no second pass)
        if (typeof msg.text === "string") {
          accumulateWords(userWordMap, extractWords(msg.text));
        }
      } else if (sender === "assistant") {
        assistantMessageCount++;
      }

      const ts = typeof msg?.created_at === "string" ? msg.created_at : undefined;
      if (ts) allTimestamps.push(ts);
    }
  }

  if (parseWarnings.length === 10) {
    parseWarnings.push("…additional warnings truncated.");
  }

  const monthlySeries = buildMonthlySeries(allTimestamps);
  const dailySeries = buildDailySeries(allTimestamps);
  const hourHistogram = buildHourHistogram(allTimestamps);
  const streakResult = computeStreak(dailySeries);

  const sorted = allTimestamps.slice().sort();
  const rangeStart = sorted[0] ?? new Date().toISOString().slice(0, 10);
  const rangeEnd = sorted[sorted.length - 1] ?? new Date().toISOString().slice(0, 10);

  // Build wordStats from accumulated user words
  const userTopWords = topWords(userWordMap, 12);
  const totalUserWords = [...userWordMap.values()].reduce((s, v) => s + v, 0);
  const wordStats: WrappedStats["wordStats"] =
    userTopWords.length > 0
      ? {
          userTopWords,
          perModelTopWords: [],
          totalUserWords,
          totalAssistantWords: 0,
          distinctUserWords: userWordMap.size,
          verbosityRatio: 0,
        }
      : undefined;

  const stats: WrappedStats = {
    provider: "claude-ai",
    range: {
      start: rangeStart.slice(0, 10),
      end: rangeEnd.slice(0, 10),
    },
    sessionCount: conversations.length,
    conversationCount: conversations.length,
    messageCount,
    userMessageCount,
    assistantMessageCount,
    monthlySeries,
    dailySeries,
    hourHistogram,
    streak: streakResult
      ? {
          longestDays: streakResult.longestDays,
          longestStart: streakResult.longestStart,
          busiestDate: streakResult.busiestDate,
          busiestCount: streakResult.busiestCount,
        }
      : undefined,
    wordStats,
    source: { fileCount: 1, bytes: file.size, parseWarnings },
    isCoding: false,
  };

  stats.superlatives = computeSuperlatives(stats);
  return stats;
}
