// ---------------------------------------------------------------------------
// Shared types for the two data sources.
//
// NOTE: The Claude.ai export shape below is based on the documented structure
// the user provided (array of conversations, each with chat_messages[] having
// sender / text / created_at). The Claude Code .jsonl shape is intentionally
// NOT modeled yet — we discover it first (see jsonlSchema.ts) and only commit
// a typed schema once the user confirms the real fields. See HANDOFF.md.
// ---------------------------------------------------------------------------

// ----- Source 1: Claude.ai export ZIP (conversations.json) -----

export interface ClaudeAiMessage {
  sender?: string;
  text?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface ClaudeAiConversation {
  uuid?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  chat_messages?: ClaudeAiMessage[];
  [key: string]: unknown;
}

export interface ClaudeAiParseResult {
  source: "claude.ai";
  fileName: string;
  conversationCount: number;
  messageCount: number;
  senderCounts: Record<string, number>;
  earliest?: string;
  latest?: string;
  /** Non-fatal problems encountered while parsing. */
  warnings: string[];
}

// ----- Source 2: Claude Code .jsonl logs (schema discovery) -----

export interface JsonlDiscoveryResult {
  source: "claude-code";
  /** Number of .jsonl files seen in the dropped folder. */
  fileCount: number;
  /** Total non-empty lines across all files. */
  lineCount: number;
  /** Lines that successfully parsed as JSON. */
  parsedCount: number;
  /** Lines that failed JSON.parse. */
  parseErrorCount: number;
  /** Count of each distinct top-level key seen across sampled events. */
  keyCounts: Record<string, number>;
  /** Count of each distinct `type` value seen across sampled events. */
  typeCounts: Record<string, number>;
  /** How many lines were actually sampled per file (cap applied). */
  sampledLineCount: number;
  /** A few raw sample events, pretty-printed, for eyeballing the shape. */
  samples: string[];
  /** Per-file breakdown for context. */
  files: Array<{ name: string; lines: number; sampled: number }>;
  warnings: string[];
}
