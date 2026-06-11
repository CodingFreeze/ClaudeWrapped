// ---------------------------------------------------------------------------
// Parse Worker — runs parsers off the main thread for files > 1MB.
// Receives File[] + provider; posts progress and result back to main.
// ---------------------------------------------------------------------------

import type { Provider, WrappedStats } from "../types";
import { parseClaudeCodeFiles } from "../parsers/claudeCode";
import { parseCodexFiles } from "../parsers/codex";
import { parseClaudeAiZipToStats } from "../parsers/claudeAi";
import { parseChatGptExport } from "../parsers/chatgpt";
import { parseGrokExport } from "../parsers/grok";
import { parseGeminiExport } from "../parsers/gemini";

export type WorkerInMessage = {
  files: File[];
  provider: Provider;
};

export type WorkerOutMessage =
  | { type: "progress"; parsed: number; total: number }
  | { type: "result"; stats: WrappedStats }
  | { type: "error"; message: string };

function getParser(provider: Provider) {
  switch (provider) {
    case "claude-code":
      return (files: File[], onProgress?: (p: number, t: number) => void) =>
        parseClaudeCodeFiles(files, onProgress);
    case "codex":
      return (files: File[], onProgress?: (p: number, t: number) => void) =>
        parseCodexFiles(files, onProgress);
    case "claude-ai":
      return (files: File[]) => parseClaudeAiZipToStats(files[0]);
    case "chatgpt":
      return (files: File[]) => parseChatGptExport(files[0]);
    case "grok":
      return (files: File[]) => parseGrokExport(files[0]);
    case "gemini":
      return (files: File[]) => parseGeminiExport(files[0]);
    default: {
      const exhaustive: never = provider;
      throw new Error(`No parser for provider: ${exhaustive}`);
    }
  }
}

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const { files, provider } = e.data;

  try {
    const onProgress = (parsed: number, total: number) => {
      (self as unknown as Worker).postMessage({ type: "progress", parsed, total } satisfies WorkerOutMessage);
    };

    const parser = getParser(provider);
    const stats = await parser(files, onProgress);

    (self as unknown as Worker).postMessage({ type: "result", stats } satisfies WorkerOutMessage);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    } satisfies WorkerOutMessage);
  }
};
