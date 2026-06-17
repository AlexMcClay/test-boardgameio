import { useFitText, useArchedText } from "@/hooks";
import type { CardProps } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { twMerge } from "tailwind-merge";
import { useMemo, useRef, useState, useEffect } from "react";
import KeywordPopover from "./KeywordPopover";

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
  type,
  animate,
  initial,
  exit,
}: Props) => {
  // Parameters are now multipliers of container height (viewport-scaled)
  // maxFont: 0.8 = 80% of container height, minFont: 0.4 = 40% of container height
  // archCompensation: 0.82 = 18% cushion for arched text (default)
  const { fontSize, containerRef } = useFitText(card.title, 6, 2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keyword popover state (only for type="game")
  const [showKeywordPopover, setShowKeywordPopover] = useState(false);
  const [keywordPopoverPosition, setKeywordPopoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Use the arched text hook with the container ref for dynamic width measurement
  useArchedText(card.title, fontSize, canvasRef, containerRef);

  // Detect keywords in card description
  const cardKeywords = useMemo(() => {
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
      "Freeze",
    ];
    return keywords.filter((keyword) =>
      new RegExp(`\\b${keyword}\\b`, "i").test(card.description),
    );
  }, [card.description]);

  useEffect(() => {
    console.log("TYPE", type);
    if (type === "popover") {
      handleCardMouseEnter();
    }
  }, [type]);

  // Hover handlers for keyword popover
  const handleCardMouseEnter = () => {
    if (!(type === "game" || type === "popover") || cardKeywords.length === 0)
      return;

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = setTimeout(() => {
      const rect = cardWrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const popoverWidth = 250;
      const spacing = 12;

      // Try right side first
      let x = rect.right + spacing;
      if (x + popoverWidth > window.innerWidth - 8) {
        // Use left side
        x = rect.left - popoverWidth - spacing;
      }
      if (x < 8) x = 8;

      // Center vertically on card
      let y = rect.top + rect.height / 2;

      // Rough estimate of popover height (each keyword ~60px, gap 8px)
      const popoverHeight =
        cardKeywords.length * 60 + (cardKeywords.length - 1) * 8;
      y = y - popoverHeight / 2;

      // Clamp to viewport
      if (y < 8) y = 8;
      if (y + popoverHeight > window.innerHeight - 8) {
        y = window.innerHeight - 8 - popoverHeight;
      }

      setKeywordPopoverPosition({ x, y });
      setShowKeywordPopover(true);
    }, 300);
  };

  const handleCardMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowKeywordPopover(false);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

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
      "Freeze",
    ];
    let parsedDescription = card.description;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g");
      parsedDescription = parsedDescription.replace(
        regex,
        `<span class="font-base font-extrabold text-black">${keyword}</span>`,
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
    <>
      <motion.div
        ref={cardWrapperRef}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
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
          <div className=" select-none absolute text-lg top-[-0.5vw] left-[-0.3vw]  w-[1.7vw] h-[1.7vw] flex items-center justify-center font-bold   z-10 ">
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
        <div className="select-none text-[0.45vw] w-full relative text-black px-[1vw] font-[600] py-[0.5vw] pt-[1vw] grow font-base  text-center ">
          <span
            className="font-base"
            dangerouslySetInnerHTML={{ __html: text }}
          />
        </div>

        {/* Type */}
        {card.type && (
          <div className="absolute select-none -bottom-1 w-fit px-6 text-center font-extrabold text-white shadow-md rounded bg-[#f1ce8d] flex flex-col">
            {card.type.map((t) => (
              <span
                style={{
                  WebkitTextStroke: "0.5px black",
                  textShadow: "0 1px 0px black",
                }}
                className="relative z-10 font-belwe text-[0.6vw]  scale-130  translate-y-[-5%] translate-x-[-5%]"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Attack & Health */}
        {(card.attack !== undefined || card.health !== undefined) && (
          <>
            {card.attack !== undefined && (
              <div className="absolute select-none left-[-0.1vw] bottom-[-0.2vw] rounded-full w-[1.7vw] h-[1.7vw] flex items-center justify-center text-[1.1vw] font-bold shadow-lg">
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
                  className="absolute font-belwe  scale-130  translate-y-[-0.1vw] translate-x-[-0.05vw]"
                >
                  {card.attack}
                </span>
              </div>
            )}
            {card.health !== undefined && (
              <div className="absolute select-none right-[-0.5vw] bottom-[-0.2vw] rounded-full w-[1.7vw] h-[1.7vw] flex items-center justify-center text-[1.1vw] font-bold  shadow-lg">
                <img
                  src={healthIcon}
                  alt="Card Back"
                  className=" object-contain w-full h-full absolute scale-130  bottom-[0.2vw]"
                  // no drag
                  draggable="false"
                />
                <span
                  style={{
                    WebkitTextStroke: "0.5px black",
                    textShadow: "0 1px 0px black",
                  }}
                  className="absolute font-belwe  scale-140 translate-y-[-0.1vw] translate-x-[0vw]"
                >
                  {card.health}
                </span>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Keyword Popover */}
      <AnimatePresence>
        {showKeywordPopover && (
          <KeywordPopover
            keywords={cardKeywords}
            position={keywordPopoverPosition}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Card;
