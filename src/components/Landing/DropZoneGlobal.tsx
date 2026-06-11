// ---------------------------------------------------------------------------
// DropZoneGlobal — catch-all drop zone with full auto-detection cascade.
// Supports folder drag-drop via DataTransferItem.webkitGetAsEntry traversal.
// ---------------------------------------------------------------------------

import { useState, useId } from "react";
import type { Provider } from "../../lib/types";
import { autoDetect } from "../../lib/parsers/detect";

interface DropZoneGlobalProps {
  onFiles: (provider: Provider, files: File[]) => void;
  onFilesFromTransfer?: (items: DataTransferItemList) => Promise<File[]>;
}

function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

export function DropZoneGlobal({ onFiles, onFilesFromTransfer }: DropZoneGlobalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [detectionNote, setDetectionNote] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const inputId = useId();

  async function processFiles(files: File[]) {
    if (files.length === 0) return;

    setDetecting(true);
    setDetectionNote(null);

    try {
      const result = await autoDetect(files);

      if (result.provider) {
        setDetectionNote(
          `Detected: ${result.provider.replace("-", " ")} — sending to parser…`,
        );
        onFiles(result.provider, files);
      } else {
        setDetectionNote(
          (result as { provider: null; reason: string }).reason +
            " Use the provider tiles above to select the correct source.",
        );
      }
    } finally {
      setDetecting(false);
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);

    let files: File[];

    // Prefer directory traversal path
    if (onFilesFromTransfer && e.dataTransfer.items) {
      files = await onFilesFromTransfer(e.dataTransfer.items);
    } else {
      files = Array.from(e.dataTransfer.files);
    }

    await processFiles(files);
  }

  function handleFileInput(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    processFiles(Array.from(fileList));
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
        onDrop={handleDrop}
        onClick={() => document.getElementById(inputId)?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && document.getElementById(inputId)?.click()}
        aria-label="Drop any AI export file for auto-detection"
      >
        <span style={{ color: "var(--aw-coral)", opacity: dragOver ? 1 : 0.5 }}>
          {detecting ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <PlusIcon />
          )}
        </span>
        <p className="text-center text-sm" style={{ color: "var(--aw-ink-soft)" }}>
          <span className="font-semibold">Drop any format</span> — ZIP, JSON, or JSONL folder.
          <br />
          <span className="text-xs" style={{ color: "var(--aw-ink-mute)" }}>
            Auto-detection will route it to the right parser.
          </span>
        </p>
      </div>

      {/* Hidden multi-file input for click-to-browse fallback */}
      <input
        id={inputId}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileInput(e.target.files)}
      />

      {detectionNote && (
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--aw-ink-soft)" }}
          role="status"
          aria-live="polite"
        >
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
