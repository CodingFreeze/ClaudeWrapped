// ---------------------------------------------------------------------------
// ParseStatus — live progress + warnings display per provider.
// ---------------------------------------------------------------------------

import type { ProviderImportState } from "../../lib/types";

// Check icon
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

// Error icon
function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

// Spinner icon
function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="9"/>
      <path className="opacity-90" d="M21 12a9 9 0 0 1-9 9" strokeLinecap="round"/>
    </svg>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  "claude-ai": "Claude.ai",
  chatgpt: "ChatGPT",
  codex: "Codex CLI",
  grok: "Grok",
  gemini: "Gemini",
};

interface ParseStatusProps {
  states: ProviderImportState[];
}

export function ParseStatus({ states }: ParseStatusProps) {
  if (states.length === 0) return null;

  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite" aria-label="Parse progress">
      {states.map((s) => (
        <div
          key={s.provider}
          className="rounded-xl border p-3"
          style={{ borderColor: "var(--aw-hairline)", background: "var(--aw-surface)" }}
        >
          <div className="flex items-center gap-2">
            {/* Status icon */}
            <span style={{ color: statusColor(s.status) }}>
              {s.status === "parsing" && <SpinnerIcon />}
              {s.status === "done" && <CheckIcon />}
              {s.status === "error" && <ErrorIcon />}
              {s.status === "idle" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              )}
            </span>

            <span className="flex-1 text-sm font-medium" style={{ color: "var(--aw-ink)" }}>
              {PROVIDER_LABELS[s.provider] ?? s.provider}
            </span>

            {/* Progress text */}
            {s.status === "parsing" && s.parsed !== undefined && s.total !== undefined && (
              <span className="font-stat text-xs" style={{ color: "var(--aw-ink-mute)" }}>
                {s.parsed.toLocaleString()} / {s.total.toLocaleString()}
              </span>
            )}
            {s.status === "done" && s.stats && (
              <span className="font-stat text-xs" style={{ color: "var(--aw-ink-soft)" }}>
                {s.stats.conversationCount.toLocaleString()} convos · {s.stats.messageCount.toLocaleString()} msgs
              </span>
            )}
          </div>

          {/* Progress bar */}
          {s.status === "parsing" && s.parsed !== undefined && s.total !== undefined && s.total > 0 && (
            <div
              className="mt-2 h-1 rounded-full overflow-hidden"
              style={{ background: "var(--aw-hairline)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round((s.parsed / s.total) * 100)}%`,
                  background: "var(--aw-coral)",
                }}
              />
            </div>
          )}

          {/* Error message */}
          {s.status === "error" && s.error && (
            <p className="mt-1 text-xs" style={{ color: "oklch(65% 0.20 25)" }}>
              {s.error}
            </p>
          )}

          {/* Warnings */}
          {s.status === "done" && s.stats && s.stats.source.parseWarnings.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs" style={{ color: "oklch(75% 0.14 80)" }}>
                {s.stats.source.parseWarnings.length} warning(s)
              </summary>
              <ul className="mt-1 list-disc pl-4 text-xs" style={{ color: "oklch(75% 0.14 80)" }}>
                {s.stats.source.parseWarnings.slice(0, 5).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function statusColor(status: ProviderImportState["status"]): string {
  switch (status) {
    case "done": return "oklch(70% 0.14 155)";
    case "error": return "oklch(65% 0.20 25)";
    case "parsing": return "var(--aw-coral)";
    default: return "var(--aw-ink-mute)";
  }
}
