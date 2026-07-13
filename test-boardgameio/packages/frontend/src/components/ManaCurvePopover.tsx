import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { cardTemplates, type CardTemplateKey } from "@project/shared";
import type { DeckString } from "@/stores/deckStore";
import { twMerge } from "tailwind-merge";

interface Props {
  deck: DeckString;
  position: { x: number; y: number } | null;
}

const MANA_BUCKET_COUNT = 8; // 0, 1, 2, ..., 6, 7+
const mana_crystal = "assets/mana.png";

const ManaCurvePopover = ({ deck, position }: Props) => {
  if (!position) return null;

  const counts = new Array(MANA_BUCKET_COUNT).fill(0);
  for (const [cardId, copies] of Object.entries(deck)) {
    const baseMana = cardTemplates[cardId as CardTemplateKey]?.baseMana ?? 0;
    const bucket = Math.min(baseMana, MANA_BUCKET_COUNT - 1);
    counts[bucket] += copies ?? 0;
  }
  const maxCount = Math.max(1, ...counts);

  return createPortal(
    <motion.div
      className="fixed z-[100] pointer-events-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.1 }}
    >
      <div
        className="w-[16vw]   bg-[#262626]

              shadow-[inset_0_0_0.25vw_rgba(255,255,255,0.15),0_0.25vw_0.8vw_rgba(0,0,0,0.75)] border-2 border-yellow-500 p-[0.8vw]"
      >
        <p className="text-[0.9vw] font-bold text-gray-400 text-center mb-[0.7vw]">
          Cards / Mana Cost
        </p>
        <div className="flex items-end justify-between gap-[0.25vw] h-[7vw] border-b border-gray-900/60">
          {counts.map((count, cost) => (
            <div
              key={cost}
              className="flex-1 flex flex-col items-center justify-end h-full bg-gray-950 border-[0.2vw] border-slate-600"
            >
              <span className="text-white text-[1.4vw] font-extrabold font-belwe  text-shadow-A  mb-[1vw] h-[0.8vw]">
                {count > 0 ? count : ""}
              </span>
              <div
                className="w-full max-w-[1vw] bg-gradient-to-t from-yellow-500 to-yellow-300 border border-gray-700"
                style={{
                  height: count > 0 ? `${(count / maxCount) * 100}%` : "0px",
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-[0.25vw] mt-[0.3vw]">
          {counts.map((_, cost) => (
            <div className=" select-none relative text-lg w-[1.7vw] h-[1.7vw] flex items-center justify-center font-bold  shadow-md z-10 ">
              <img
                src={mana_crystal}
                alt="cardTemplates[k as CardTemplateKey] Back"
                className="object-cover w-full h-full absolute scale-100 brightness-90"
                draggable={false}
              />
              <span
                className={twMerge(
                  "relative z-20 text-white text-[1.1vw] font-extrabold font-belwe  scale-150 translate-y-[-5%] translate-x-[-5%] text-shadow-A",
                  cost === MANA_BUCKET_COUNT - 1 && "translate-x-[40%]",
                )}
              >
                {cost === MANA_BUCKET_COUNT - 1 ? `${cost}+` : cost}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>,
    document.body,
  );
};

export default ManaCurvePopover;
