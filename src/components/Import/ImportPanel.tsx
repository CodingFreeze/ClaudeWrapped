// ---------------------------------------------------------------------------
// ImportPanel — per-provider status + merge toggles + CTA.
// Shown when at least one file has been dropped (importing/processing phase).
// ---------------------------------------------------------------------------

import type { ProviderImportState, AppView } from "../../lib/types";
import { ParseStatus } from "./ParseStatus";

interface ImportPanelProps {
  states: ProviderImportState[];
  view: AppView;
  onViewChange: (v: AppView) => void;
  onStartDeck: () => void;
  canStartDeck: boolean;
}

const VIEW_OPTIONS: { value: AppView; label: string }[] = [
  { value: "merged", label: "All AI tools" },
  { value: "coding", label: "Coding only" },
];

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

export function ImportPanel({
  states,
  view,
  onViewChange,
  onStartDeck,
  canStartDeck,
}: ImportPanelProps) {
  const hasMultipleSources =
    states.filter((s) => s.status === "done").length >= 2;

  return (
    <div className="flex flex-col gap-5">
      {/* Parse status per provider */}
      <ParseStatus states={states} />

      {/* Merge controls (only if ≥2 sources loaded) */}
      {hasMultipleSources && (
        <div className="flex flex-col gap-2">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--aw-ink-mute)" }}
          >
            View
          </p>
          <div className="flex gap-2 flex-wrap">
            {VIEW_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onViewChange(value)}
                className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors"
                style={{
                  borderColor: view === value ? "var(--aw-coral)" : "var(--aw-hairline)",
                  background:
                    view === value
                      ? "oklch(70% 0.17 40 / 0.12)"
                      : "var(--aw-surface)",
                  color: view === value ? "var(--aw-coral)" : "var(--aw-ink-soft)",
                }}
                aria-pressed={view === value}
              >
                {label}
              </button>
            ))}

            {/* Per-provider toggles */}
            {states
              .filter((s) => s.status === "done")
              .map((s) => (
                <button
                  key={s.provider}
                  type="button"
                  onClick={() => onViewChange(s.provider)}
                  className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors capitalize"
                  style={{
                    borderColor: view === s.provider ? "var(--aw-coral)" : "var(--aw-hairline)",
                    background:
                      view === s.provider
                        ? "oklch(70% 0.17 40 / 0.12)"
                        : "var(--aw-surface)",
                    color:
                      view === s.provider ? "var(--aw-coral)" : "var(--aw-ink-soft)",
                  }}
                  aria-pressed={view === s.provider}
                >
                  {s.provider.replace("-", " ")}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Privacy note */}
      <p className="text-xs" style={{ color: "var(--aw-ink-mute)" }}>
        Nothing has been uploaded. All parsing happened in this tab.
      </p>

      {/* CTA */}
      {canStartDeck && (
        <button
          type="button"
          onClick={onStartDeck}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-bold transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: "var(--aw-coral)",
            color: "var(--aw-paper)",
            boxShadow: "0 12px 32px -8px oklch(70% 0.170 40 / 0.5)",
          }}
        >
          See my Wrapped
          <ArrowRightIcon />
        </button>
      )}
    </div>
  );
}
