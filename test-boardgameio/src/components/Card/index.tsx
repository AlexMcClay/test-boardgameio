import { useFitText } from "@/hooks";
import type { CardProps } from "./types";
import { motion } from "motion/react";
import { twMerge } from "tailwind-merge";
import PlacedCard from "./PlacedCard";

const cardBack = "assets/Card_Back.png";
const mana_crystal = "assets/mana.png";
const attackIcon = "assets/attack.png";
const healthIcon = "assets/health.png";

interface Props extends CardProps {}

const Card = ({
  card,
  back = false,
  isDragging = false, // Default to false if not provided
  playerID,
  ctx,
}: Props) => {
  const { fontSize, containerRef } = useFitText(card.title, 1, 0.1); // You can lower minFont further if needed

  if (back) {
    return (
      <motion.div
        className="w-[150px] relative aspect-[5/7] bg-[#37373b] rounded-2xl flex-col flex gap-1 items-center shadow-xl overflow-hidden"
        layout
        layoutId={`card-${card.id}`}
      >
        <img
          src={cardBack}
          alt="Card Back"
          className="object-cover w-full h-full "
          draggable="false"
        />
      </motion.div>
    );
  }

  // Use PlacedCard component when card is on the board
  if (card.isPlaced) {
    return (
      <PlacedCard
        card={card}
        isDragging={isDragging}
        playerID={playerID}
        ctx={ctx}
      />
    );
  }

  return (
    <motion.div
      layout
      layoutId={`card-${card.id}`}
      transition={isDragging ? { duration: 0 } : undefined}
      className={twMerge(
        ` w-[150px] relative aspect-[5/7] bg-[#37373b] rounded-2xl border-4 border-[#54412e] flex-col flex gap-1 items-center shadow-xl text-white font-serif`,
        isDragging &&
          !card.isPlaced &&
          " ring-blue-500 ring-2 shadow-blue-400  shadow-[0px_0px_60px_rgba(0,0,0,0.5)] ",
        isDragging &&
          card.isPlaced &&
          "ring-green-500 ring-2 shadow-green-400  shadow-[0px_0px_60px_rgba(0,0,0,0.5)]",
        !card.hasAttacked &&
          card.isPlaced &&
          ctx.currentPlayer === playerID &&
          "ring-green-500 ring-2 shadow-green-400  shadow-[0px_0px_20px_rgba(0,0,0,0.5)]",
        card.taunt && "border-gray-500",
      )}
    >
      {/* Mana Crystal */}
      {card.mana !== null && card.mana !== undefined && (
        <div className=" select-none absolute text-lg top-[-1rem] left-[-1rem]  w-8 h-8 flex items-center justify-center font-bold  shadow-md z-10">
          <img
            src={mana_crystal}
            alt="Card Back"
            className="object-cover w-full h-full absolute scale-130"
            // no drag
            draggable="false"
          />
          <span className="relative z-20">{card.mana}</span>
        </div>
      )}

      {/* Art */}
      <div className="h-[45%] rounded-t-2xl bg-black overflow-hidden w-full">
        <img
          src={card.imageUrl}
          // alt={title}
          className="object-cover w-full h-full select-none"
          draggable="false"
        />
      </div>

      {/* Title */}
      <div
        ref={containerRef}
        className="text-center w-full font-extrabold text-white py-1 bg-[#f1ce8d] inset-shadow-sm inset-shadow-black overflow-hidden whitespace-nowrap px-2"
        title={card.title}
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
          {card.title}
        </span>
      </div>
      {/* Description */}
      <div className="select-none text-xs w-full text-black px-3 py-2 grow mb-1 bg-[#a58f79] border-2 border-[#f1ce8d] text-center font-medium">
        {card.description}
      </div>

      {/* Type */}
      {card.type && (
        <div className="absolute select-none -bottom-2 text-sm w-fit px-6 text-center font-extrabold text-white shadow-md rounded bg-[#f1ce8d]">
          <span
            style={{
              WebkitTextStroke: "0.5px black",
              textShadow: "0 1px 0px black",
            }}
          >
            {card.type}
          </span>
        </div>
      )}

      {/* Attack & Health */}
      {(card.attack !== undefined || card.health !== undefined) && (
        <>
          {card.attack !== undefined && (
            <div className="absolute select-none -left-1 -bottom-1  rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold shadow-lg">
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
                {card.attack}
              </span>
            </div>
          )}
          {card.health !== undefined && (
            <div className="absolute select-none right-[-1rem] -bottom-1 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold  shadow-lg">
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
                {card.health}
              </span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default Card;
