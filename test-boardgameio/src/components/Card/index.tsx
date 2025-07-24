import React, { useEffect, useState } from "react";

type Props = {
  id: string;
  title?: string;
  description?: string;
  mana?: number;
  attack?: number;
  health?: number;
  type?: string;
  imageUrl?: string;
  scale?: number; // Optional external scale control
};

const Card = ({
  id,
  title = "Card Title",
  description = "Card effect or description goes here.",
  mana = 0,
  attack,
  health,
  type = "Neutral",
  imageUrl = "https://via.placeholder.com/300x200",
  scale,
}: Props) => {
  const [localScale, setLocalScale] = useState(scale ?? 1);

  useEffect(() => {
    if (scale !== undefined) return;

    const handleResize = () => {
      const newScale = Math.min(
        window.innerWidth / 1600, // Adjust these numbers for optimal responsiveness
        window.innerHeight / 900
      );
      setLocalScale(newScale);
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial scale

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [scale]);

  return (
    <div
      style={{
        transform: `scale(${localScale})`,
        transformOrigin: "top left",
        width: `${150}px`,
      }}
      className="relative aspect-[5/7] bg-[#37373b] rounded-2xl border-4 border-[#54412e] flex-col flex gap-1 items-center shadow-xl text-white font-serif"
    >
      {/* Mana Crystal */}
      <div className="absolute text-lg top-[-1rem] left-[-1rem] bg-blue-700 rounded-full w-10 h-10 flex items-center justify-center font-bold border-2 border-blue-300 shadow-md z-10">
        {mana}
      </div>

      {/* Art */}
      <div className="h-[45%] rounded-t-2xl bg-black overflow-hidden w-full">
        <img src={""} alt={""} className="object-cover w-full h-full" />
      </div>

      {/* Title */}
      <div className="text-center w-full text-lg font-extrabold text-white py-1 bg-[#f1ce8d] inset-shadow-sm inset-shadow-black">
        <span
          style={{
            WebkitTextStroke: "0.5px black",
            textShadow: "0 1px 0px black",
          }}
        >
          {title}
        </span>
      </div>

      {/* Description */}
      <div className="text-sm text-black px-3 py-2 grow mb-1 bg-[#a58f79] border-2 border-[#f1ce8d] text-center font-medium">
        {description}
      </div>

      {/* Type */}
      {type && (
        <div className="absolute -bottom-2 text-sm w-fit px-12 text-center font-extrabold text-white shadow-md rounded bg-[#f1ce8d]">
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
