// ---------------------------------------------------------------------------
// Gemini (Google Takeout) JSON parser → WrappedStats.
// Rejects HTML exports with a clear corrective error message.
// ---------------------------------------------------------------------------

import JSZip from "jszip";
import type { WrappedStats } from "../types";
import { buildMonthlySeries, buildDailySeries } from "../stats/normalize";
import { buildHourHistogram } from "../stats/histogram";
import { computeStreak } from "../stats/streaks";
import { computeSuperlatives } from "../stats/superlatives";

const HTML_REJECTION_MSG =
  "This file appears to be an HTML export from Google Takeout. " +
  "Please go back to Google Takeout, select Gemini Apps activity, " +
  "and change the format from HTML to JSON before exporting. " +
  "Then upload the JSON file or Takeout ZIP here.";

// ---------------------------------------------------------------------------
// HTML detection
// ---------------------------------------------------------------------------

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("<") || trimmed.toLowerCase().startsWith("<!doctype");
}

// ---------------------------------------------------------------------------
// Parse Gemini Takeout JSON
// ---------------------------------------------------------------------------

interface GeminiActivityItem {
  time?: string;
  title?: string;
  description?: string;
  subtitles?: { name?: string }[];
  [key: string]: unknown;
}

function parseGeminiData(data: unknown, fileSize: number): WrappedStats {
  const parseWarnings: string[] = [];
  const timestamps: string[] = [];
  let itemCount = 0;

  // Google Takeout can be an array or an object with a nested array
  let items: GeminiActivityItem[] = [];

  if (Array.isArray(data)) {
    items = data as GeminiActivityItem[];
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Try common Takeout nesting patterns
    const nested = obj["My Activity"] ?? obj.activity ?? obj.items ?? obj.data;
    if (Array.isArray(nested)) {
      items = nested as GeminiActivityItem[];
    } else {
      // Walk one level deeper
      const firstVal = Object.values(obj)[0];
      if (Array.isArray(firstVal)) {
        items = firstVal as GeminiActivityItem[];
      } else {
        parseWarnings.push(
          "Unrecognized Gemini Takeout structure. Expected an array of activity items. " +
            "Stats may be incomplete.",
        );
      }
    }
  } else {
    throw new Error("Gemini export JSON is not in a recognized format.");
  }

  for (const item of items) {
    itemCount++;
    const ts = typeof item?.time === "string" ? item.time : null;
    if (ts) timestamps.push(ts);
  }

  if (itemCount === 0) {
    parseWarnings.push("No activity items found in the Gemini export.");
  }

  const monthlySeries = buildMonthlySeries(timestamps);
  const dailySeries = buildDailySeries(timestamps);
  const hourHistogram = buildHourHistogram(timestamps);
  const streakResult = computeStreak(dailySeries);

  const sorted = timestamps.slice().sort();
  const rangeStart = sorted[0]?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const rangeEnd = sorted[sorted.length - 1]?.slice(0, 10) ?? rangeStart;

  const stats: WrappedStats = {
    provider: "gemini",
    range: { start: rangeStart, end: rangeEnd },
    sessionCount: itemCount,
    conversationCount: itemCount,
    // Each activity item in Takeout is a user prompt only (no assistant turns
    // are exported). Do not fabricate a 50/50 split.
    messageCount: itemCount,
    userMessageCount: itemCount,
    assistantMessageCount: 0,
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

export async function parseGeminiExport(file: File): Promise<WrappedStats> {
  // ZIP path (Takeout archive)
  if (file.name.endsWith(".zip") || file.type === "application/zip") {
    const zip = await JSZip.loadAsync(file);

    // Look for MyActivity.json or any JSON file in the Gemini Takeout path
    const entries = Object.values(zip.files).filter((f) => !f.dir);
    const geminiEntry =
      entries.find((f) => /MyActivity\.json$/i.test(f.name)) ??
      entries.find((f) => /Gemini/i.test(f.name) && f.name.endsWith(".json")) ??
      entries.find((f) => f.name.endsWith(".json"));

    if (!geminiEntry) {
      throw new Error(
        "No JSON file found in the Takeout ZIP. " +
          "Make sure you exported Gemini Apps activity as JSON, not HTML.",
      );
    }

    const raw = await geminiEntry.async("string");

    if (looksLikeHtml(raw)) {
      throw new Error(HTML_REJECTION_MSG);
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("The Gemini export file is not valid JSON.");
    }

    return parseGeminiData(data, file.size);
  }

  // Raw JSON / file path
  const raw = await file.text();

  if (looksLikeHtml(raw)) {
    throw new Error(HTML_REJECTION_MSG);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("The Gemini export file is not valid JSON.");
  }

  return parseGeminiData(data, file.size);
}
