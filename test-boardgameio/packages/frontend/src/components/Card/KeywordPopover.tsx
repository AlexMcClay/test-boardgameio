import { createPortal } from "react-dom";
import { motion } from "motion/react";

interface Props {
  keywords: string[];
  position: { x: number; y: number } | null;
}

const KEYWORD_DEFINITIONS: Record<string, string> = {
  Charge: "Can attack immediately.",
  Taunt: "Enemies must attack minions that have Taunt.",
  Battlecry: "Does something when you play it from your hand.",
  Deathrattle: "Does something when it dies.",
  "Divine Shield": "The first time a Shielded minion takes damage, ignore it.",
  Windfury: "Can attack twice each turn.",
  Lifesteal: "Damage dealt also heals your hero.",
  Rush: "Can attack minions immediately.",
  Overkill: "Deal excess damage on your turn for a bonus.",
  Freeze: "Frozen characters lose their next attack.",
};

const KeywordPopover = ({ keywords, position }: Props) => {
  if (keywords.length === 0 || !position) return null;

  return createPortal(
    <motion.div
      className="fixed z-[100] pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.12 }}
    >
      <div className="flex flex-col gap-[0.4vw]">
        {keywords.map((keyword) => (
          <div
            key={keyword}
            className="
              relative
              overflow-hidden
              min-w-[10vw]
              max-w-[14vw]
              px-[0.9vw]
              py-[0.7vw]

              border-[0.18vw]
              border-[#8e8e8e]

              rounded-[0.45vw]

              bg-[#262626]

              shadow-[inset_0_0_0.25vw_rgba(255,255,255,0.15),0_0.25vw_0.8vw_rgba(0,0,0,0.75)]

              backdrop-blur-[0.08vw]
            "
          >
            {/* subtle inner shine */}
            {/* <div
              className="
                absolute
                inset-0
                bg-gradient-to-b
                from-white/10
                via-transparent
                to-black/20
                pointer-events-none
              "
            /> */}

            <div
              className="
                relative
                text-[1.25vw]
                leading-none
                font-black
                text-white
                tracking-tight
                mb-[0.45vw]
text-shadow-A
         
              "
            >
              {keyword}
            </div>

            <div
              className="
                relative
                text-[0.9vw]
                leading-[1.2]
                font-semibold
                text-[#f0f0f0]
text-shadow-A
              "
            >
              {KEYWORD_DEFINITIONS[keyword] || "Unknown keyword"}
            </div>
          </div>
        ))}
      </div>
    </motion.div>,
    document.body,
  );
};

export default KeywordPopover;
