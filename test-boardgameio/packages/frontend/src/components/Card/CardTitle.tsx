import { useId, useLayoutEffect, useRef, useState } from "react";

export type CardTitleVariant = "minion" | "spell" | "weapon";

/**
 * Everything below is in viewBox user units, not pixels. That is the whole
 * point: the SVG carries a viewBox and no intrinsic size, so it fills its
 * vw-sized parent and stays sharp under any ancestor `transform: scale()`.
 */
const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 44;

/**
 * The size short titles render at. Fitting only ever shrinks from here — it
 * never enlarges — so this is the visual ceiling, not a starting guess.
 */
const BASE_FONT_SIZE = 17;
/** Below this the title is unreadable anyway; let it overflow instead. */
const MIN_FONT_SIZE = 7;
/** Leave a little air at both ends of the path. */
const FILL_RATIO = 0.92;

const PATHS: Record<CardTitleVariant, string> = {
  // A sideways S, not an arch: the control points sit on opposite sides of the
  // line, which is what gives the curve its two bends — up out of the left end,
  // back down through the middle, up again into the right end.
  minion: "M 4 30 C 40 45, 142 -4, 196 34",
  // A single upward arch, the same read as the old canvas version.
  spell: "M 6 34 Q 100 8 194 34",
  weapon: "M 0 26 H 200",
};

/**
 * Fitted font sizes, keyed by variant + title. Measuring in user units means
 * the answer is viewport-independent — measure once and it is correct at every
 * size, forever — so the cache is safe to share across every mounted card.
 */
const fitCache = new Map<string, number>();

/**
 * The title font is a remote CDN TTF with `font-display: swap`, so the first
 * measurement can land on the fallback and come out wrong. Tracked app-wide so
 * the re-measure happens once, not once per card.
 */
let fontReady = typeof document === "undefined" || !document.fonts;
if (!fontReady) {
  document.fonts.ready.then(() => {
    fontReady = true;
    // Anything measured against the fallback is now stale.
    fitCache.clear();
  });
}

interface Props {
  title: string;
  variant: CardTitleVariant;
}

/** The card's name, set along a curve that depends on the card type. */
const CardTitle = ({ title, variant }: Props) => {
  // The same card can be on the board, in a popover and in the zoom modal at
  // once, so each instance needs its own path id. useId's colons are legal in a
  // URL fragment but not in a CSS selector — strip them and keep it portable.
  const pathId = `card-title-${useId().replace(/:/g, "")}`;
  const textRef = useRef<SVGTextElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  const cacheKey = `${variant}|${title}`;
  const [fontSize, setFontSize] = useState(
    () => fitCache.get(cacheKey) ?? BASE_FONT_SIZE,
  );

  useLayoutEffect(() => {
    const cached = fitCache.get(cacheKey);
    if (cached !== undefined) {
      setFontSize(cached);
      return;
    }

    let cancelled = false;

    function fit() {
      const text = textRef.current;
      const path = pathRef.current;
      if (cancelled || !text || !path) return;

      // Measure at the base size regardless of what is currently applied, so
      // the ratio below is always against a known quantity.
      text.style.fontSize = `${BASE_FONT_SIZE}px`;
      const measured = text.getComputedTextLength();
      const available = path.getTotalLength() * FILL_RATIO;
      text.style.fontSize = "";

      const size =
        measured > available
          ? Math.max(MIN_FONT_SIZE, (BASE_FONT_SIZE * available) / measured)
          : BASE_FONT_SIZE;

      if (fontReady) fitCache.set(cacheKey, size);
      setFontSize(size);
    }

    fit();
    // Re-fit once the real font arrives; the first pass measured the fallback.
    if (!fontReady) document.fonts.ready.then(fit);

    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-9/10 h-full overflow-visible select-none pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <path id={pathId} ref={pathRef} d={PATHS[variant]} fill="none" />
      </defs>

      <text
        ref={textRef}
        fill="#fff"
        stroke="#000"
        // paintOrder keeps the outline behind the glyphs and, unlike an SVG
        // filter, costs nothing to re-rasterise while a card is animating.
        paintOrder="stroke"
        strokeWidth={fontSize * 0.22}
        strokeLinejoin="round"
        style={{
          // Only weight 400 of this face exists — asking for bolder would get
          // a synthesised fake bold.
          fontFamily: '"belwe bold bt", serif',
          fontWeight: 400,
          fontSize: `${fontSize}px`,
          // In em, not user units, so it tracks whatever size the fit lands on
          // and is already baked into getComputedTextLength when measuring.
          letterSpacing: "0.045em",
        }}
      >
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {title}
        </textPath>
      </text>
    </svg>
  );
};

export default CardTitle;
