import React, {
  type DependencyList,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export function useFitText(
  text: string,
  maxFont = 1.2,
  minFont = 0.3,
  precision = 0.01,
  listen: DependencyList = [],
  archCompensation = 0.82, // Reduce available width by 18% to account for arched text
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFont);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const testDiv = document.createElement("div");
    const computedStyle = getComputedStyle(container);

    // Get actual container dimensions
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // Apply arch compensation - reduce available width for curved text
    const effectiveWidth = containerWidth * archCompensation;

    // Copy styles for accurate measurement
    testDiv.style.position = "absolute";
    testDiv.style.visibility = "hidden";
    testDiv.style.whiteSpace = "nowrap"; // Single line for title
    testDiv.style.padding = computedStyle.padding;
    testDiv.style.width = `${effectiveWidth}px`;
    testDiv.style.fontFamily = computedStyle.fontFamily;
    testDiv.style.fontWeight = computedStyle.fontWeight;
    testDiv.style.lineHeight = computedStyle.lineHeight;

    document.body.appendChild(testDiv);

    // Calculate font size limits based on container height (viewport-scaled)
    // This ensures consistent sizing across different resolutions
    const maxFontPx = containerHeight * maxFont;
    const minFontPx = containerHeight * minFont;
    const precisionPx = 0.5; // Use fixed precision in pixels

    let low = minFontPx;
    let high = maxFontPx;
    let best = minFontPx;

    while (high - low > precisionPx) {
      const mid = (low + high) / 2;
      testDiv.style.fontSize = `${mid}px`;
      testDiv.innerText = text;

      if (
        testDiv.scrollWidth <= effectiveWidth &&
        testDiv.scrollHeight <= containerHeight
      ) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    setFontSize(parseFloat(best.toFixed(3)));
    document.body.removeChild(testDiv);
  }, [text, maxFont, minFont, precision, archCompensation, ...listen]);

  return { fontSize, containerRef };
}

export function useArchedText(
  text: string,
  fontSize: number,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLElement | null>,
  type: "minion" | "weapon" | "spell" = "spell",
) {
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !text || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get actual container width from the DOM (accounts for viewport scaling)
    const containerWidth = container.offsetWidth;
    const fontSizeInPx = fontSize * 0.9; // fontSize is already in pixels

    // Set canvas size based on actual container dimensions
    // Height is taken from the canvas's own parent so it tracks the
    // viewport-scaled title area instead of a fixed pixel value.
    const dpr = 2;
    const width = containerWidth;
    const height = canvas.parentElement?.offsetHeight || fontSizeInPx * 1.5;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Set font and styling - fontSize is already in pixels
    ctx.font = `900 ${fontSizeInPx}px serif`; // 900 is extrabold
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Weapons render flat, centered text instead of an arch
    if (type === "weapon") {
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.strokeStyle = "black";
      ctx.lineWidth = 2.5;
      ctx.strokeText(text, centerX, centerY);

      ctx.fillStyle = "white";
      ctx.fillText(text, centerX, centerY);
      return;
    }

    // Calculate total text width
    const textWidth = ctx.measureText(text).width;

    // Calculate arc parameters - subtle arch
    const arcAngle =
      Math.PI /
      (type === "spell"
        ? text.length > 10
          ? 6
          : 8
        : text.length > 10
          ? 12
          : 16); // ~20 degrees total arc (10 degrees each side)
    const radius = textWidth / (2 * Math.sin(arcAngle / 2)); // Calculate radius based on text width

    // Starting position
    const centerX = width / 2;
    const centerY =
      height / 2 +
      radius -
      fontSizeInPx / 3 +
      (type == "spell" || type === "minion" ? height * 0.07 : 0); // Adjust vertical position

    // Calculate individual character widths and positions
    const chars = text.split("");
    const charWidths = chars.map((char) => ctx.measureText(char).width);
    const totalWidth = charWidths.reduce((sum, w) => sum + w, 0);

    // Starting angle (left side of arc)
    let currentAngle = -arcAngle / 2;
    const angleStep = arcAngle / totalWidth;

    // Draw each character along the arc
    chars.forEach((char, i) => {
      const charWidth = charWidths[i];
      const charAngle = currentAngle + (angleStep * charWidth) / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(charAngle);
      ctx.translate(0, -radius);

      // Draw text stroke (black outline)
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2.5;
      ctx.strokeText(char, 0, 0);

      // Draw text fill (white)
      ctx.fillStyle = "white";
      ctx.fillText(char, 0, 0);

      ctx.restore();

      currentAngle += angleStep * charWidth;
    });
  }, [text, fontSize, canvasRef, containerRef]);
}

export * from "./gameHooks";
