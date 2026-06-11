// ---------------------------------------------------------------------------
// Shared types — normalized WrappedStats model + app state machine.
// ---------------------------------------------------------------------------

// Keep legacy types for backward compat until parsers are fully migrated.
import type { MonthlyDatum } from "./wrapped";

// ----- Legacy: Claude.ai export ZIP (conversations.json) -----

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
  monthlySeries: MonthlyDatum[];
  earliest?: string;
  latest?: string;
  warnings: string[];
}

// ----- Legacy: Claude Code .jsonl logs (schema discovery) -----

export interface JsonlDiscoveryResult {
  source: "claude-code";
  fileCount: number;
  lineCount: number;
  parsedCount: number;
  parseErrorCount: number;
  keyCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  sampledLineCount: number;
  samples: string[];
  files: Array<{ name: string; lines: number; sampled: number }>;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// New: Normalized multi-provider model
// ---------------------------------------------------------------------------

export type Provider =
  | "claude-code"
  | "claude-ai"
  | "chatgpt"
  | "codex"
  | "grok"
  | "gemini";

export interface WrappedStats {
  provider: Provider | "merged" | "coding";
  range: { start: string; end: string };

  // Core counts
  sessionCount: number;
  conversationCount: number;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  toolUseCount?: number;

  // Time series
  monthlySeries: { month: string; messages: number }[];
  dailySeries?: { date: string; messages: number }[];
  hourHistogram?: number[];

  // Model breakdown (Tier 1 only)
  modelBreakdown?: { model: string; messages: number; tokens?: number }[];

  // Token/cost (Tier 1 only)
  tokenUsage?: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheCreate?: number;
    estimated: boolean;
    estimatedCostUSD?: number;
  };

  // Streak
  streak?: {
    longestDays: number;
    longestStart: string;
    busiestDate: string;
    busiestCount: number;
  };

  // Coding-specific (CC + Codex)
  codingStats?: {
    topProjects: { name: string; sessions: number }[];
    topBranches: { name: string; sessions: number }[];
    avgSessionDurationMs?: number;
  };

  // First-class project stats (CC + Codex, top 8 by messages)
  projectStats?: {
    name: string;
    sessions: number;
    messages: number;
    firstSeen: string;
    lastSeen: string;
    activeDays: number;
  }[];

  // Word stats (accumulated during parse, no full text retained)
  wordStats?: {
    userTopWords: { word: string; count: number }[];
    perModelTopWords: { model: string; words: { word: string; count: number }[] }[];
    totalUserWords: number;
    totalAssistantWords: number;
    distinctUserWords: number;
    verbosityRatio: number; // avg assistant words per user word
  };

  // Tool stats (CC only)
  toolStats?: {
    topTools: { name: string; count: number }[];
    totalInvocations: number;
  };

  // Extra temporal + session metrics
  extras?: {
    busiestWeekday: number;       // 0=Sun … 6=Sat
    busiestWeekdayName: string;
    totalActiveDays: number;
    avgMessagesPerActiveDay: number;
    longestSessionMessages: number;
    longestSessionDate: string;
    firstSessionDate: string;
    thinkingBlockCount: number;   // CC only — assistant content type "thinking"
  };

  // Superlatives
  superlatives?: {
    nightOwl: boolean;
    earlyBird: boolean;
    weekendWarrior: boolean;
    marathoner: boolean;
    tokenBurner?: boolean;
    polyglot?: boolean;      // >= 3 distinct models
    toolMaster?: boolean;    // toolUseCount >= 500
    wordsmith?: boolean;     // totalUserWords >= 50000
    projectHopper?: boolean; // >= 5 distinct projects
  };

  // Source metadata
  source: { fileCount: number; bytes: number; parseWarnings: string[] };
  isCoding: boolean;
}

// ---------------------------------------------------------------------------
// App state machine
// ---------------------------------------------------------------------------

export interface ProviderImportState {
  provider: Provider;
  status: "idle" | "parsing" | "done" | "error";
  parsed?: number;
  total?: number;
  stats?: WrappedStats;
  error?: string;
}

export type AppView = "merged" | "coding" | Provider;

export type AppState =
  | { phase: "idle" }
  | { phase: "importing"; providers: ProviderImportState[] }
  | { phase: "processing"; providers: ProviderImportState[] }
  | {
      phase: "deck";
      stats: WrappedStats;
      allStats: WrappedStats[];
      view: AppView;
      mode: "present" | "scroll";
      slide: number;
    }
  | { phase: "share"; stats: WrappedStats };

export type AppAction =
  | { type: "FILES_DROPPED"; provider: Provider; files: File[] }
  | { type: "PARSE_PROGRESS"; provider: Provider; parsed: number; total: number }
  | { type: "PARSE_COMPLETE"; provider: Provider; stats: WrappedStats }
  | { type: "PARSE_ERROR"; provider: Provider; error: string }
  | { type: "SET_VIEW"; view: AppView }
  | { type: "START_DECK" }
  | { type: "SLIDE_NEXT" }
  | { type: "SLIDE_PREV" }
  | { type: "TOGGLE_SCROLL_MODE" }
  | { type: "GO_SHARE" }
  | { type: "RESET" };
