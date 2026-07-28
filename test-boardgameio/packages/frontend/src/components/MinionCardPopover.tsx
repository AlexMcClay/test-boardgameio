import { createPortal } from "react-dom";
import { motion } from "motion/react";
import CardComponent from "./Card";
import type { Card } from "@project/shared";
import type { Ctx } from "@project/shared";

interface Props {
  card: Card | null;
  position: { x: number; y: number } | null;
  ctx?: Ctx;
  animate?: boolean;
  type?: "game" | "preview" | "popover";
}

const MinionCardPopover = ({
  card,
  position,
  ctx,
  animate = true,
  type,
}: Props) => {
  if (!card || !position) return null;

  const modifiers = card.modifiers ?? [];

  // Stackable modifiers sharing a name collapse into a single entry with a count
  const groupedModifiers = modifiers.reduce<
    { mod: (typeof modifiers)[number]; count: number }[]
  >((acc, mod) => {
    const existing = mod.stackable
      ? acc.find((entry) => entry.mod.stackable && entry.mod.name === mod.name)
      : undefined;
    if (existing) existing.count += 1;
    else acc.push({ mod, count: 1 });
    return acc;
  }, []);

  return createPortal(
    <motion.div
      key={"minion-card-overlay"}
      className="fixed z-[100] pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      initial={animate ? { opacity: 0, scale: 0.5 } : {}}
      animate={animate ? { opacity: 1, scale: 1 } : {}}
      exit={animate ? { opacity: 0, scale: 0.5 } : {}}
      transition={animate ? { duration: 0.1 } : {}}
    >
      <div className="flex items-start flex-col gap-[6vw]">
        <div className="scale-200 origin-left">
          <CardComponent card={card} ctx={ctx} type={type} />
        </div>
        {/* Enchantment list: one entry per grouped modifier on the card */}
        {modifiers.length > 0 && (
          <div className="flex max-w-[16vw] flex-col gap-[0.4vw]">
            {groupedModifiers.map(({ mod, count }) => (
              <div
                key={mod.id}
                className="flex items-center gap-[0.5vw] rounded-md border border-yellow-600/60 bg-stone-900/90 px-[0.6vw] py-[0.35vw] shadow-lg"
              >
                {mod.img && (
                  <img
                    src={mod.img}
                    alt={mod.name}
                    className="h-[2.2vw] w-[2.2vw] shrink-0 rounded-[0.25vw] border border-yellow-700/70 object-cover"
                    draggable="false"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-[0.4vw]">
                    <span className="truncate text-[0.85vw] font-bold text-yellow-200">
                      {mod.name}
                    </span>
                    {count > 1 && (
                      <span className="rounded bg-yellow-700/80 px-[0.3vw] text-[0.6vw] font-semibold text-yellow-100">
                        x{count}
                      </span>
                    )}
                  </div>
                  <span className="block text-[0.75vw] leading-tight text-stone-200">
                    {mod.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>,
    document.body,
  );
};

export default MinionCardPopover;
