// ---------------------------------------------------------------------------
// useParseWorker — React hook wrapping the WorkerBridge.
// Uses the Web Worker when combined file size > 1MB; falls back to inline
// parsing otherwise (simpler debugging on small data sets).
// ---------------------------------------------------------------------------

import { useRef, useCallback } from "react";
import type { Provider, WrappedStats } from "../lib/types";
import { WorkerBridge } from "../lib/workers/workerBridge";
import { parseClaudeCodeFiles } from "../lib/parsers/claudeCode";
import { parseCodexFiles } from "../lib/parsers/codex";
import { parseClaudeAiZipToStats } from "../lib/parsers/claudeAi";
import { parseChatGptExport } from "../lib/parsers/chatgpt";
import { parseGrokExport } from "../lib/parsers/grok";
import { parseGeminiExport } from "../lib/parsers/gemini";

const WORKER_THRESHOLD_BYTES = 1024 * 1024; // 1MB

export interface ParseCallbacks {
  onProgress: (parsed: number, total: number) => void;
  onResult: (stats: WrappedStats) => void;
  onError: (message: string) => void;
}

/** Parse inline (main thread) for small files. */
async function parseInline(
  files: File[],
  provider: Provider,
  onProgress: (p: number, t: number) => void,
): Promise<WrappedStats> {
  switch (provider) {
    case "claude-code":
      return parseClaudeCodeFiles(files, onProgress);
    case "codex":
      return parseCodexFiles(files, onProgress);
    case "claude-ai":
      return parseClaudeAiZipToStats(files[0]);
    case "chatgpt":
      return parseChatGptExport(files[0]);
    case "grok":
      return parseGrokExport(files[0]);
    case "gemini":
      return parseGeminiExport(files[0]);
    default: {
      const exhaustive: never = provider;
      throw new Error(`No parser registered for provider: ${exhaustive}`);
    }
  }
}

export function useParseWorker() {
  const bridgeRef = useRef<WorkerBridge | null>(null);
  // Generation counter guards against stale results from a superseded parse
  // call reaching callbacks after a new parse() was already dispatched.
  const generationRef = useRef(0);

  const parse = useCallback(
    (files: File[], provider: Provider, callbacks: ParseCallbacks) => {
      // Terminate any running parse
      bridgeRef.current?.terminate();

      // Advance generation so any in-flight inline promise is discarded.
      const generation = ++generationRef.current;

      const totalBytes = files.reduce((s, f) => s + f.size, 0);

      if (totalBytes >= WORKER_THRESHOLD_BYTES) {
        // Off-thread path — worker bridge manages its own lifecycle.
        const bridge = new WorkerBridge();
        bridgeRef.current = bridge;
        bridge.start(files, provider, {
          onProgress: (parsed, total) => {
            if (generationRef.current !== generation) return;
            callbacks.onProgress(parsed, total);
          },
          onResult: (stats) => {
            if (generationRef.current !== generation) return;
            callbacks.onResult(stats);
          },
          onError: (message) => {
            if (generationRef.current !== generation) return;
            callbacks.onError(message);
          },
        });
      } else {
        // Inline path — check generation in .then/.catch to discard stale results.
        parseInline(files, provider, (p, t) => {
          if (generationRef.current !== generation) return;
          callbacks.onProgress(p, t);
        })
          .then((stats) => {
            if (generationRef.current !== generation) return;
            callbacks.onResult(stats);
          })
          .catch((err) => {
            if (generationRef.current !== generation) return;
            callbacks.onError(err instanceof Error ? err.message : String(err));
          });
      }
    },
    [],
  );

  const terminate = useCallback(() => {
    bridgeRef.current?.terminate();
    bridgeRef.current = null;
  }, []);

  return { parse, terminate };
}
