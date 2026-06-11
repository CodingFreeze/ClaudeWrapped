// ---------------------------------------------------------------------------
// App.tsx — root state machine for the AI Wrapped experience.
// ---------------------------------------------------------------------------

import { useReducer, useCallback, useState } from "react";
import { LandingHero } from "./components/Landing/LandingHero";
import { ProviderGrid } from "./components/Landing/ProviderGrid";
import { DropZoneGlobal } from "./components/Landing/DropZoneGlobal";
import { ImportPanel } from "./components/Import/ImportPanel";
import { DeckController } from "./components/Deck/DeckController";
import { ScrollMode } from "./components/Deck/ScrollMode";
import { parseClaudeAiZipToStats } from "./lib/parsers/claudeAi";
import { parseChatGptExport } from "./lib/parsers/chatgpt";
import { aggregateStats } from "./lib/aggregate";
import { sampleMergedStats } from "./lib/sampleData";
import type {
  Provider,
  ProviderImportState,
  WrappedStats,
  AppView,
} from "./lib/types";

// === App state ===

type Phase =
  | { kind: "idle" }
  | { kind: "importing"; providers: ProviderImportState[] }
  | {
      kind: "deck";
      stats: WrappedStats;
      allStats: WrappedStats[];
      view: AppView;
      mode: "present" | "scroll";
    };

type PhaseAction =
  | { type: "FILES_DROPPED"; provider: Provider }
  | { type: "PARSE_COMPLETE"; provider: Provider; stats: WrappedStats }
  | { type: "PARSE_ERROR"; provider: Provider; error: string }
  | { type: "START_DECK" }
  | { type: "ENTER_DECK"; stats: WrappedStats; allStats: WrappedStats[] }
  | { type: "TOGGLE_SCROLL" }
  | { type: "RESET" };

function phaseReducer(state: Phase, action: PhaseAction): Phase {
  switch (action.type) {
    case "FILES_DROPPED": {
      if (state.kind === "idle") {
        return {
          kind: "importing",
          providers: [{ provider: action.provider, status: "parsing" }],
        };
      }
      if (state.kind === "importing") {
        const exists = state.providers.find((p) => p.provider === action.provider);
        if (exists) {
          return {
            ...state,
            providers: state.providers.map((p) =>
              p.provider === action.provider ? { ...p, status: "parsing" as const } : p,
            ),
          };
        }
        return {
          ...state,
          providers: [...state.providers, { provider: action.provider, status: "parsing" as const }],
        };
      }
      return state;
    }

    case "PARSE_COMPLETE": {
      if (state.kind !== "importing") return state;
      return {
        ...state,
        providers: state.providers.map((p) =>
          p.provider === action.provider
            ? { ...p, status: "done" as const, stats: action.stats }
            : p,
        ),
      };
    }

    case "PARSE_ERROR": {
      if (state.kind !== "importing") return state;
      return {
        ...state,
        providers: state.providers.map((p) =>
          p.provider === action.provider
            ? { ...p, status: "error" as const, error: action.error }
            : p,
        ),
      };
    }

    case "START_DECK": {
      if (state.kind !== "importing") return state;
      const doneStats = state.providers
        .filter((p) => p.status === "done" && p.stats)
        .map((p) => p.stats as WrappedStats);
      if (doneStats.length === 0) return state;
      const merged =
        doneStats.length === 1 ? doneStats[0] : aggregateStats(doneStats, "merged");
      return {
        kind: "deck",
        stats: merged,
        allStats: doneStats,
        view: "merged",
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

// === App component ===

export default function App() {
  const [phase, dispatch] = useReducer(phaseReducer, { kind: "idle" });
  const [selectedYear, setSelectedYear] = useState(2025);
  const [sampleBusy, setSampleBusy] = useState(false);

  const handleFiles = useCallback(
    async (provider: Provider, files: File[]) => {
      dispatch({ type: "FILES_DROPPED", provider });
      try {
        let stats: WrappedStats;
        if (provider === "claude-ai") {
          stats = await parseClaudeAiZipToStats(files[0]);
        } else if (provider === "chatgpt") {
          stats = await parseChatGptExport(files[0]);
        } else {
          throw new Error(`Parser for ${provider} is coming in P3.`);
        }
        dispatch({ type: "PARSE_COMPLETE", provider, stats });
      } catch (e) {
        dispatch({
          type: "PARSE_ERROR",
          provider,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [],
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
              view={"merged" as AppView}
              onViewChange={() => {/* view filtering wired in P3 */}}
              onStartDeck={() => dispatch({ type: "START_DECK" })}
              canStartDeck={phase.providers.some((p) => p.status === "done")}
            />
          </div>
        )}

        {/* Provider grid */}
        <div className="aw-rise mb-8" style={{ animationDelay: "120ms" }}>
          <ProviderGrid onFiles={handleFiles} />
        </div>

        {/* Global drop zone */}
        <div className="aw-rise mb-16" style={{ animationDelay: "200ms" }}>
          <DropZoneGlobal onFiles={handleFiles} />
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
