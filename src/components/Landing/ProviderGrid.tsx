// ---------------------------------------------------------------------------
// ProviderGrid — 8-tile provider picker (6 live + 2 coming-soon stubs).
// ---------------------------------------------------------------------------

import { ProviderTile } from "./ProviderTile";
import type { ProviderTileConfig } from "./ProviderTile";
import type { Provider } from "../../lib/types";

const PROVIDERS: ProviderTileConfig[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    tier: "rich",
    acceptHint: "Drop ~/.claude/projects/ folder",
    exportInstructions:
      "Open your terminal and locate ~/.claude/projects/. Drag the entire projects folder here, or click to select it.",
    directory: true,
  },
  {
    id: "codex",
    name: "Codex CLI",
    tier: "rich",
    acceptHint: "Drop ~/.codex/sessions/ folder",
    exportInstructions:
      "Locate ~/.codex/sessions/ or ~/.codex/archived_sessions/. Drag the folder here, or click to select it.",
    directory: true,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    tier: "rich",
    acceptHint: "Drop conversations.json or export ZIP",
    exportInstructions:
      "Go to chatgpt.com → Settings → Data Controls → Export data. You'll receive an email with a ZIP. Upload that ZIP here.",
    accept: ".zip,.json,application/zip,application/json",
  },
  {
    id: "claude-ai",
    name: "Claude.ai",
    tier: "counts",
    acceptHint: "Drop Claude.ai export ZIP",
    exportInstructions:
      "Go to claude.ai → Settings → Privacy → Export data. You'll receive an email with a ZIP. Upload that ZIP here.",
    accept: ".zip,application/zip",
  },
  {
    id: "grok",
    name: "Grok (xAI)",
    tier: "counts",
    acceptHint: "Drop Grok export ZIP",
    exportInstructions:
      "Go to accounts.x.ai → Data export → Download ZIP. Upload the ZIP here.",
    accept: ".zip,application/zip",
  },
  {
    id: "gemini",
    name: "Gemini",
    tier: "counts",
    acceptHint: "Drop Takeout JSON (not HTML)",
    exportInstructions:
      "Go to Google Takeout → My Activity → Gemini Apps. IMPORTANT: change the format from HTML to JSON before exporting. Upload the JSON file or Takeout ZIP here.",
    accept: ".zip,.json,application/zip,application/json",
  },
  {
    id: "cursor",
    name: "Cursor",
    comingSoon: true,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    comingSoon: true,
  },
];

interface ProviderGridProps {
  onFiles: (provider: Provider, files: File[]) => void;
}

export function ProviderGrid({ onFiles }: ProviderGridProps) {
  return (
    <section aria-label="Select AI provider">
      <h2
        className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em]"
        style={{ color: "var(--aw-ink-mute)" }}
      >
        Select a source
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PROVIDERS.map((p) => (
          <ProviderTile key={p.id} config={p} onFiles={onFiles} />
        ))}
      </div>
    </section>
  );
}
