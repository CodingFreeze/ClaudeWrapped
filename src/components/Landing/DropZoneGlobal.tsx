// ---------------------------------------------------------------------------
// DropZoneGlobal — catch-all drop zone with coral dashed border.
// Accepts any format and runs basic auto-detection (P3 wire-up: detect.ts).
// ---------------------------------------------------------------------------

import { useState } from "react";
import type { Provider } from "../../lib/types";

interface DropZoneGlobalProps {
  onFiles: (provider: Provider, files: File[]) => void;
}

function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

/** Basic auto-detection — file extension / name heuristics only.
 *  Full detect.ts cascade lives in P3. */
function detectProvider(files: File[]): Provider | null {
  for (const f of files) {
    // Folder of .jsonl files
    if (f.name.endsWith(".jsonl")) {
      if (/rollout-.*\.jsonl/.test(f.name)) return "codex";
      return "claude-code";
    }
    // ZIP
    if (f.name.endsWith(".zip") || f.type === "application/zip") {
      return "claude-ai"; // default — parser will discriminate
    }
    // JSON
    if (f.name === "conversations.json" || f.name === "MyActivity.json") {
      if (f.name === "MyActivity.json") return "gemini";
      return "claude-ai";
    }
  }
  return null;
}

export function DropZoneGlobal({ onFiles }: DropZoneGlobalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [detectionNote, setDetectionNote] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const detected = detectProvider(files);
    if (detected) {
      setDetectionNote(`Detected: ${detected} — sending to parser…`);
      onFiles(detected, files);
    } else {
      setDetectionNote(
        "Could not detect provider automatically. Use the provider tiles above to select the correct source.",
      );
    }
  }

  return (
    <section aria-label="Drop any export file here">
      <h2
        className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em]"
        style={{ color: "var(--aw-ink-mute)" }}
      >
        Or drop anything here
      </h2>

      <div
        className="aw-dropzone flex flex-col items-center justify-center gap-3 p-8 cursor-pointer transition-all"
        style={{
          borderColor: dragOver ? "var(--aw-coral-strong)" : "var(--aw-coral)",
          background: dragOver ? "oklch(70% 0.17 40 / 0.10)" : undefined,
          minHeight: 120,
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.onchange = () => handleFiles(input.files);
          input.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).click()}
        aria-label="Drop any AI export file for auto-detection"
      >
        <span style={{ color: "var(--aw-coral)", opacity: dragOver ? 1 : 0.5 }}>
          <PlusIcon />
        </span>
        <p className="text-center text-sm" style={{ color: "var(--aw-ink-soft)" }}>
          <span className="font-semibold">Drop any format</span> — ZIP, JSON, or JSONL folder.
          <br />
          <span className="text-xs" style={{ color: "var(--aw-ink-mute)" }}>
            Auto-detection will route it to the right parser.
          </span>
        </p>
      </div>

      {detectionNote && (
        <p className="mt-2 text-xs" style={{ color: "var(--aw-ink-soft)" }}>
          {detectionNote}
        </p>
      )}

      {/* Privacy reinforcement */}
      <p className="mt-3 text-center text-xs" style={{ color: "var(--aw-ink-mute)" }}>
        Nothing has been uploaded. All parsing happens in this tab.
      </p>
    </section>
  );
}
