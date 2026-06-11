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
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFont);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const testDiv = document.createElement("div");
    const computedStyle = getComputedStyle(container);

    // Copy styles for accurate measurement
    testDiv.style.position = "absolute";
    testDiv.style.visibility = "hidden";
    testDiv.style.whiteSpace = "normal"; // allow wrapping
    testDiv.style.wordBreak = "break-word";
    testDiv.style.padding = computedStyle.padding;
    testDiv.style.width = `${container.offsetWidth}px`;
    testDiv.style.fontFamily = computedStyle.fontFamily;
    testDiv.style.fontWeight = computedStyle.fontWeight;
    testDiv.style.lineHeight = computedStyle.lineHeight;

    document.body.appendChild(testDiv);

    let low = minFont;
    let high = maxFont;
    let best = minFont;

    while (high - low > precision) {
      const mid = (low + high) / 2;
      testDiv.style.fontSize = `${mid}rem`;
      testDiv.innerText = text;

      if (
        testDiv.scrollWidth <= container.offsetWidth &&
        testDiv.scrollHeight <= container.offsetHeight
      ) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    setFontSize(parseFloat(best.toFixed(3)));
    document.body.removeChild(testDiv);
  }, [text, maxFont, minFont, precision, ...listen]);

  return { fontSize, containerRef };
}

export function useArchedText(
  text: string,
  fontSize: number,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerWidth: number,
) {
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text) return;

    fontSize = fontSize * 0.9;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size based on container
    const dpr = 2;
    const width = containerWidth;
    const height = 40; // Fixed height for title area

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Set font and styling
    const fontSizeInPx = fontSize * 16; // Convert rem to px (assuming 1rem = 16px)
    ctx.font = `900 ${fontSizeInPx}px serif`; // 900 is extrabold
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Calculate total text width
    const textWidth = ctx.measureText(text).width;

    // Calculate arc parameters - subtle arch
    const arcAngle = Math.PI / (text.length > 10 ? 6 : 8); // ~20 degrees total arc (10 degrees each side)
    const radius = textWidth / (2 * Math.sin(arcAngle / 2)); // Calculate radius based on text width

    // Starting position
    const centerX = width / 2;
    const centerY = height / 2 + radius - fontSizeInPx / 3; // Adjust vertical position

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
  }, [text, fontSize, canvasRef, containerWidth]);
}
