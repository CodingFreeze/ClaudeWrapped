// ---------------------------------------------------------------------------
// App.tsx — root state machine for the AI Wrapped experience.
// P3: wires all parsers + Web Worker bridge into phase reducer.
// ---------------------------------------------------------------------------

import { useReducer, useCallback, useState, useRef } from "react";
import { LandingHero } from "./components/Landing/LandingHero";
import { ProviderGrid } from "./components/Landing/ProviderGrid";
import { DropZoneGlobal } from "./components/Landing/DropZoneGlobal";
import { ImportPanel } from "./components/Import/ImportPanel";
import { DeckController } from "./components/Deck/DeckController";
import { ScrollMode } from "./components/Deck/ScrollMode";
import { aggregateStats, filterCodingStats } from "./lib/aggregate";
import { sampleMergedStats } from "./lib/sampleData";
import { useParseWorker } from "./hooks/useParseWorker";
import type {
  Provider,
  ProviderImportState,
  WrappedStats,
  AppView,
} from "./lib/types";

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

/** Recursively read all File entries from a DataTransferItemList (directories included). */
async function traverseEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise<File[]>((resolve) => {
      (entry as FileSystemFileEntry).file(
        (f) => resolve([f]),
        () => resolve([]),
      );
    });
  }

  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const allFiles: File[] = [];

    // readEntries returns at most 100 entries per call; loop until empty
    const readAll = (): Promise<void> =>
      new Promise((resolve) => {
        const step = () => {
          reader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve();
              return;
            }
            for (const child of entries) {
              const childFiles = await traverseEntry(child);
              allFiles.push(...childFiles);
            }
            step();
          });
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
  const [selectedYear, setSelectedYear] = useState(2025);
  const [sampleBusy, setSampleBusy] = useState(false);

  // Worker bridge for large files
  const { parse: workerParse } = useParseWorker();

  // Track in-flight worker refs to allow cancellation
  const parseControllers = useRef<Map<Provider, AbortController>>(new Map());

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
    window.setTimeout(() => {
      dispatch({
        type: "ENTER_DECK",
        stats: sampleMergedStats,
        allStats: [sampleMergedStats],
      });
      setSampleBusy(false);
    }, 500);
  }, [sampleBusy]);

  // Avoid unused ref warning
  void parseControllers;

  // --- Deck mode ---
  if (phase.kind === "deck") {
    return (
      <div className="fixed inset-0" style={{ background: "var(--aw-paper)" }}>
        {phase.mode === "present" ? (
          <DeckController
            stats={phase.stats}
            allStats={phase.allStats}
            onReset={() => dispatch({ type: "RESET" })}
            onToggleScroll={() => dispatch({ type: "TOGGLE_SCROLL" })}
          />
        ) : (
          <ScrollMode
            stats={phase.stats}
            allStats={phase.allStats}
            onReset={() => dispatch({ type: "RESET" })}
            onSwitchToPresent={() => dispatch({ type: "TOGGLE_SCROLL" })}
          />
        )}
      </div>
    );
  }

  const importingView = phase.kind === "importing" ? phase.view : "merged";

  // --- Landing + import ---
  return (
    <div className="relative min-h-full" style={{ color: "var(--aw-ink)" }}>
      {/* Atmospheric backdrop */}
      <div className="aw-backdrop" aria-hidden="true" />
      <div className="aw-grain" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 sm:py-20">
        {/* Hero */}
        <LandingHero
          year={selectedYear}
          onYearChange={setSelectedYear}
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
