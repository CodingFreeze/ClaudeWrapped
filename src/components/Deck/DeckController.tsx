// ---------------------------------------------------------------------------
// DeckController — present-mode fullscreen deck shell.
// Keyboard nav, tap zones, progress indicator.
// ---------------------------------------------------------------------------

import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DeckProgress } from "./DeckProgress";
import { SlideIntro } from "./slides/SlideIntro";
import { SlideTotals } from "./slides/SlideTotals";
import { SlideBusiestMonth } from "./slides/SlideBusiestMonth";
import { SlideBusiestDay } from "./slides/SlideBusiestDay";
import { SlideModelBreakdown } from "./slides/SlideModelBreakdown";
import { SlideTokens } from "./slides/SlideTokens";
import { SlideRhythm } from "./slides/SlideRhythm";
import { SlideProviderSplit } from "./slides/SlideProviderSplit";
import { SlideCodingVsChat } from "./slides/SlideCodingVsChat";
import { SlideShare } from "./slides/SlideShare";
import type { WrappedStats } from "../../lib/types";
import { useDeckState } from "../../hooks/useDeckState";

const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;
const springSnappy = { type: "spring", stiffness: 400, damping: 30 } as const;

interface DeckControllerProps {
  stats: WrappedStats;
  allStats: WrappedStats[];
  onReset: () => void;
  onToggleScroll: () => void;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function ScrollDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </svg>
  );
}

type SlideEntry = { id: string; node: React.ReactNode };

/** Build the slide list, filtering out slides that have no data. */
function buildSlides(stats: WrappedStats, allStats: WrappedStats[], onReset: () => void): SlideEntry[] {
  return [
    { id: "intro", node: <SlideIntro stats={stats} isVisible={true} /> },
    { id: "totals", node: <SlideTotals stats={stats} isVisible={true} /> },
    ...(stats.monthlySeries.length > 0
      ? [{ id: "busiest-month", node: <SlideBusiestMonth stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.streak
      ? [{ id: "busiest-day", node: <SlideBusiestDay stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.modelBreakdown && stats.modelBreakdown.length >= 2
      ? [{ id: "models", node: <SlideModelBreakdown stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.tokenUsage
      ? [{ id: "tokens", node: <SlideTokens stats={stats} isVisible={true} /> }]
      : []),
    ...(allStats.length >= 2
      ? [{ id: "provider-split", node: <SlideProviderSplit allStats={allStats} isVisible={true} /> }]
      : []),
    ...(stats.codingStats && stats.codingStats.topProjects.length >= 3
      ? [{ id: "coding", node: <SlideCodingVsChat stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.hourHistogram
      ? [{ id: "rhythm", node: <SlideRhythm stats={stats} isVisible={true} /> }]
      : []),
    { id: "share", node: <SlideShare stats={stats} isVisible={true} onReset={onReset} /> },
  ];
}

export function DeckController({ stats, allStats, onReset, onToggleScroll }: DeckControllerProps) {
  const slides = buildSlides(stats, allStats, onReset);
  const deck = useDeckState(slides.length);

  // Keyboard navigation
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        deck.next();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        deck.prev();
      }
      if (e.key === "Escape") {
        onReset();
      }
    },
    [deck, onReset],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const width = e.currentTarget.clientWidth;
    if (e.clientX < width / 2) {
      deck.prev();
    } else {
      deck.next();
    }
  }

  const currentSlide = slides[deck.slide];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--aw-paper)" }}
      role="region"
      aria-label="AI Wrapped deck"
    >
      {/* Progress hairline */}
      <DeckProgress current={deck.slide} total={deck.total} />

      {/* Top controls */}
      <div className="absolute left-4 top-4 z-30 flex items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:border-[var(--aw-coral)] hover:text-[var(--aw-coral)]"
          style={{ borderColor: "var(--aw-hairline)", color: "var(--aw-ink-mute)" }}
          aria-label="Exit deck"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Slide counter */}
      <div
        className="absolute right-4 top-4 z-30 font-stat text-xs"
        style={{ color: "var(--aw-ink-mute)" }}
        aria-label={`Slide ${deck.slide + 1} of ${deck.total}`}
      >
        {deck.slide + 1} / {deck.total}
      </div>

      {/* Tap zones + slide content */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleTap}
        aria-hidden="true"
      />

      {/* Slide content */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            className="h-full w-full"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={springRelaxed}
          >
            {currentSlide.node}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Scroll-instead button */}
      <motion.button
        type="button"
        onClick={onToggleScroll}
        className="absolute bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium pointer-events-auto"
        style={{
          borderColor: "var(--aw-hairline)",
          color: "var(--aw-ink-mute)",
          background: "var(--aw-surface)",
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSnappy, delay: 0.5 }}
        aria-label="Switch to scroll mode"
      >
        <ScrollDownIcon />
        Scroll instead
      </motion.button>

      {/* Prev/next hint arrows at sides */}
      {deck.slide > 0 && (
        <button
          type="button"
          onClick={deck.prev}
          className="absolute left-2 top-1/2 z-30 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border opacity-40 hover:opacity-80 transition-opacity"
          style={{ borderColor: "var(--aw-hairline)", color: "var(--aw-ink)" }}
          aria-label="Previous slide"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}
      {deck.slide < deck.total - 1 && (
        <button
          type="button"
          onClick={deck.next}
          className="absolute right-2 top-1/2 z-30 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border opacity-40 hover:opacity-80 transition-opacity"
          style={{ borderColor: "var(--aw-hairline)", color: "var(--aw-ink)" }}
          aria-label="Next slide"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}
    </div>
  );
}
