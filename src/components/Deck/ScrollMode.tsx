// ---------------------------------------------------------------------------
// ScrollMode — vertically stacked slides with IntersectionObserver reveals.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
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

const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface ScrollSectionProps {
  children: (visible: boolean) => React.ReactNode;
}

function ScrollSection({ children }: ScrollSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const enterAnim = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 };
  const visibleAnim = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
  const transition = prefersReducedMotion
    ? { duration: 0.15, ease: "linear" as const }
    : springRelaxed;

  return (
    <motion.section
      ref={ref}
      className="min-h-screen w-full"
      role="region"
      initial={enterAnim}
      animate={visible ? visibleAnim : enterAnim}
      transition={transition}
    >
      {children(visible)}
    </motion.section>
  );
}

interface ScrollModeProps {
  stats: WrappedStats;
  allStats: WrappedStats[];
  onReset: () => void;
  onSwitchToPresent: () => void;
}

export function ScrollMode({ stats, allStats, onReset, onSwitchToPresent }: ScrollModeProps) {
  return (
    <div
      className="relative min-h-screen w-full"
      style={{ background: "var(--aw-paper)" }}
    >
      {/* Sticky "Back to slides" pill */}
      <div className="sticky top-4 z-50 flex justify-end pr-4">
        <button
          type="button"
          onClick={onSwitchToPresent}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors hover:border-[var(--aw-coral)] hover:text-[var(--aw-coral)]"
          style={{
            borderColor: "var(--aw-hairline)",
            color: "var(--aw-ink-mute)",
            background: "oklch(24% 0.010 58 / 0.8)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="19 12 12 5 5 12"/>
          </svg>
          Back to slides
        </button>
      </div>

      <ScrollSection>
        {(v) => <SlideIntro stats={stats} isVisible={v} />}
      </ScrollSection>

      <ScrollSection>
        {(v) => <SlideTotals stats={stats} isVisible={v} />}
      </ScrollSection>

      {stats.monthlySeries.length > 0 && (
        <ScrollSection>
          {(v) => <SlideBusiestMonth stats={stats} isVisible={v} />}
        </ScrollSection>
      )}

      {stats.streak && (
        <ScrollSection>
          {(v) => <SlideBusiestDay stats={stats} isVisible={v} />}
        </ScrollSection>
      )}

      {stats.modelBreakdown && stats.modelBreakdown.length >= 2 && (
        <ScrollSection>
          {(v) => <SlideModelBreakdown stats={stats} isVisible={v} />}
        </ScrollSection>
      )}

      {stats.tokenUsage && (
        <ScrollSection>
          {(v) => <SlideTokens stats={stats} isVisible={v} />}
        </ScrollSection>
      )}

      {allStats.length >= 2 && (
        <ScrollSection>
          {(v) => <SlideProviderSplit allStats={allStats} isVisible={v} />}
        </ScrollSection>
      )}

      {stats.codingStats && stats.codingStats.topProjects.length >= 3 && (
        <ScrollSection>
          {(v) => <SlideCodingVsChat stats={stats} isVisible={v} />}
        </ScrollSection>
      )}

      {stats.projectStats && stats.projectStats.length > 0 && (
        <ScrollSection>
          {(v) => <SlideProjects stats={stats} isVisible={v} />}
        </ScrollSection>
      )}

      {stats.toolStats && stats.toolStats.topTools.length > 0 && (
        <ScrollSection>
          {(v) => <SlideTools stats={stats} isVisible={v} />}
        </ScrollSection>
      )}

      {stats.hourHistogram && (
        <ScrollSection>
          {(v) => <SlideRhythm stats={stats} isVisible={v} />}
        </ScrollSection>
      )}

      {stats.wordStats && stats.wordStats.userTopWords.length > 0 && (
        <ScrollSection>
          {(v) => <SlideYourWords stats={stats} isVisible={v} />}
        </ScrollSection>
      )}

      {stats.wordStats && stats.wordStats.perModelTopWords.length > 0 && (
        <ScrollSection>
          {(v) => <SlideModelWords stats={stats} isVisible={v} />}
        </ScrollSection>
      )}

      {allStats.length >= 2 && (
        <ScrollSection>
          {(v) => <SlideHighlights allStats={allStats} isVisible={v} />}
        </ScrollSection>
      )}

      <ScrollSection>
        {() => <SlideShare stats={stats} isVisible={true} onReset={onReset} />}
      </ScrollSection>
    </div>
  );
}
