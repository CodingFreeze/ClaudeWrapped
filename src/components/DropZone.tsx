import { useCallback, useId, useRef, useState } from "react";

interface DropZoneProps {
  title: string;
  description: string;
  /** Accept attribute for the file input (e.g. ".zip"). */
  accept?: string;
  /** When true, render a folder picker (webkitdirectory) instead of a file picker. */
  directory?: boolean;
  /** Called with the selected files. ZIP mode yields one file; folder mode yields many. */
  onFiles: (files: File[]) => void;
  busy?: boolean;
  /** Status line shown under the zone (e.g. "Parsed 3 files"). */
  status?: string;
  /** Error message shown in red. */
  error?: string;
}

export function DropZone({
  title,
  description,
  accept,
  directory = false,
  onFiles,
  busy = false,
  status,
  error,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      onFiles(Array.from(fileList));
    },
    [onFiles],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      // Folders dropped (vs. picked) need DataTransferItem traversal, which is
      // browser-specific. For folder mode we steer users to the picker button;
      // here we forward whatever plain files landed.
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={[
        "flex flex-col gap-3 rounded-2xl border-2 border-dashed p-6 transition-colors",
        dragOver
          ? "border-orange-400 bg-orange-400/10"
          : "border-zinc-700 bg-zinc-900/60",
      ].join(" ")}
    >
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        // webkitdirectory turns this into a folder picker. Typed via vite-env.d.ts.
        {...(directory ? { webkitdirectory: "", directory: "" } : {})}
        multiple={directory}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Working…" : directory ? "Choose folder" : "Choose file"}
        </button>
        {!directory && (
          <span className="text-xs text-zinc-500">…or drag &amp; drop here</span>
        )}
      </div>

      {status && <p className="text-sm text-emerald-400">{status}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
