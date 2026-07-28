import { useFitText, useArchedText } from "@/hooks";
import type { CardProps } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { twMerge } from "tailwind-merge";
import { useMemo, useRef, useState, useEffect } from "react";
import KeywordPopover from "./KeywordPopover";
import SilencedOverlay from "./Overlays/SilencedOverlay";
import {
  getAttack,
  getCurrentHealth,
  getManaCost,
  getSpellDamage,
} from "@project/shared";

const cardBack = "assets/Card_Back.png";
const mana_crystal = "assets/mana.png";
const attackIcon = "assets/attack.png";
const healthIcon = "assets/health.png";
const weaponAttack = "assets/icons/weapon_attack.png";
const weaponShield = "assets/icons/weapon_shield.png";

const minioncCardBase = "assets/card_parts/minion_frames/";
const spellCardsBase = "assets/card_parts/spell_frames/";
const weaponCardsBase = "assets/card_parts/weapon_frames/";

// const cardBackgroundMinionLegendary = "assets/card_parts/legendary_minion.png";

interface Props extends CardProps {}

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
  "Combo",
  "Stealth",
  "Poisonous",
  "Immune",
  "Spell Damage",
  "Overload",
  "Overheal",
  "Temporary",
  "Choose One",
  "Discover",
];

const Card = ({
  card,
  back = false,
  isDragging = false, // Default to false if not provided
  type,
  animate,
  initial,
  exit,
  disableLayoutAnimation = false,
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
  useArchedText(
    card.title,
    fontSize,
    canvasRef,
    containerRef,
    card.isMinion ? "minion" : card.isWeapon ? "weapon" : "spell",
  );

  // Detect keywords in card description
  const cardKeywords = useMemo(() => {
    return keywords.filter((keyword) =>
      new RegExp(`\\b${keyword}\\b`, "i").test(card.description),
    );
  }, [card.description]);

  useEffect(() => {
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

  const spellBonus = card.isSpell ? getSpellDamage(card) : 0;

  const text = useMemo(() => {
    let parsedDescription = card.description;
    // Spell Damage: boost each "N damage" in the text by the card's bonus so
    // the printed number matches what the spell will actually deal.
    if (spellBonus > 0) {
      parsedDescription = parsedDescription.replace(
        /(\d+)(?=\s+damage\b)/gi,
        (m) =>
          `<span class="font-extrabold font-base italic">*${Number(m) + spellBonus}*</span>`,
      );
    }
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g");
      parsedDescription = parsedDescription.replace(
        regex,
        `<span class="font-base font-extrabold ">${keyword}</span>`,
      );
    });
    return parsedDescription;
  }, [card.description, spellBonus]);

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

  if (back) {
    return (
      <motion.div
        className="w-[7.8vw] relative aspect-[5/7] bg-[#37373b] rounded-2xl flex-col flex gap-1 items-center shadow-xl overflow-hidden"
        layout={!disableLayoutAnimation}
        layoutId={!disableLayoutAnimation ? `card-${card.id}` : undefined}
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

  return (
    <>
      <motion.div
        ref={cardWrapperRef}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        layout={!isDragging && !disableLayoutAnimation}
        layoutId={
          !isDragging && !disableLayoutAnimation ? `card-${card.id}` : undefined
        }
        variants={variants}
        // transition={isDragging ? { layout: { duration: 0 } } : undefined}
        initial={initial}
        animate={animate}
        exit={exit}
        className={twMerge(
          ` w-[7.8vw] relative aspect-[5/7] h-[10.92vw]  rounded-2xl flex-col flex gap-0 items-center  text-white font-serif`,
          isDragging && !card.isPlaced && " isDragPlay ",
          isDragging && "cursor-grabbing dragging-card scale-110",
        )}
      >
        {/* Art */}
        <div
          className={twMerge(
            "h-[44%] relative rounded-t-2xl bg-transparent  w-full",
            card.isMinion && "h-[42%] rounded-[50%/50%]",
          )}
        >
          <img
            src={card.imageUrl}
            // alt={title}
            className={twMerge(
              "object-cover w-[95%] h-[100%] top-[0.5vw] left-[0.2vw] select-none absolute z-0",
              card.isMinion &&
                "top-[-0.33vw] rounded-[50%/50%] h-[145%] left-[0.25vw]",
              card.isWeapon && "top-0 h-[120%] left-[0.2vw] rounded-[1vw]",
            )}
            draggable="false"
          />
        </div>

        {/* Card Background */}
        <img
          src={
            card.isMinion
              ? `${minioncCardBase}/${card.class.toLowerCase()}_minion_frame.webp`
              : card.isWeapon
                ? `${weaponCardsBase}/${card.class.toLowerCase()}_weapon_frame.webp`
                : `${spellCardsBase}/${card.class.toLowerCase()}_spell_frame.webp`
          }
          alt="Card Background"
          className={twMerge(
            "object-cover w-full h-full absolute rounded-2xl z-0 scale-y-107 scale-105 origin-bottom ",
            // card.isMinion &&
            //   card.rarity === "Legendary" &&
            //   "scale-114 scale-x-110 origin-bottom",
          )}
          draggable="false"
        />

        {/* Mana Crystal */}
        {card.baseMana !== undefined && (
          <div
            className={twMerge(
              " select-none absolute text-lg top-[-0.5vw] left-[-0.3vw]  w-[2.1vw] h-[2.1vw] flex items-center justify-center font-bold   z-10 ",
              card.isMinion && "h-[2.1vw] w-[2.1vw]",
            )}
          >
            <img
              src={mana_crystal}
              alt="Card Back"
              className="object-cover w-full h-full absolute scale-100 brightness-90"
              // no drag
              draggable="false"
            />
            <span
              className={twMerge(
                "relative z-20 text-[1.1vw] font-extrabold font-belwe  scale-160 translate-y-[-10%] translate-x-[-5%] text-shadow-A",
                getManaCost(card) == card.baseMana
                  ? ""
                  : getManaCost(card) > card.baseMana
                    ? "text-red-500"
                    : "text-green-500",
              )}
            >
              {type === "popover" ? card.baseMana : getManaCost(card)}
            </span>
          </div>
        )}

        {/* Title */}
        <div
          className={twMerge(
            "text-center  w-full font-extrabold text-white inset-shadow-sm overflow-hidden flex  justify-center  z-20 h-[3vh]! min-h-[3vh] absolute top-[42%]",
            card.isMinion && "top-[45%]",
          )}
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
              height: "100%",
            }}
          />
        </div>
        {/* Description */}
        {/* Highlight Keywords Charge, Taunt, Battlecry */}
        <div
          className={twMerge(
            "select-none text-[0.45vw] w-full absolute top-[40%] text-black px-[1vw] font-[600] py-[0.5vw] pt-[3vw] grow font-base  text-center ",
            card.isWeapon && "text-white",
          )}
        >
          <span
            className="font-base"
            dangerouslySetInnerHTML={{ __html: text }}
          />
          {/* Silenced: the text stays printed, struck through with a red X */}
          {card.silenced && <SilencedOverlay />}
        </div>

        {/* Type */}
        {card.type && (
          <div className="absolute select-none bottom-[0.4vw] w-fit text-[0.5vw]/[0.55vw] px-6 text-center font-extrabold text-white shadow-md rounded-[25%/50%]  flex flex-col gap-0">
            {card.type.map((t) => (
              <span className="relative z-10 font-belwe  py-0   translate-y-[-5%] translate-x-[-5%] text-shadow-A ">
                {t}
              </span>
            ))}
            <div
              className="bg-[#bf965e] absolute w-full self-center smallShadow "
              style={{
                height: `${0.5 * card.type.length}vw`,
              }}
            ></div>
          </div>
        )}

        {/* Temporary: discarded from hand at end of turn (Discover Gifts).
            Sits above the type banner so it reads as a state, not a tribe. */}
        {card.temporary && (
          <div className="pointer-events-none absolute bottom-[1.35vw] w-fit select-none rounded-[25%/50%] bg-sky-500/90 px-4 text-center text-[0.5vw]/[0.55vw] font-extrabold text-white smallShadow">
            <span className="relative z-10 font-belwe text-shadow-A">
              Temporary
            </span>
          </div>
        )}

        {/* Rarity */}
        {card.rarity && (
          <img
            src={`/assets/icons/${card.rarity}.webp`}
            alt="Card Back"
            className={twMerge(
              "object-cover w-[0.5vw] absolute scale-130  top-[57%] smallShadow",
              card.isMinion && "top-[55%]",
            )}
            // no drag
            draggable="false"
          />
        )}

        {/* Attack & Health */}
        {(card.baseAttack !== undefined || card.baseHealth !== undefined) && (
          <>
            {card.baseAttack !== undefined && (
              <div className="absolute select-none left-[-0.1vw] bottom-[-0.2vw] rounded-full w-[1.7vw] h-[1.7vw] flex items-center justify-center text-[1.1vw] font-bold ">
                <img
                  src={card.isWeapon ? weaponAttack : attackIcon}
                  alt="Card Back"
                  className={twMerge(
                    "object-cover w-full h-full absolute scale-130 -left-1 bottom-1",
                    card.isWeapon && "left-[0.1vw] scale-160 bottom-[0.3vw]",
                  )}
                  // no drag
                  draggable="false"
                />
                <span
                  className={twMerge(
                    "absolute font-belwe  scale-130  translate-y-[-0.1vw] translate-x-[-0.05vw] text-shadow-A",
                    card.isWeapon &&
                      "translate-y-[-0.3vw] translate-x-[0.15vw]",
                  )}
                >
                  {type === "popover" ? card.baseAttack : getAttack(card)}
                </span>
              </div>
            )}
            {card.baseHealth !== undefined && (
              <div className="absolute select-none right-[-0.5vw] bottom-[-0.2vw] rounded-full w-[1.7vw] h-[1.7vw] flex items-center justify-center text-[1.1vw] font-bold  ">
                <img
                  src={healthIcon}
                  alt="Card Back"
                  className=" object-contain w-full h-full absolute scale-130  bottom-[0.2vw]"
                  // no drag
                  draggable="false"
                />
                <span className="absolute font-belwe  scale-140 translate-y-[-0.1vw] text-shadow-A">
                  {type === "popover"
                    ? card.baseHealth
                    : getCurrentHealth(card)}
                </span>
              </div>
            )}
          </>
        )}

        {card.baseDurability !== undefined && (
          <div className="absolute select-none right-[-0.5vw] bottom-[-0.2vw] rounded-full w-[1.7vw] h-[1.7vw] flex items-center justify-center text-[1.1vw] font-bold  ">
            <img
              src={weaponShield}
              alt="Weapon Durability"
              className=" object-contain w-full h-full absolute scale-170 left-[-0.1vw]  bottom-[0.2vw]"
              // no drag
              draggable="false"
            />
            <span className="absolute font-belwe  scale-140 translate-y-[-0.3vw] translate-x-[-0.1vw] text-shadow-A">
              {card.baseDurability}
            </span>
          </div>
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
