import { useFitText } from "@/hooks";
import React from "react";

const cardBack = "src/assets/Card_Back.png";
const mana_crystal = "src/assets/mana.png";
const attackIcon = "src/assets/attack.png";
const healthIcon = "src/assets/health.png";

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
  back?: boolean;
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
  back = false,
}: Props) => {
  const { fontSize, containerRef } = useFitText(title, 1, 0.1); // You can lower minFont further if needed

  if (back) {
    return (
      <div className="w-[150px] relative aspect-[5/7] bg-[#37373b] rounded-2xl flex-col flex gap-1 items-center shadow-xl overflow-hidden">
        <img
          src={cardBack}
          alt="Card Back"
          className="object-cover w-full h-full "
          draggable="false"
        />
      </div>
    );
  }

  return (
    <div className="w-[150px] relative aspect-[5/7] bg-[#37373b] rounded-2xl border-4 border-[#54412e] flex-col flex gap-1 items-center shadow-xl text-white font-serif">
      {/* Mana Crystal */}
      <div className=" select-none absolute text-lg top-[-1rem] left-[-1rem]  w-8 h-8 flex items-center justify-center font-bold  shadow-md z-10">
        <img
          src={mana_crystal}
          alt="Card Back"
          className="object-cover w-full h-full absolute scale-130"
          // no drag
          draggable="false"
        />
        <span className="relative z-20">{mana}</span>
      </div>

      {/* Art */}
      <div className="h-[45%] rounded-t-2xl bg-black overflow-hidden w-full">
        <img
          src={""}
          // alt={title}
          className="object-cover w-full h-full select-none"
          draggable="false"
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
          className=" select-none inline-block align-middle whitespace-nowrap overflow-hidden text-ellipsis"
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
      <div className="select-none text-xs w-full text-black px-3 py-2 grow mb-1 bg-[#a58f79] border-2 border-[#f1ce8d] text-center font-medium">
        {description}
      </div>

      {/* Type */}
      {type && (
        <div className="absolute select-none -bottom-2 text-sm w-fit px-6 text-center font-extrabold text-white shadow-md rounded bg-[#f1ce8d]">
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
            <div className="absolute -left-1 -bottom-1  rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow-lg">
              <img
                src={attackIcon}
                alt="Card Back"
                className="object-cover w-full h-full absolute scale-130 -left-1 bottom-1"
                // no drag
                draggable="false"
              />
              <span
                style={{
                  WebkitTextStroke: "0.5px black",
                  textShadow: "0 1px 0px black",
                }}
                className="absolute"
              >
                {attack}
              </span>
            </div>
          )}
          {health !== undefined && (
            <div className="absolute right-[-1rem] -bottom-1 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold  shadow-lg">
              <img
                src={healthIcon}
                alt="Card Back"
                className=" object-contain w-full h-full absolute scale-130  bottom-1"
                // no drag
                draggable="false"
              />
              <span
                style={{
                  WebkitTextStroke: "0.5px black",
                  textShadow: "0 1px 0px black",
                }}
                className="absolute"
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
