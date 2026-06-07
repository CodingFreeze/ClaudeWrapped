import JSZip from "jszip";
import type {
  ClaudeAiConversation,
  ClaudeAiMessage,
  ClaudeAiParseResult,
} from "./types";

// Parses a Claude.ai export ZIP entirely in-browser. We look for a
// conversations.json anywhere in the archive (the export sometimes nests it),
// then tally conversations, messages, senders, and the time span.

const CONVERSATIONS_ENTRY = /(^|\/)conversations\.json$/i;

export async function parseClaudeAiZip(file: File): Promise<ClaudeAiParseResult> {
  const warnings: string[] = [];
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
    throw new Error("Expected conversations.json to be an array of conversations.");
  }

  const conversations = data as ClaudeAiConversation[];

  let messageCount = 0;
  const senderCounts: Record<string, number> = {};
  let earliest: string | undefined;
  let latest: string | undefined;

  for (const convo of conversations) {
    const messages: ClaudeAiMessage[] = Array.isArray(convo?.chat_messages)
      ? convo.chat_messages
      : [];

    if (!Array.isArray(convo?.chat_messages)) {
      warnings.push(
        `Conversation "${convo?.name ?? convo?.uuid ?? "(unknown)"}" has no chat_messages array.`,
      );
    }

    for (const msg of messages) {
      messageCount++;
      const sender = typeof msg?.sender === "string" ? msg.sender : "(unknown)";
      senderCounts[sender] = (senderCounts[sender] ?? 0) + 1;

      const ts = typeof msg?.created_at === "string" ? msg.created_at : undefined;
      if (ts) {
        if (!earliest || ts < earliest) earliest = ts;
        if (!latest || ts > latest) latest = ts;
      }
    }
  }

  // Keep the warning list short so the UI stays readable.
  const trimmedWarnings =
    warnings.length > 10
      ? [...warnings.slice(0, 10), `…and ${warnings.length - 10} more.`]
      : warnings;

  return {
    source: "claude.ai",
    fileName: file.name,
    conversationCount: conversations.length,
    messageCount,
    senderCounts,
    earliest,
    latest,
    warnings: trimmedWarnings,
  };
}
