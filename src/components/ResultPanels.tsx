import type { ClaudeAiParseResult, JsonlDiscoveryResult } from "../lib/types";

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border px-4 py-3 transition-colors duration-300",
        accent
          ? "border-orange-500/25 bg-orange-500/10 hover:border-orange-400/40"
          : "border-zinc-800/80 bg-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800/60",
      ].join(" ")}
    >
      <div
        className={[
          "text-2xl font-bold tabular-nums",
          accent ? "text-orange-300" : "text-zinc-100",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function CountsTable({
  title,
  counts,
}: {
  title: string;
  counts: Record<string, number>;
}) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-zinc-300">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">None found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([key, count]) => (
                <tr key={key} className="border-b border-zinc-800 last:border-0">
                  <td className="px-3 py-1.5 font-mono text-zinc-300">{key}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-400">
                    {count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Warnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <details className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
      <summary className="cursor-pointer font-medium">
        {warnings.length} warning{warnings.length === 1 ? "" : "s"}
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-200/80">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </details>
  );
}

export function ClaudeAiResultPanel({ result }: { result: ClaudeAiParseResult }) {
  const fmt = (s?: string) =>
    s ? new Date(s).toLocaleDateString() : "—";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h3 className="text-base font-semibold text-zinc-100">
        Claude.ai export · <span className="font-mono text-zinc-400">{result.fileName}</span>
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Conversations" value={result.conversationCount.toLocaleString()} accent />
        <Stat label="Messages" value={result.messageCount.toLocaleString()} accent />
        <Stat label="Earliest" value={fmt(result.earliest)} />
        <Stat label="Latest" value={fmt(result.latest)} />
      </div>

      <CountsTable title="Messages by sender" counts={result.senderCounts} />
      <Warnings warnings={result.warnings} />
    </div>
  );
}

export function JsonlResultPanel({ result }: { result: JsonlDiscoveryResult }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h3 className="text-base font-semibold text-zinc-100">
        Claude Code logs · schema discovery
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label=".jsonl files" value={result.fileCount.toLocaleString()} />
        <Stat label="Total lines" value={result.lineCount.toLocaleString()} />
        <Stat label="Sampled" value={result.sampledLineCount.toLocaleString()} />
        <Stat label="Parse errors" value={result.parseErrorCount.toLocaleString()} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CountsTable title="Top-level keys (in sample)" counts={result.keyCounts} />
        <CountsTable title="`type` values (in sample)" counts={result.typeCounts} />
      </div>

      {result.samples.length > 0 && (
        <details className="rounded-lg bg-zinc-800/50 p-3" open>
          <summary className="cursor-pointer text-sm font-semibold text-zinc-300">
            {result.samples.length} raw sample event(s)
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {result.samples.map((s, i) => (
              <pre
                key={i}
                className="max-h-80 overflow-auto rounded-md bg-black/60 p-3 text-xs leading-relaxed text-zinc-300"
              >
                {s}
              </pre>
            ))}
          </div>
        </details>
      )}

      <Warnings warnings={result.warnings} />
    </div>
  );
}
