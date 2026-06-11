// ---------------------------------------------------------------------------
// ProviderTile — individual provider card in the picker grid.
// ---------------------------------------------------------------------------

import { useState, useId } from "react";
import type { Provider } from "../../lib/types";

export interface ProviderConfig {
  id: Provider;
  name: string;
  tier: "rich" | "counts";
  acceptHint: string;
  exportInstructions: string;
  directory?: boolean;
  accept?: string;
  comingSoon?: false;
}

export interface ComingSoonConfig {
  id: string;
  name: string;
  comingSoon: true;
}

export type ProviderTileConfig = ProviderConfig | ComingSoonConfig;

interface ProviderTileProps {
  config: ProviderTileConfig;
  onFiles?: (provider: Provider, files: File[]) => void;
}

// SVG provider icons — minimal, branded
function ProviderIcon({ id }: { id: string }) {
  switch (id) {
    case "claude-code":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      );
    case "claude-ai":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      );
    case "chatgpt":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4l3 3"/>
        </svg>
      );
    case "codex":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M8 12h8M8 8h5M8 16h6"/>
        </svg>
      );
    case "gemini":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    case "grok":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      );
    case "cursor":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      );
    case "perplexity":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      );
  }
}

function providerColor(id: string): string {
  switch (id) {
    case "claude-code":
    case "claude-ai": return "var(--aw-claude)";
    case "chatgpt": return "var(--aw-chatgpt)";
    case "gemini": return "var(--aw-gemini)";
    case "grok": return "var(--aw-grok)";
    case "codex": return "var(--aw-codex)";
    default: return "var(--aw-ink-mute)";
  }
}

// Plus SVG for drop zone
function PlusIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

export function ProviderTile({ config, onFiles }: ProviderTileProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputId = useId();

  const isComingSoon = config.comingSoon === true;

  if (isComingSoon) {
    return (
      <div
        className="relative flex flex-col gap-3 rounded-2xl border p-4 opacity-50 select-none"
        style={{ borderColor: "var(--aw-hairline)", background: "var(--aw-surface)" }}
        aria-disabled="true"
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--aw-surface-2)", color: "var(--aw-ink-mute)" }}
          >
            <ProviderIcon id={config.id} />
          </span>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--aw-ink-mute)" }}>
              {config.name}
            </div>
            <div
              className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "var(--aw-hairline)", color: "var(--aw-ink-mute)" }}
            >
              Coming Soon
            </div>
          </div>
        </div>
      </div>
    );
  }

  const live = config as ProviderConfig;
  const accentColor = providerColor(live.id);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFiles?.(live.id, Array.from(fileList));
    setExpanded(false);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      className="relative flex flex-col gap-3 rounded-2xl border p-4 transition-all"
      style={{
        borderColor: expanded ? accentColor : "var(--aw-hairline)",
        background: expanded
          ? `oklch(from ${accentColor} l c h / 0.06)`
          : "var(--aw-surface)",
      }}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={isComingSoon}
        className="flex w-full items-center gap-3 text-left"
        aria-expanded={expanded}
        aria-controls={`tile-body-${inputId}`}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
          style={{
            background: expanded
              ? `oklch(from ${accentColor} l c h / 0.15)`
              : "var(--aw-surface-2)",
            color: expanded ? accentColor : "var(--aw-ink-soft)",
          }}
        >
          <ProviderIcon id={live.id} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: "var(--aw-ink)" }}>
            {live.name}
          </div>
          <div
            className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: live.tier === "rich" ? accentColor : "var(--aw-ink-mute)" }}
          >
            {live.tier === "rich" ? "Rich stats" : "Counts only"}
          </div>
        </div>

        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 transition-transform"
          style={{
            color: "var(--aw-ink-mute)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div id={`tile-body-${inputId}`} className="flex flex-col gap-3">
          <p className="text-xs leading-relaxed" style={{ color: "var(--aw-ink-soft)" }}>
            {live.exportInstructions}
          </p>

          {/* Drop zone */}
          <div
            className="aw-dropzone flex flex-col items-center justify-center gap-2 p-5 cursor-pointer transition-colors"
            style={{
              borderColor: dragOver ? accentColor : "var(--aw-coral)",
              background: dragOver ? `oklch(from ${accentColor} l c h / 0.08)` : undefined,
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById(inputId)?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && document.getElementById(inputId)?.click()}
            aria-label={`Drop ${live.name} export here`}
          >
            <span style={{ color: "var(--aw-coral)", opacity: 0.7 }}>
              <PlusIcon />
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--aw-ink-soft)" }}>
              {live.acceptHint}
            </span>
          </div>

          {/* File input */}
          <input
            id={inputId}
            type="file"
            accept={live.accept}
            {...(live.directory ? { webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement> : {})}
            multiple={live.directory}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <button
            type="button"
            onClick={() => document.getElementById(inputId)?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: accentColor, color: "var(--aw-paper)" }}
          >
            <UploadIcon />
            {live.directory ? "Choose folder" : "Choose file"}
          </button>
        </div>
      )}
    </div>
  );
}
