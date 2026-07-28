import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Delayed hover state for the count popovers, matching the interaction in
 * Card/index.tsx: a 300ms dwell before showing, instant hide on leave.
 *
 * `compute` runs once the dwell elapses and returns whatever the caller needs
 * to render (positions, counts, ...), or null to show nothing.
 */
export const useHoverPopover = <T,>(compute: () => T | null, delay = 300) => {
  const [popover, setPopover] = useState<T | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const computeRef = useRef(compute);
  computeRef.current = compute;

  const onMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = setTimeout(() => {
      setPopover(computeRef.current());
    }, delay);
  }, [delay]);

  const onMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setPopover(null);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  return { popover, onMouseEnter, onMouseLeave };
};

const POPOVER_WIDTH = 250;
const SPACING = 12;

/** Places a popover to the left of `rect` (decks hug the right edge), clamped. */
export const positionBeside = (rect: DOMRect, estimatedHeight: number) => {
  let x = rect.left - POPOVER_WIDTH - SPACING;
  if (x < 8) {
    x = rect.right + SPACING;
  }
  if (x + POPOVER_WIDTH > window.innerWidth - 8) {
    x = window.innerWidth - 8 - POPOVER_WIDTH;
  }
  if (x < 8) x = 8;

  let y = rect.top + rect.height / 2 - estimatedHeight / 2;
  if (y + estimatedHeight > window.innerHeight - 8) {
    y = window.innerHeight - 8 - estimatedHeight;
  }
  if (y < 8) y = 8;

  return { x, y };
};

/** Centers a popover horizontally on `rect`, above or below it, clamped. */
export const positionCentered = (
  rect: DOMRect,
  estimatedHeight: number,
  side: "above" | "below",
) => {
  let x = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  if (x + POPOVER_WIDTH > window.innerWidth - 8) {
    x = window.innerWidth - 8 - POPOVER_WIDTH;
  }
  if (x < 8) x = 8;

  let y =
    side === "above"
      ? rect.top - estimatedHeight - SPACING
      : rect.bottom + SPACING;
  if (y + estimatedHeight > window.innerHeight - 8) {
    y = window.innerHeight - 8 - estimatedHeight;
  }
  if (y < 8) y = 8;

  return { x, y };
};

/** Rough on-screen height of a single CountPopover (title + count row). */
export const COUNT_POPOVER_HEIGHT = 70;
