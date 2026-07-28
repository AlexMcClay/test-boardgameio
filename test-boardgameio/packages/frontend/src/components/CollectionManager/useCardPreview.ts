import { useEffect, useRef, useState } from "react";
import type { Card as CardType } from "@project/shared";

export interface PopoverPosition {
  x: number;
  y: number;
}

/**
 * Positions the singleton card-preview popover that appears to the LEFT of a
 * hovered deck-list row, and the mana-curve popover left of the deck widget.
 *
 * The maths depends on the popover's own scale, so it lives next to the
 * component that renders it rather than in a generic hook.
 */
export function useCardPreview(active: boolean) {
  const [hoveredCard, setHoveredCard] = useState<CardType | null>(null);
  const [popoverPosition, setPopoverPosition] =
    useState<PopoverPosition | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showManaCurve, setShowManaCurve] = useState(false);
  const [manaCurvePosition, setManaCurvePosition] =
    useState<PopoverPosition | null>(null);

  function clearHoverTimer() {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  function handleEntryMouseEnter(
    e: React.MouseEvent<HTMLDivElement>,
    card: CardType,
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    clearHoverTimer();

    hoverTimerRef.current = setTimeout(() => {
      // Card base width is 7.8vw and the popover scales it 200%
      // (origin-left horizontally, center vertically).
      const baseWidth = window.innerWidth * 0.078;
      const baseHeight = baseWidth * (7 / 5); // Card aspect ratio is 5/7
      const scaledWidth = baseWidth * 2;
      const spacing = 16;

      let x = rect.left - scaledWidth - spacing;
      if (x < 8) x = 8;

      // With scale-200 and a centred vertical origin the card extends
      // baseHeight above and below the positioned Y.
      let y = rect.top + rect.height / 2;
      const minY = 8 + baseHeight;
      const maxY = window.innerHeight - 8 - baseHeight * 2;
      if (y < minY) y = minY;
      if (y > maxY) y = maxY;

      setPopoverPosition({ x, y });
      setHoveredCard(card);
    }, 0);
  }

  function handleEntryMouseLeave() {
    clearHoverTimer();
    setHoveredCard(null);
  }

  function handleDeckMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = window.innerWidth * 0.24; // matches ManaCurvePopover
    const spacing = 16;

    let x = rect.left - popoverWidth - spacing;
    if (x < 8) x = 8;

    setManaCurvePosition({ x, y: rect.top });
    setShowManaCurve(true);
  }

  function handleDeckMouseLeave() {
    setShowManaCurve(false);
  }

  // Clean up on unmount so a pending timer can't fire into a dead component.
  useEffect(() => clearHoverTimer, []);

  // Hide the preview whenever the editor closes.
  useEffect(() => {
    if (!active) {
      setHoveredCard(null);
      setShowManaCurve(false);
      clearHoverTimer();
    }
  }, [active]);

  return {
    hoveredCard,
    popoverPosition,
    showManaCurve,
    manaCurvePosition,
    handleEntryMouseEnter,
    handleEntryMouseLeave,
    handleDeckMouseEnter,
    handleDeckMouseLeave,
  };
}
