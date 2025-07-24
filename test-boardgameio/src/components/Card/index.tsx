import React, { useRef, useLayoutEffect, useState } from "react";

type Props = {
  id: string;
  title?: string;
  description?: string;
  mana?: number;
  attack?: number;
  health?: number;
  type?: string;
  imageUrl?: string;
  scale?: number;
};

export function useFitText(
  text: string,
  maxFont = 1.2,
  minFont = 0.3,
  precision = 0.01
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
  }, [text, maxFont, minFont, precision]);

  return { fontSize, containerRef };
}

const Card = ({
  id,
  title = "Card Title",
  description = "Card effect or description goes here.",
  mana = 0,
  attack,
  health,
  type = "Neutral",
  imageUrl = "https://via.placeholder.com/300x200",
}: Props) => {
  const { fontSize, containerRef } = useFitText(title, 1, 0.1); // You can lower minFont further if needed
  return (
    <div className="w-[150px] relative aspect-[5/7] bg-[#37373b] rounded-2xl border-4 border-[#54412e] flex-col flex gap-1 items-center shadow-xl text-white font-serif">
      {/* Mana Crystal */}
      <div className="absolute text-lg top-[-1rem] left-[-1rem] bg-blue-700 rounded-full w-10 h-10 flex items-center justify-center font-bold border-2 border-blue-300 shadow-md z-10">
        {mana}
      </div>

      {/* Art */}
      <div className="h-[45%] rounded-t-2xl bg-black overflow-hidden w-full">
        <img
          // src={imageUrl}
          // alt={title}
          className="object-cover w-full h-full"
        />
      </div>

      {/* Title */}
      <div
        ref={containerRef}
        className="text-center w-full font-extrabold text-white py-1 bg-[#f1ce8d] inset-shadow-sm inset-shadow-black overflow-hidden whitespace-nowrap px-2"
        title={title}
        style={{
          fontSize: `${fontSize}rem`,
          minHeight: "2rem",
          overflow: "hidden",
        }}
      >
        <span
          className="inline-block align-middle whitespace-nowrap overflow-hidden text-ellipsis"
          style={{
            WebkitTextStroke: "0.5px black",
            textShadow: "0 1px 0px black",
            maxWidth: "100%",
            fontSize: `${fontSize}rem`,
            lineHeight: "1.2",
          }}
        >
          {title}
        </span>
      </div>
      {/* Description */}
      <div className="text-xs w-full text-black px-3 py-2 grow mb-1 bg-[#a58f79] border-2 border-[#f1ce8d] text-center font-medium">
        {description}
      </div>

      {/* Type */}
      {type && (
        <div className="absolute -bottom-2 text-sm w-fit px-6 text-center font-extrabold text-white shadow-md rounded bg-[#f1ce8d]">
          <span
            style={{
              WebkitTextStroke: "0.5px black",
              textShadow: "0 1px 0px black",
            }}
          >
            {type}
          </span>
        </div>
      )}

      {/* Attack & Health */}
      {(attack !== undefined || health !== undefined) && (
        <>
          {attack !== undefined && (
            <div className="absolute -left-4 bottom-0 bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold border-2 border-[#37373b] shadow-lg">
              <span
                style={{
                  WebkitTextStroke: "0.5px black",
                  textShadow: "0 1px 0px black",
                }}
              >
                {attack}
              </span>
            </div>
          )}
          {health !== undefined && (
            <div className="absolute right-[-1rem] bottom-0 bg-red-600 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold border-2 border-[#37373b] shadow-lg">
              <span
                style={{
                  WebkitTextStroke: "0.5px black",
                  textShadow: "0 1px 0px black",
                }}
              >
                {health}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Card;
