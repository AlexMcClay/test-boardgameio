import { useFitText, useArchedText } from "@/hooks";
import type { CardProps } from "./types";
import { motion } from "motion/react";
import { twMerge } from "tailwind-merge";
import { useMemo, useRef } from "react";

const cardBack = "assets/Card_Back.png";
const mana_crystal = "assets/mana.png";
const attackIcon = "assets/attack.png";
const healthIcon = "assets/health.png";
const cardBackground = "assets/card_parts/card.png";

interface Props extends CardProps {}

const Card = ({
  card,
  back = false,
  isDragging = false, // Default to false if not provided
  playerID,
  ctx,
  animate,
  initial,
  exit,
}: Props) => {
  // Parameters are now multipliers of container height (viewport-scaled)
  // maxFont: 0.8 = 80% of container height, minFont: 0.4 = 40% of container height
  // archCompensation: 0.82 = 18% cushion for arched text (default)
  const { fontSize, containerRef } = useFitText(card.title, 6, 2);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use the arched text hook with the container ref for dynamic width measurement
  useArchedText(card.title, fontSize, canvasRef, containerRef);

  if (back) {
    return (
      <motion.div
        className="w-[7.8vw] relative aspect-[5/7] bg-[#37373b] rounded-2xl flex-col flex gap-1 items-center shadow-xl overflow-hidden"
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

  const text = useMemo(() => {
    // parse description and wrap keywords in spans
    const keywords = [
      "Charge",
      "Taunt",
      "Battlecry",
      "Deathrattle",
      "Divine Shield",
      "Windfury",
      "Lifesteal",
      "Rush",
      "Overkill",
    ];
    let parsedDescription = card.description;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g");
      parsedDescription = parsedDescription.replace(
        regex,
        `<span class=" font-extrabold text-black">${keyword}</span>`,
      );
    });
    return parsedDescription;
  }, [card.description]);

  const variants = {
    normal: {
      scale: 1,
      opacity: 1,
    },
    "play-hover": {
      scale: 2,
      opacity: 1,
    },
  };

  return (
    <motion.div
      layout={!isDragging}
      layoutId={!isDragging ? `card-${card.id}` : undefined}
      variants={variants}
      // transition={isDragging ? { layout: { duration: 0 } } : undefined}
      initial={initial}
      animate={animate}
      exit={exit}
      className={twMerge(
        ` w-[7.8vw] relative aspect-[5/7] bg-[#37373b] rounded-2xl flex-col flex gap-0 items-center shadow-xl text-white font-serif`,
        isDragging &&
          !card.isPlaced &&
          " ring-blue-500 ring-2 shadow-blue-400  shadow-[0px_0px_60px_rgba(0,0,0,0.5)] ",
        isDragging &&
          card.isPlaced &&
          "ring-green-500 ring-2 shadow-green-400  shadow-[0px_0px_60px_rgba(0,0,0,0.5)]",
        !card.hasAttacked &&
          card.isPlaced &&
          ctx?.currentPlayer === playerID &&
          "ring-green-500 ring-2 shadow-green-400  shadow-[0px_0px_20px_rgba(0,0,0,0.5)]",
        card.taunt && "border-gray-500",
        isDragging && "cursor-grabbing dragging-card scale-110",
      )}
    >
      {/* Art */}
      <div className="h-[42%] relative rounded-t-2xl bg-transparent  w-full">
        <img
          src={card.imageUrl}
          // alt={title}
          className="object-cover w-[95%] h-[100%] top-2 left-0.5 select-none absolute z-0"
          draggable="false"
        />
      </div>

      {/* Card Background */}
      <img
        src={cardBackground}
        alt="Card Background"
        className="object-cover w-full h-full absolute rounded-2xl z-0"
        draggable="false"
      />

      {/* Mana Crystal */}
      {card.mana !== null && card.mana !== undefined && (
        <div className=" select-none absolute text-lg top-[-0.7rem] left-[-0.7rem]  w-[1.7vw] h-[1.7vw] flex items-center justify-center font-bold  shadow-md z-10 ">
          <img
            src={mana_crystal}
            alt="Card Back"
            className="object-cover w-full h-full absolute scale-100 brightness-90"
            // no drag
            draggable="false"
          />
          <span
            className="relative z-20 text-[1.1vw] font-extrabold font-belwe  scale-160 translate-y-[-10%] translate-x-[-5%]"
            style={{
              WebkitTextStroke: "0.5px black",
              textShadow: "0 1px 0px black",
            }}
          >
            {card.mana}
          </span>
        </div>
      )}

      {/* Title */}
      <div
        className="text-center relative w-full font-extrabold text-white inset-shadow-sm overflow-hidden flex  justify-center
        h-[3vh]
        "
        title={card.title}
      >
        {/* Hidden span for font size calculation */}
        <span
          ref={containerRef}
          className="invisible absolute inline-block whitespace-nowrap"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: "1.2",
          }}
        >
          {card.title}
        </span>
        {/* Canvas for arched text rendering */}
        <canvas
          ref={canvasRef}
          className="select-none mx-auto"
          style={{
            display: "block",
            height: "2rem",
          }}
        />
      </div>
      {/* Description */}
      {/* Highlight Keywords Charge, Taunt, Battlecry */}
      <div className="select-none text-[0.56vw] w-full relative text-black px-[1vw] py-[0.5vw] pt-[0.9vw] grow   text-center font-medium ">
        <span className="" dangerouslySetInnerHTML={{ __html: text }} />
      </div>

      {/* Type */}
      {card.type && (
        <div className="absolute select-none -bottom-1 text-sm w-fit px-6 text-center font-extrabold text-white shadow-md rounded bg-[#f1ce8d] ">
          <span
            style={{
              WebkitTextStroke: "0.5px black",
              textShadow: "0 1px 0px black",
            }}
            className="relative z-10 font-belwe  scale-130  translate-y-[-5%] translate-x-[-5%]"
          >
            {card.type}
          </span>
        </div>
      )}

      {/* Attack & Health */}
      {(card.attack !== undefined || card.health !== undefined) && (
        <>
          {card.attack !== undefined && (
            <div className="absolute select-none -left-1 -bottom-1  rounded-full w-[1.7vw] h-[1.7vw] flex items-center justify-center text-[1.1vw] font-bold shadow-lg">
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
                className="absolute font-belwe  scale-130  translate-y-[-5%] translate-x-[-5%]"
              >
                {card.attack}
              </span>
            </div>
          )}
          {card.health !== undefined && (
            <div className="absolute select-none right-[-1rem] -bottom-1 rounded-full w-[1.7vw] h-[1.7vw] flex items-center justify-center text-[1.1vw] font-bold  shadow-lg">
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
                className="absolute font-belwe  scale-140 translate-y-[-10%] translate-x-[-10%]"
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
