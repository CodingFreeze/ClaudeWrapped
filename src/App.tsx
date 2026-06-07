import { useState } from "react";
import { DropZone } from "./components/DropZone";
import {
  ClaudeAiResultPanel,
  JsonlResultPanel,
} from "./components/ResultPanels";
import { parseClaudeAiZip } from "./lib/claudeAiZip";
import { discoverJsonlSchema } from "./lib/jsonlSchema";
import type { ClaudeAiParseResult, JsonlDiscoveryResult } from "./lib/types";

function App() {
  const [zipResult, setZipResult] = useState<ClaudeAiParseResult | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState<string | undefined>();

  const [jsonlResult, setJsonlResult] = useState<JsonlDiscoveryResult | null>(
    null,
  );
  const [jsonlBusy, setJsonlBusy] = useState(false);
  const [jsonlError, setJsonlError] = useState<string | undefined>();

  async function handleZip(files: File[]) {
    setZipError(undefined);
    setZipResult(null);
    setZipBusy(true);
    try {
      const result = await parseClaudeAiZip(files[0]);
      setZipResult(result);
    } catch (e) {
      setZipError(e instanceof Error ? e.message : String(e));
    } finally {
      setZipBusy(false);
    }
  }

  async function handleFolder(files: File[]) {
    setJsonlError(undefined);
    setJsonlResult(null);
    setJsonlBusy(true);
    try {
      const result = await discoverJsonlSchema(files);
      setJsonlResult(result);
      // Also dump to the console for easy copy/paste into HANDOFF.md.
      console.log("[Claude Wrapped] JSONL schema discovery:", result);
    } catch (e) {
      setJsonlError(e instanceof Error ? e.message : String(e));
    } finally {
      setJsonlBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Claude <span className="text-orange-400">Wrapped</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            100% in your browser — nothing is uploaded. Phase 1: drop your data
            and verify it parses.
          </p>
        </header>

        <section className="mb-6 grid gap-5 md:grid-cols-2">
          <DropZone
            title="1 · Claude.ai export"
            description="Drop your Claude.ai data export .zip (contains conversations.json)."
            accept=".zip,application/zip"
            onFiles={handleZip}
            busy={zipBusy}
            status={
              zipResult
                ? `Parsed ${zipResult.conversationCount.toLocaleString()} conversations · ${zipResult.messageCount.toLocaleString()} messages`
                : undefined
            }
            error={zipError}
          />

          <DropZone
            title="2 · Claude Code logs"
            description="Choose your ~/.claude/projects/ folder of .jsonl files (schema discovery)."
            directory
            onFiles={handleFolder}
            busy={jsonlBusy}
            status={
              jsonlResult
                ? `Sampled ${jsonlResult.sampledLineCount.toLocaleString()} of ${jsonlResult.lineCount.toLocaleString()} lines across ${jsonlResult.fileCount} file(s)`
                : undefined
            }
            error={jsonlError}
          />
        </section>

        <div className="flex flex-col gap-6">
          {zipResult && <ClaudeAiResultPanel result={zipResult} />}
          {jsonlResult && <JsonlResultPanel result={jsonlResult} />}
        </div>

        {!zipResult && !jsonlResult && (
          <p className="mt-10 text-center text-sm text-zinc-600">
            Drop data above to see parsed counts. No visualizations yet — that's
            Phase 2, after the Claude Code schema is confirmed.
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
