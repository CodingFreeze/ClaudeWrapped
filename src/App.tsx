// ---------------------------------------------------------------------------
// App.tsx — root state machine for the AI Wrapped experience.
// P3: wires all parsers + Web Worker bridge into phase reducer.
// ---------------------------------------------------------------------------

import { useReducer, useCallback, useState, useMemo } from "react";
import { LandingHero } from "./components/Landing/LandingHero";
import { ProviderGrid } from "./components/Landing/ProviderGrid";
import { DropZoneGlobal } from "./components/Landing/DropZoneGlobal";
import { ImportPanel } from "./components/Import/ImportPanel";
import { DeckController } from "./components/Deck/DeckController";
import { ScrollMode } from "./components/Deck/ScrollMode";
import { aggregateStats, filterCodingStats } from "./lib/aggregate";
import { sampleMergedStats } from "./lib/sampleData";
import { useParseWorker } from "./hooks/useParseWorker";
import { filterStatsByRange } from "./lib/stats/dateRange";
import type {
  Provider,
  ProviderImportState,
  WrappedStats,
  AppView,
} from "./lib/types";

/** Null means "all time"; otherwise a YYYY-MM-DD start/end pair. */
type DateRange = { start: string; end: string } | null;

// === App state ===

type Phase =
  | { kind: "idle" }
  | { kind: "importing"; providers: ProviderImportState[]; view: AppView }
  | {
      kind: "deck";
      stats: WrappedStats;
      allStats: WrappedStats[];
      view: AppView;
      mode: "present" | "scroll";
    };

type PhaseAction =
  | { type: "FILES_DROPPED"; provider: Provider }
  | { type: "PARSE_PROGRESS"; provider: Provider; parsed: number; total: number }
  | { type: "PARSE_COMPLETE"; provider: Provider; stats: WrappedStats }
  | { type: "PARSE_ERROR"; provider: Provider; error: string }
  | { type: "SET_VIEW"; view: AppView }
  | { type: "START_DECK" }
  | { type: "ENTER_DECK"; stats: WrappedStats; allStats: WrappedStats[] }
  | { type: "TOGGLE_SCROLL" }
  | { type: "RESET" };

function upsertProvider(
  providers: ProviderImportState[],
  provider: Provider,
  update: Partial<ProviderImportState>,
): ProviderImportState[] {
  const exists = providers.find((p) => p.provider === provider);
  if (exists) {
    return providers.map((p) =>
      p.provider === provider ? { ...p, ...update } : p,
    );
  }
  return [...providers, { provider, status: "parsing", ...update } as ProviderImportState];
}

function computeStats(providers: ProviderImportState[], view: AppView): WrappedStats | null {
  const doneStats = providers
    .filter((p) => p.status === "done" && p.stats)
    .map((p) => p.stats as WrappedStats);

  if (doneStats.length === 0) return null;

  if (view === "coding") {
    const codingOnly = filterCodingStats(doneStats);
    if (codingOnly.length === 0) return doneStats.length === 1 ? doneStats[0] : aggregateStats(doneStats, "merged");
    return codingOnly.length === 1 ? codingOnly[0] : aggregateStats(codingOnly, "coding");
  }

  if (view === "merged" || !doneStats.find((s) => s.provider === view)) {
    return doneStats.length === 1 ? doneStats[0] : aggregateStats(doneStats, "merged");
  }

  // Per-provider view
  return doneStats.find((s) => s.provider === view) ?? doneStats[0];
}

function phaseReducer(state: Phase, action: PhaseAction): Phase {
  switch (action.type) {
    case "FILES_DROPPED": {
      if (state.kind === "idle") {
        return {
          kind: "importing",
          providers: [{ provider: action.provider, status: "parsing" }],
          view: "merged",
        };
      }
      if (state.kind === "importing") {
        return {
          ...state,
          providers: upsertProvider(state.providers, action.provider, { status: "parsing" }),
        };
      }
      return state;
    }

    case "PARSE_PROGRESS": {
      if (state.kind !== "importing") return state;
      return {
        ...state,
        providers: upsertProvider(state.providers, action.provider, {
          parsed: action.parsed,
          total: action.total,
        }),
      };
    }

    case "PARSE_COMPLETE": {
      if (state.kind !== "importing") return state;
      return {
        ...state,
        providers: upsertProvider(state.providers, action.provider, {
          status: "done",
          stats: action.stats,
        }),
      };
    }

    case "PARSE_ERROR": {
      if (state.kind !== "importing") return state;
      return {
        ...state,
        providers: upsertProvider(state.providers, action.provider, {
          status: "error",
          error: action.error,
        }),
      };
    }

    case "SET_VIEW": {
      if (state.kind !== "importing") return state;
      return { ...state, view: action.view };
    }

    case "START_DECK": {
      if (state.kind !== "importing") return state;
      const merged = computeStats(state.providers, state.view);
      if (!merged) return state;
      const allStats = state.providers
        .filter((p) => p.status === "done" && p.stats)
        .map((p) => p.stats as WrappedStats);
      return {
        kind: "deck",
        stats: merged,
        allStats,
        view: state.view,
        mode: "present",
      };
    }

    case "ENTER_DECK": {
      return {
        kind: "deck",
        stats: action.stats,
        allStats: action.allStats,
        view: "merged",
        mode: "present",
      };
    }

    case "TOGGLE_SCROLL": {
      if (state.kind !== "deck") return state;
      return { ...state, mode: state.mode === "present" ? "scroll" : "present" };
    }

    case "RESET":
      return { kind: "idle" };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Directory traversal helpers for drag-drop of folders
// ---------------------------------------------------------------------------

const MAX_TRAVERSE_DEPTH = 8;

/** Recursively read all File entries from a DataTransferItemList (directories included). */
async function traverseEntry(entry: FileSystemEntry, depth = 0): Promise<File[]> {
  if (entry.isFile) {
    return new Promise<File[]>((resolve) => {
      (entry as FileSystemFileEntry).file(
        (f) => resolve([f]),
        () => resolve([]),
      );
    });
  }

  if (entry.isDirectory) {
    if (depth >= MAX_TRAVERSE_DEPTH) {
      console.warn(`traverseEntry: skipping deep subdirectory "${entry.fullPath}" (depth ${depth})`);
      return [new File(
        [],
        `__parse_warning__: directory "${entry.name}" skipped (max depth ${MAX_TRAVERSE_DEPTH} reached)`,
      )];
    }

    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const allFiles: File[] = [];

    // readEntries returns at most 100 entries per call; loop until empty.
    // The error callback resolves rather than rejects so we keep whatever
    // entries were already collected instead of silently hanging.
    const readAll = (): Promise<void> =>
      new Promise((resolve) => {
        const step = () => {
          reader.readEntries(
            async (entries) => {
              if (entries.length === 0) {
                resolve();
                return;
              }
              for (const child of entries) {
                const childFiles = await traverseEntry(child, depth + 1);
                allFiles.push(...childFiles);
              }
              step();
            },
            (err) => {
              console.warn("readEntries failed", err);
              resolve();
            },
          );
        };
        step();
      });

    await readAll();
    return allFiles;
  }

  return [];
}

async function getFilesFromDataTransfer(
  items: DataTransferItemList,
): Promise<File[]> {
  const files: File[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== "file") continue;

    // Prefer FileSystem API for directory traversal
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      const entryFiles = await traverseEntry(entry);
      files.push(...entryFiles);
    } else {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }

  return files;
}

// === App component ===

export default function App() {
  const [phase, dispatch] = useReducer(phaseReducer, { kind: "idle" });
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [sampleBusy, setSampleBusy] = useState(false);

  // Worker bridge for large files
  const { parse: workerParse } = useParseWorker();

  const handleFiles = useCallback(
    (provider: Provider, files: File[]) => {
      dispatch({ type: "FILES_DROPPED", provider });

      workerParse(files, provider, {
        onProgress: (parsed, total) => {
          dispatch({ type: "PARSE_PROGRESS", provider, parsed, total });
        },
        onResult: (stats) => {
          dispatch({ type: "PARSE_COMPLETE", provider, stats });
        },
        onError: (message) => {
          dispatch({ type: "PARSE_ERROR", provider, error: message });
        },
      });
    },
    [workerParse],
  );

  const handleSample = useCallback(() => {
    if (sampleBusy) return;
    setSampleBusy(true);
    setDateRange(null);
    window.setTimeout(() => {
      dispatch({
        type: "ENTER_DECK",
        stats: sampleMergedStats,
        allStats: [sampleMergedStats],
      });
      setSampleBusy(false);
    }, 500);
  }, [sampleBusy]);

  // Stable callbacks — dispatch from useReducer is already stable, so these
  // never change identity between renders and avoid re-memoising buildSlides.
  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
    setDateRange(null);
  }, []);
  const handleToggleScroll = useCallback(() => dispatch({ type: "TOGGLE_SCROLL" }), []);

  // --- Filtered stats: apply dateRange at the single choke point --------
  const filteredStats = useMemo(() => {
    if (phase.kind !== "deck") return null;
    if (!dateRange) return phase.stats;
    return filterStatsByRange(phase.stats, dateRange.start, dateRange.end);
  }, [phase, dateRange]);

  const filteredAllStats = useMemo(() => {
    if (phase.kind !== "deck") return null;
    if (!dateRange) return phase.allStats;
    return phase.allStats.map((s) =>
      filterStatsByRange(s, dateRange.start, dateRange.end),
    );
  }, [phase, dateRange]);

  // --- Deck mode ---
  if (phase.kind === "deck" && filteredStats && filteredAllStats) {
    return (
      <div className="fixed inset-0" style={{ background: "var(--aw-paper)" }}>
        {phase.mode === "present" ? (
          <DeckController
            stats={filteredStats}
            allStats={filteredAllStats}
            onReset={handleReset}
            onToggleScroll={handleToggleScroll}
          />
        ) : (
          <ScrollMode
            stats={filteredStats}
            allStats={filteredAllStats}
            onReset={handleReset}
            onSwitchToPresent={handleToggleScroll}
          />
        )}
      </div>
    );
  }

  const importingView = phase.kind === "importing" ? phase.view : "merged";

  // Derive the data range from all loaded stats (for populating the year selector).
  const loadedDataRange = useMemo((): { start: string; end: string } | null => {
    if (phase.kind !== "importing") return null;
    const done = phase.providers.filter((p) => p.status === "done" && p.stats);
    if (done.length === 0) return null;
    const starts = done.map((p) => p.stats!.range.start).sort();
    const ends = done.map((p) => p.stats!.range.end).sort();
    return { start: starts[0], end: ends[ends.length - 1] };
  }, [phase]);

  // --- Landing + import ---
  return (
    <div className="relative min-h-full" style={{ color: "var(--aw-ink)" }}>
      {/* Atmospheric backdrop */}
      <div className="aw-backdrop" aria-hidden="true" />
      <div className="aw-grain" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 sm:py-20">
        {/* Hero */}
        <LandingHero
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          dataRange={loadedDataRange}
          onTrySample={handleSample}
          sampleBusy={sampleBusy}
        />

        {/* Import status */}
        {phase.kind === "importing" && (
          <div className="aw-rise mb-8" style={{ animationDelay: "60ms" }}>
            <ImportPanel
              states={phase.providers}
              view={importingView}
              onViewChange={(v) => dispatch({ type: "SET_VIEW", view: v })}
              onStartDeck={() => dispatch({ type: "START_DECK" })}
              canStartDeck={phase.providers.some((p) => p.status === "done")}
            />
          </div>
        )}

        {/* Provider grid */}
        <div className="aw-rise mb-8" style={{ animationDelay: "120ms" }}>
          <ProviderGrid onFiles={handleFiles} />
        </div>

        {/* Global drop zone — with real auto-detect + directory traversal */}
        <div className="aw-rise mb-16" style={{ animationDelay: "200ms" }}>
          <DropZoneGlobal
            onFiles={handleFiles}
            onFilesFromTransfer={getFilesFromDataTransfer}
          />
        </div>

        {/* Footer */}
        <footer
          className="border-t pt-6 text-center text-xs"
          style={{ borderColor: "var(--aw-hairline)", color: "var(--aw-ink-mute)" }}
        >
          <a
            href="https://github.com/CodingFreeze/ClaudeWrapped"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: "var(--aw-ink-soft)" }}
          >
            GitHub — CodingFreeze/ClaudeWrapped
          </a>
          <span className="mx-2" aria-hidden="true">·</span>
          Parsed entirely on-device. Nothing is uploaded, stored, or sent anywhere.
        </footer>
      </div>
    </div>
  );
}
