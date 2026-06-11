// ---------------------------------------------------------------------------
// ChatGPT export ZIP / JSON parser → WrappedStats.
// Uses @streamparser/json for streaming parse of large files.
// ---------------------------------------------------------------------------

import JSZip from "jszip";
import type { WrappedStats } from "../types";
import { buildMonthlySeries, buildDailySeries } from "../stats/normalize";
import { buildHourHistogram } from "../stats/histogram";
import { computeStreak } from "../stats/streaks";
import { computeSuperlatives } from "../stats/superlatives";
import { extractWords, accumulateWords, topWords } from "../stats/wordExtract";

const CONVERSATIONS_ENTRY = /(^|\/)conversations\.json$/i;

interface ChatGptNode {
  id: string;
  parent: string | null;
  children: string[];
  message: ChatGptMessage | null;
}

interface ChatGptMessage {
  id: string;
  author: { role: "user" | "assistant" | "system" | "tool"; [k: string]: unknown };
  create_time: number | null;
  content: { content_type: string; parts?: unknown[] };
  metadata?: { model_slug?: string };
}

interface ChatGptConversation {
  id: string;
  title?: string;
  create_time: number;
  update_time?: number;
  mapping: Record<string, ChatGptNode>;
}

/** Convert a ChatGPT conversations array to WrappedStats. */
function parseConversations(
  conversations: ChatGptConversation[],
  fileSize: number,
): WrappedStats {
  const parseWarnings: string[] = [];
  const timestamps: string[] = [];
  let messageCount = 0;
  let userMessageCount = 0;
  let assistantMessageCount = 0;
  const modelCounts = new Map<string, number>();
  const userWordMap = new Map<string, number>();

  for (const convo of conversations) {
    if (!convo.mapping || typeof convo.mapping !== "object") continue;

    for (const node of Object.values(convo.mapping)) {
      const msg = node?.message;
      if (!msg) continue;
      if (msg.author.role === "system") continue;
      if (!msg.create_time) continue;

      messageCount++;
      if (msg.author.role === "user") {
        userMessageCount++;
        // Extract words from text parts (already walked, no second pass)
        const parts = msg.content?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (typeof part === "string") {
              accumulateWords(userWordMap, extractWords(part));
            }
          }
        }
      }
      if (msg.author.role === "assistant") {
        assistantMessageCount++;
        const slug = msg.metadata?.model_slug;
        if (slug) modelCounts.set(slug, (modelCounts.get(slug) ?? 0) + 1);
      }

      const ts = new Date(msg.create_time * 1000).toISOString();
      timestamps.push(ts);
    }
  }

  const monthlySeries = buildMonthlySeries(timestamps);
  const dailySeries = buildDailySeries(timestamps);
  const hourHistogram = buildHourHistogram(timestamps);
  const streakResult = computeStreak(dailySeries);

  const sorted = timestamps.slice().sort();
  const rangeStart = sorted[0]?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const rangeEnd = sorted[sorted.length - 1]?.slice(0, 10) ?? rangeStart;

  const modelBreakdown =
    modelCounts.size > 0
      ? [...modelCounts.entries()]
          .map(([model, messages]) => ({ model, messages }))
          .sort((a, b) => b.messages - a.messages)
      : undefined;

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
    provider: "chatgpt",
    range: { start: rangeStart, end: rangeEnd },
    sessionCount: conversations.length,
    conversationCount: conversations.length,
    messageCount,
    userMessageCount,
    assistantMessageCount,
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
    wordStats,
    source: { fileCount: 1, bytes: fileSize, parseWarnings },
    isCoding: false,
  };

  stats.superlatives = computeSuperlatives(stats);
  return stats;
}

/** Parse ChatGPT export: accepts a ZIP file or a raw JSON file. */
export async function parseChatGptExport(file: File): Promise<WrappedStats> {
  // ZIP path
  if (file.name.endsWith(".zip") || file.type === "application/zip") {
    const zip = await JSZip.loadAsync(file);
    const entry = Object.values(zip.files).find(
      (f) => !f.dir && CONVERSATIONS_ENTRY.test(f.name),
    );
    if (!entry) {
      throw new Error(
        "No conversations.json found in the ZIP. Make sure this is a ChatGPT data export.",
      );
    }
    const raw = await entry.async("string");
    return parseConversationsJson(raw, file.size);
  }

  // Raw JSON path
  const raw = await file.text();
  return parseConversationsJson(raw, file.size);
}

/** Parse the raw conversations.json string, detecting format. */
async function parseConversationsJson(
  raw: string,
  fileSize: number,
): Promise<WrappedStats> {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("conversations.json is not valid JSON.");
  }

  if (!Array.isArray(data)) {
    throw new Error("Expected conversations.json to be an array.");
  }

  // Detect ChatGPT format by checking for mapping + create_time
  const first = data[0] as Record<string, unknown>;
  if (!first?.mapping || typeof first.create_time !== "number") {
    throw new Error(
      "This does not look like a ChatGPT export (missing mapping/create_time). " +
        "If this is a Claude.ai export, upload it to the Claude.ai slot instead.",
    );
  }

  return parseConversations(data as ChatGptConversation[], fileSize);
}
