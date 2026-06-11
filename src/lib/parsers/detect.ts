// ---------------------------------------------------------------------------
// Auto-detection cascade for dropped files/folders (§2.8).
// ---------------------------------------------------------------------------

import JSZip from "jszip";
import type { Provider } from "../types";

export type DetectResult =
  | { provider: Provider; confidence: "high" | "medium" }
  | { provider: null; reason: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read first N bytes of a File as text (fast, no full load). */
async function peekFile(file: File, bytes = 4096): Promise<string> {
  const slice = file.slice(0, bytes);
  return await slice.text();
}

/** Check if any file name matches a pattern. */
function anyMatch(files: File[], pattern: RegExp): boolean {
  return files.some((f) => pattern.test(f.name));
}

// ---------------------------------------------------------------------------
// JSONL folder detection
// ---------------------------------------------------------------------------

/**
 * Detect provider from a folder of .jsonl files.
 * Claude Code signal: model begins with "claude-"
 * Codex signal: filename matches rollout-*.jsonl
 */
export async function detectJsonlFolder(files: File[]): Promise<DetectResult> {
  const jsonlFiles = files.filter((f) => f.name.endsWith(".jsonl"));
  if (jsonlFiles.length === 0) {
    return { provider: null, reason: "No .jsonl files found in folder." };
  }

  // Check for Codex rollout pattern (filename signal is definitive)
  const hasRollout = anyMatch(jsonlFiles, /rollout-/);
  if (hasRollout) {
    return { provider: "codex", confidence: "high" };
  }

  // Peek into the first few files to look for Claude Code signals
  const sampleSize = Math.min(3, jsonlFiles.length);
  let claudeCodeSignals = 0;

  for (let i = 0; i < sampleSize; i++) {
    const preview = await peekFile(jsonlFiles[i]);
    // Claude Code signal: model field starting with "claude-"
    if (/"model"\s*:\s*"claude-/.test(preview)) {
      claudeCodeSignals++;
    }
  }

  if (claudeCodeSignals > 0) {
    return { provider: "claude-code", confidence: "high" };
  }

  // No clear signal — fall back to claude-code as default for .jsonl folders
  return { provider: "claude-code", confidence: "medium" };
}

// ---------------------------------------------------------------------------
// ZIP detection
// ---------------------------------------------------------------------------

export async function detectZip(file: File): Promise<DetectResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    return { provider: null, reason: "Could not open ZIP file." };
  }

  const fileNames = Object.keys(zip.files);

  // Check for conversations.json
  const convoEntry = Object.values(zip.files).find(
    (f) => !f.dir && /(^|\/)conversations\.json$/i.test(f.name),
  );

  if (convoEntry) {
    // Peek into conversations.json to distinguish Claude.ai vs ChatGPT
    const raw = await convoEntry.async("string");
    const peek = raw.slice(0, 2048);

    // Claude.ai: array with chat_messages[].sender
    if (/"chat_messages"/.test(peek) && /"sender"/.test(peek)) {
      return { provider: "claude-ai", confidence: "high" };
    }

    // ChatGPT: array with mapping + create_time
    if (/"mapping"/.test(peek) && /"create_time"/.test(peek)) {
      return { provider: "chatgpt", confidence: "high" };
    }

    // Ambiguous conversations.json
    return { provider: "chatgpt", confidence: "medium" };
  }

  // Check for Gemini Takeout: MyActivity.json
  const hasMyActivity = fileNames.some((n) => /MyActivity\.json$/i.test(n));
  if (hasMyActivity) {
    return { provider: "gemini", confidence: "high" };
  }

  // Check for Gemini Takeout path patterns
  const hasGeminiPath = fileNames.some((n) => /Gemini/i.test(n));
  if (hasGeminiPath) {
    return { provider: "gemini", confidence: "medium" };
  }

  // Any other JSON in ZIP → likely Grok
  const hasJson = fileNames.some((n) => n.endsWith(".json") && !n.endsWith("conversations.json"));
  if (hasJson) {
    return { provider: "grok", confidence: "medium" };
  }

  return { provider: null, reason: "ZIP contents do not match any known export format." };
}

// ---------------------------------------------------------------------------
// Single JSON file detection
// ---------------------------------------------------------------------------

export async function detectJsonFile(file: File): Promise<DetectResult> {
  const preview = await peekFile(file);

  // Claude.ai direct JSON: chat_messages[].sender
  if (/"chat_messages"/.test(preview) && /"sender"/.test(preview)) {
    return { provider: "claude-ai", confidence: "high" };
  }

  // ChatGPT direct JSON: mapping + create_time
  if (/"mapping"/.test(preview) && /"create_time"/.test(preview)) {
    return { provider: "chatgpt", confidence: "high" };
  }

  // Gemini Takeout JSON: time + title/description pattern
  if (/"time"/.test(preview) && (/"title"/.test(preview) || /"description"/.test(preview))) {
    return { provider: "gemini", confidence: "medium" };
  }

  return { provider: null, reason: "JSON file structure does not match any known export format." };
}

// ---------------------------------------------------------------------------
// Main auto-detect entry point
// ---------------------------------------------------------------------------

/**
 * Run the full detection cascade on a drop event.
 * - folder (multiple files) → detectJsonlFolder
 * - single .zip → detectZip
 * - single .json → detectJsonFile
 * - otherwise → null
 */
export async function autoDetect(files: File[]): Promise<DetectResult> {
  if (files.length === 0) {
    return { provider: null, reason: "No files provided." };
  }

  // Multiple files = folder drop
  if (files.length > 1) {
    return detectJsonlFolder(files);
  }

  const file = files[0];

  if (file.name.endsWith(".zip") || file.type === "application/zip") {
    return detectZip(file);
  }

  // Check .jsonl BEFORE .json MIME type — a .jsonl file may carry application/json MIME
  if (file.name.endsWith(".jsonl")) {
    return detectJsonlFolder([file]);
  }

  if (file.name.endsWith(".json") || file.type === "application/json") {
    return detectJsonFile(file);
  }

  return {
    provider: null,
    reason: `File type not recognized: "${file.name}". Upload a ZIP, JSON, or folder of JSONL files.`,
  };
}
