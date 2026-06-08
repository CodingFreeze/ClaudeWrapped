import { useState } from "react";
import { DropZone } from "./components/DropZone";
import {
  ClaudeAiResultPanel,
  JsonlResultPanel,
} from "./components/ResultPanels";
import { WrappedCard } from "./components/WrappedCard";
import { parseClaudeAiZip } from "./lib/claudeAiZip";
import { discoverJsonlSchema } from "./lib/jsonlSchema";
import { buildSampleResult } from "./lib/sampleData";
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

  const [sampleBusy, setSampleBusy] = useState(false);
  const [isSample, setIsSample] = useState(false);

  function handleSample() {
    if (sampleBusy) return;
    setZipError(undefined);
    setJsonlError(undefined);
    setSampleBusy(true);
    // Brief, intentional delay so the loading state reads as real work and the
    // reveal animation has a beat to land.
    window.setTimeout(() => {
      setJsonlResult(null);
      setZipResult(buildSampleResult());
      setIsSample(true);
      setSampleBusy(false);
    }, 600);
  }

  async function handleZip(files: File[]) {
    setZipError(undefined);
    setZipResult(null);
    setIsSample(false);
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
    setIsSample(false);
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

  const hasResult = Boolean(zipResult || jsonlResult);

  return (
    <div className="relative min-h-full text-zinc-100">
      <div aria-hidden className="cw-backdrop" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <header className="cw-rise mb-12 text-center sm:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] font-medium tracking-wide text-zinc-400 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            100% in your browser · nothing leaves your device
          </span>

          <h1 className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl">
            Claude <span className="cw-wordmark">Wrapped</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-400 sm:mx-0">
            Turn your Claude history into a year in review. Drop an export below
            — every byte is parsed locally, in the tab you're looking at.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <button
              type="button"
              onClick={handleSample}
              disabled={sampleBusy}
              className={[
                "inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-medium text-zinc-200 backdrop-blur",
                "transition-[transform,border-color,background-color] duration-150 ease-out",
                "hover:-translate-y-0.5 hover:border-orange-400/50 hover:text-white",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                "active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
            >
              {sampleBusy ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle className="opacity-25" cx="12" cy="12" r="9" /><path className="opacity-90" d="M21 12a9 9 0 0 1-9 9" strokeLinecap="round" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              )}
              {sampleBusy ? "Loading sample…" : "Try sample data"}
            </button>
            <span className="text-xs text-zinc-500">no upload required</span>
          </div>
        </header>

        <section className="cw-rise mb-8 grid gap-5 md:grid-cols-2" style={{ animationDelay: "80ms" }}>
          <DropZone
            title="Claude.ai export"
            description="Drop your Claude.ai data export .zip (contains conversations.json)."
            accept=".zip,application/zip"
            onFiles={handleZip}
            busy={zipBusy}
            status={
              zipResult && !isSample
                ? `Parsed ${zipResult.conversationCount.toLocaleString()} conversations · ${zipResult.messageCount.toLocaleString()} messages`
                : undefined
            }
            error={zipError}
          />

          <DropZone
            title="Claude Code logs"
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

        {isSample && zipResult && (
          <p className="cw-rise mb-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
            Showing sample data — upload your own export to see your real year.
          </p>
        )}

        <div className="flex flex-col gap-6">
          {zipResult && zipResult.monthlySeries.length > 0 && (
            <WrappedCard series={zipResult.monthlySeries} />
          )}
          {zipResult && <ClaudeAiResultPanel result={zipResult} />}
          {jsonlResult && <JsonlResultPanel result={jsonlResult} />}
        </div>

        {!hasResult && (
          <div className="cw-rise mt-10 rounded-2xl border border-dashed border-zinc-800/70 bg-zinc-900/30 px-6 py-12 text-center" style={{ animationDelay: "160ms" }}>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 text-zinc-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16l4-6 4 3 5-8" /></svg>
            </div>
            <p className="text-sm font-medium text-zinc-300">
              Your wrapped card will appear here
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-zinc-500">
              Drop your export above, or hit{" "}
              <button
                type="button"
                onClick={handleSample}
                className="font-medium text-orange-400 underline-offset-2 transition-colors hover:text-orange-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded"
              >
                Try sample data
              </button>{" "}
              to preview the experience.
            </p>
          </div>
        )}

        <footer className="mt-16 border-t border-zinc-900 pt-6 text-center text-xs text-zinc-600">
          Parsed entirely on-device. Nothing is uploaded, stored, or sent anywhere.
        </footer>
      </div>
    </div>
  );
}

export default App;
