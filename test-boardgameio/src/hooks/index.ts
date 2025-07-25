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
