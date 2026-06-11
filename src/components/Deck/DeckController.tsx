// ---------------------------------------------------------------------------
// DeckController — present-mode fullscreen deck shell.
// P4: a11y (focus trap, ARIA live), touch swipe (Pointer Events), reduced-motion.
// ---------------------------------------------------------------------------

import { useEffect, useCallback, useRef, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import { SlideProjects } from "./slides/SlideProjects";
import { SlideTools } from "./slides/SlideTools";
import { SlideYourWords } from "./slides/SlideYourWords";
import { SlideModelWords } from "./slides/SlideModelWords";
import { SlideHighlights } from "./slides/SlideHighlights";
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

type SlideEntry = { id: string; label: string; node: React.ReactNode };

/** Build the slide list, filtering out slides that have no data. */
function buildSlides(
  stats: WrappedStats,
  allStats: WrappedStats[],
  onReset: () => void,
): SlideEntry[] {
  return [
    { id: "intro", label: "Your year in AI", node: <SlideIntro stats={stats} isVisible={true} /> },
    { id: "totals", label: "Total conversations and messages", node: <SlideTotals stats={stats} isVisible={true} /> },
    ...(stats.monthlySeries.length > 0
      ? [{ id: "busiest-month", label: "Busiest month", node: <SlideBusiestMonth stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.streak
      ? [{ id: "busiest-day", label: "Busiest day and streak", node: <SlideBusiestDay stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.modelBreakdown && stats.modelBreakdown.length >= 2
      ? [{ id: "models", label: "Model breakdown", node: <SlideModelBreakdown stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.tokenUsage
      ? [{ id: "tokens", label: "Tokens and cost", node: <SlideTokens stats={stats} isVisible={true} /> }]
      : []),
    ...(allStats.length >= 2
      ? [{ id: "provider-split", label: "Provider breakdown", node: <SlideProviderSplit allStats={allStats} isVisible={true} /> }]
      : []),
    ...(stats.codingStats && stats.codingStats.topProjects.length >= 3
      ? [{ id: "coding", label: "Coding stats and top projects", node: <SlideCodingVsChat stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.projectStats && stats.projectStats.length > 0
      ? [{ id: "projects", label: "Where the work happened", node: <SlideProjects stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.toolStats && stats.toolStats.topTools.length > 0
      ? [{ id: "tools", label: "Your toolbelt", node: <SlideTools stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.hourHistogram
      ? [{ id: "rhythm", label: "Activity by hour", node: <SlideRhythm stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.wordStats && stats.wordStats.userTopWords.length > 0
      ? [{ id: "your-words", label: "Your vocabulary", node: <SlideYourWords stats={stats} isVisible={true} /> }]
      : []),
    ...(stats.wordStats && stats.wordStats.perModelTopWords.length > 0
      ? [{ id: "model-words", label: "What the models kept saying", node: <SlideModelWords stats={stats} isVisible={true} /> }]
      : []),
    ...(allStats.length >= 2
      ? [{ id: "highlights", label: "Per-provider highlights", node: <SlideHighlights allStats={allStats} isVisible={true} /> }]
      : []),
    { id: "share", label: "Share your wrapped", node: <SlideShare stats={stats} isVisible={true} onReset={onReset} /> },
  ];
}

// ---------------------------------------------------------------------------
// Focus trap: keep Tab cycling within the deck container
// ---------------------------------------------------------------------------

function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      const focusable = Array.from(
        el!.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => !node.closest('[aria-hidden="true"]'));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    el.addEventListener("keydown", handleTab as EventListener);
    return () => el.removeEventListener("keydown", handleTab as EventListener);
  }, [containerRef]);
}

// ---------------------------------------------------------------------------
// Touch swipe via Pointer Events
// ---------------------------------------------------------------------------

function useTouchSwipe(
  containerRef: React.RefObject<HTMLElement | null>,
  onNext: () => void,
  onPrev: () => void,
) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse") return; // mouse clicks handled separately
      startX.current = e.clientX;
      startY.current = e.clientY;
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerType === "mouse") return;
      if (startX.current === null || startY.current === null) return;

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      // Require horizontal swipe > 40px, dominant horizontal direction
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          onNext();
        } else {
          onPrev();
        }
      }

      startX.current = null;
      startY.current = null;
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [containerRef, onNext, onPrev]);
}

// ---------------------------------------------------------------------------
// DeckController
// ---------------------------------------------------------------------------

export function DeckController({ stats, allStats, onReset, onToggleScroll }: DeckControllerProps) {
  const slides = useMemo(
    () => buildSlides(stats, allStats, onReset),
    [stats, allStats, onReset],
  );
  const deck = useDeckState(slides.length);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Focus trap
  useFocusTrap(containerRef as React.RefObject<HTMLElement>);

  // Touch swipe
  useTouchSwipe(
    containerRef as React.RefObject<HTMLElement>,
    deck.next,
    deck.prev,
  );

  // Keyboard navigation
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // Handle keys when focus is inside the deck or nowhere in particular
      // (body). Only yield when an element outside the deck has focus.
      const active = document.activeElement;
      if (
        containerRef.current &&
        active &&
        active !== document.body &&
        !containerRef.current.contains(active)
      ) {
        return;
      }

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

  // Move focus into the deck on mount so keyboard navigation works immediately
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

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

  // Reduced motion: use simple opacity crossfade instead of spring + translate
  const slideTransition = prefersReducedMotion
    ? { duration: 0.15, ease: "linear" as const }
    : springRelaxed;

  const slideEnter = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 40 };

  const slideVisible = prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0 };

  const slideExit = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -40 };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="relative h-full w-full overflow-hidden outline-none"
      style={{ background: "var(--aw-paper)" }}
      role="region"
      aria-label="AI Wrapped deck"
    >
      {/* ARIA live region announces slide changes to screen readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Slide {deck.slide + 1} of {deck.total}: {currentSlide.label}
      </div>

      {/* Progress hairline */}
      <DeckProgress current={deck.slide} total={deck.total} />

      {/* Top controls */}
      <div className="absolute left-4 top-4 z-30 flex items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:border-[var(--aw-coral)] hover:text-[var(--aw-coral)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aw-coral)]"
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
        aria-hidden="true"
      >
        {deck.slide + 1} / {deck.total}
      </div>

      {/* Tap zones */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleTap}
        aria-hidden="true"
      />

      {/* Slide content */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        role="region"
        aria-label={currentSlide.label}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            className="h-full w-full"
            initial={slideEnter}
            animate={slideVisible}
            exit={slideExit}
            transition={slideTransition}
          >
            {currentSlide.node}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Scroll-instead button */}
      <motion.button
        type="button"
        onClick={onToggleScroll}
        className="absolute bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aw-coral)]"
        style={{
          borderColor: "var(--aw-hairline)",
          color: "var(--aw-ink-mute)",
          background: "var(--aw-surface)",
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0.15 } : { ...springSnappy, delay: 0.5 }}
        aria-label="Switch to scroll mode"
      >
        <ScrollDownIcon />
        Scroll instead
      </motion.button>

      {/* Prev/next arrows */}
      {deck.slide > 0 && (
        <button
          type="button"
          onClick={deck.prev}
          className="absolute left-2 top-1/2 z-30 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border opacity-40 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aw-coral)] focus-visible:opacity-100"
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
          className="absolute right-2 top-1/2 z-30 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border opacity-40 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aw-coral)] focus-visible:opacity-100"
          style={{ borderColor: "var(--aw-hairline)", color: "var(--aw-ink)" }}
          aria-label="Next slide"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}
    </div>
  );
}
