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
        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-dashed p-6",
        "transition-[transform,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-0.5",
        dragOver
          ? "border-orange-400 bg-orange-400/10 shadow-[0_0_0_1px_rgba(251,146,60,0.4),0_18px_50px_-24px_rgba(251,146,60,0.6)]"
          : "border-zinc-700/80 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900/70 hover:shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)]",
      ].join(" ")}
    >
      {/* drag-state glow wash */}
      <div
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(251,146,60,0.10),transparent_60%)] transition-opacity duration-300",
          dragOver ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <div className="relative flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-800/60 text-zinc-300 transition-colors duration-300 group-hover:border-orange-400/40 group-hover:text-orange-300"
        >
          {directory ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          )}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>
        </div>
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

      <div className="relative mt-auto flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={[
            "inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white",
            "shadow-[0_8px_24px_-12px_rgba(251,146,60,0.8)]",
            "transition-[transform,background-color,box-shadow] duration-150 ease-out",
            "hover:bg-orange-400 hover:shadow-[0_10px_28px_-10px_rgba(251,146,60,0.9)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
            "active:translate-y-px active:bg-orange-500",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
          ].join(" ")}
        >
          {busy && (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle className="opacity-25" cx="12" cy="12" r="9" /><path className="opacity-90" d="M21 12a9 9 0 0 1-9 9" strokeLinecap="round" /></svg>
          )}
          {busy ? "Working…" : directory ? "Choose folder" : "Choose file"}
        </button>
        {!directory && (
          <span className="text-xs text-zinc-500">or drag &amp; drop</span>
        )}
      </div>

      {status && (
        <p className="relative flex items-center gap-1.5 text-sm font-medium text-emerald-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          {status}
        </p>
      )}
      {error && (
        <p className="relative flex items-start gap-1.5 text-sm text-red-400">
          <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </p>
      )}
    </div>
  );
}
