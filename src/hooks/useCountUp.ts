// ---------------------------------------------------------------------------
// Animated count-up hook using requestAnimationFrame.
// Spring-eased, respects prefers-reduced-motion.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";

const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

// Ease-out cubic approximation of cubic-bezier(0.16, 1, 0.3, 1)
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animate a number from 0 to `target` over `duration` ms.
 * Returns the current display value as an integer.
 */
export function useCountUp(
  target: number,
  duration = 1200,
  enabled = true,
): number {
  const [value, setValue] = useState(prefersReducedMotion || !enabled ? target : 0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (prefersReducedMotion || !enabled) {
      setValue(target);
      return;
    }
    setValue(0);
    let start: number | undefined;

    function step(ts: number) {
      if (start === undefined) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOut(progress) * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled]);

  return value;
}
