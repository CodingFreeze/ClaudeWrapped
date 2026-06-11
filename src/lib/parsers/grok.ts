// ---------------------------------------------------------------------------
// Grok (xAI) ZIP/JSON parser → WrappedStats. Best-effort; schema varies.
// Shows schema-mismatch warning when the structure does not match expectations.
// ---------------------------------------------------------------------------

import JSZip from "jszip";
import type { WrappedStats } from "../types";
import { buildMonthlySeries, buildDailySeries } from "../stats/normalize";
import { buildHourHistogram } from "../stats/histogram";
import { computeStreak } from "../stats/streaks";
import { computeSuperlatives } from "../stats/superlatives";

// ---------------------------------------------------------------------------
// Expected Grok shape (best-effort)
// ---------------------------------------------------------------------------

interface GrokMessage {
  role?: string;
  content?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface GrokConversation {
  id?: string;
  created_at?: string;
  messages?: GrokMessage[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Parse conversation array into WrappedStats
// ---------------------------------------------------------------------------

function parseGrokConversations(
  data: unknown,
  fileSize: number,
): WrappedStats {
  const parseWarnings: string[] = [];

  if (!Array.isArray(data)) {
    parseWarnings.push("Schema mismatch: expected an array of conversations. Falling back to best-effort extraction.");
    // Try to handle object with a conversations key
    const obj = data as Record<string, unknown>;
    const inner = obj?.conversations ?? obj?.chats ?? obj?.data;
    if (!Array.isArray(inner)) {
      throw new Error(
        "Unrecognized Grok export format. The file structure does not match any known Grok schema.",
      );
    }
    return parseGrokConversations(inner, fileSize);
  }

  const conversations = data as GrokConversation[];
  const timestamps: string[] = [];
  let userMessages = 0;
  let assistantMessages = 0;
  let schemaMatchCount = 0;
  let schemaMismatchCount = 0;

  for (const convo of conversations) {
    const msgs = Array.isArray(convo?.messages) ? convo.messages : [];

    if (msgs.length > 0) schemaMatchCount++;
    else schemaMismatchCount++;

    // Track conversation-level timestamp as a fallback
    const convoTs = typeof convo?.created_at === "string" ? convo.created_at : null;

    for (const msg of msgs) {
      const role = typeof msg?.role === "string" ? msg.role.toLowerCase() : "";
      const ts = typeof msg?.created_at === "string" ? msg.created_at : convoTs;

      if (role === "user") userMessages++;
      else if (role === "assistant") assistantMessages++;

      if (ts) timestamps.push(ts);
    }

    // Fallback: if no messages array, try to use convo-level timestamps only
    if (msgs.length === 0 && convoTs) {
      timestamps.push(convoTs);
    }
  }

  if (schemaMismatchCount > 0 && schemaMatchCount === 0) {
    parseWarnings.push(
      `Schema mismatch: none of the ${conversations.length} entries had a "messages" array. ` +
        "Counts may be inaccurate. This export format may differ from the expected Grok schema.",
    );
  } else if (schemaMismatchCount > schemaMatchCount) {
    parseWarnings.push(
      `Partial schema mismatch: ${schemaMismatchCount} of ${conversations.length} entries were missing "messages". ` +
        "Stats are based on the available data only.",
    );
  }

  const monthlySeries = buildMonthlySeries(timestamps);
  const dailySeries = buildDailySeries(timestamps);
  const hourHistogram = buildHourHistogram(timestamps);
  const streakResult = computeStreak(dailySeries);

  const sorted = timestamps.slice().sort();
  const rangeStart = sorted[0]?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const rangeEnd = sorted[sorted.length - 1]?.slice(0, 10) ?? rangeStart;

  const messageCount = userMessages + assistantMessages;

  const stats: WrappedStats = {
    provider: "grok",
    range: { start: rangeStart, end: rangeEnd },
    sessionCount: conversations.length,
    conversationCount: conversations.length,
    messageCount,
    userMessageCount: userMessages,
    assistantMessageCount: assistantMessages,
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
    source: { fileCount: 1, bytes: fileSize, parseWarnings },
    isCoding: false,
  };

  stats.superlatives = computeSuperlatives(stats);
  return stats;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function parseGrokExport(file: File): Promise<WrappedStats> {
  // ZIP path
  if (file.name.endsWith(".zip") || file.type === "application/zip") {
    const zip = await JSZip.loadAsync(file);

    // Find the first JSON file in the ZIP that isn't conversations.json (Claude/ChatGPT)
    const jsonEntries = Object.values(zip.files).filter(
      (f) => !f.dir && f.name.endsWith(".json"),
    );

    if (jsonEntries.length === 0) {
      throw new Error("No JSON files found in the Grok export ZIP.");
    }

    // Try each JSON file until one parses successfully
    const errors: string[] = [];
    for (const entry of jsonEntries) {
      const raw = await entry.async("string");
      try {
        const data = JSON.parse(raw);
        return parseGrokConversations(data, file.size);
      } catch (e) {
        errors.push(`${entry.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    throw new Error(
      `Could not parse any JSON file from the Grok ZIP.\n${errors.join("\n")}`,
    );
  }

  // Raw JSON path
  const raw = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("The Grok export file is not valid JSON.");
  }

  return parseGrokConversations(data, file.size);
}
