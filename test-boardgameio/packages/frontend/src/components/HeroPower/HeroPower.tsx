import type { GameState, Player } from "@project/shared";
import type { GameBoardProps } from "@/types/gameProps";
import { canAfford, isUserSelectValue } from "@project/shared";
import { centerOf } from "@/utils/targeting";
import { heroPowerCard } from "@/game/pseudoCards";
import { useDragStore } from "@/stores/dragStore";
import { useAudioStore } from "@/stores/audioStore";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import HeroPowerPopover from "./HeroPowerPopover";
import { AnimatePresence, motion, useAnimation } from "motion/react";
import HeroPowerCircle from "./HeroPowerCircle";

interface Props extends GameBoardProps {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
  actualG: GameState; // actual game state that is not the visual game state
}

const hero_power_used = "assets/hero_powers/hero_power_used.png";

const HeroPower = ({ player, isTop, moves }: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Hover popover state
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const startTargeting = useDragStore((s) => s.startTargeting);
  const playSfx = useAudioStore((state) => state.playSfx);

  function handleHeroPowerMouseDown(e: React.MouseEvent) {
    e.preventDefault();

    if (!player.hero.heroPower) return;

    const heroPower = player.hero.heroPower;

    // Validate conditions
    if (player.heroPowerUsedThisTurn) {
      console.warn("Hero power already used this turn");
      return;
    }

    if (!canAfford(player, heroPower.manaCost)) {
      console.warn("Not enough mana for hero power");
      return;
    }

    // Check if requires targeting
    const requiresUserSelection = heroPower.effects.some((effect) =>
      isUserSelectValue(effect),
    );

    if (requiresUserSelection) {
      // Get hero section position as origin
      const origin = centerOf(wrapperRef.current);
      if (!origin) return;

      startTargeting(
        "hero-power",
        `hero-power-${player.id}`,
        origin,
        heroPowerCard(player),
      );
    } else {
      // Direct execution for non-targeted hero powers
      moves.useHeroPower();
    }
  }

  const used = player.heroPowerUsedThisTurn;

  const canUseHeroPower =
    !used && canAfford(player, player.hero.heroPower?.manaCost ?? 0) && !isTop;

  // Flip animation + SFX for the used/unused hero power state
  const flipControls = useAnimation();
  const prevUsedRef = useRef(used);

  useEffect(() => {
    if (prevUsedRef.current === used) return;
    prevUsedRef.current = used;

    playSfx(used ? "hero-power-off" : "hero-power-on");

    flipControls.start({
      rotateY: used ? 180 : 0,
      y: [0, "-1vw", 0],
      transition: {
        rotateY: { duration: 0.4, ease: "easeInOut" },
        y: { duration: 0.4, ease: "easeOut", times: [0, 0.4, 1] },
      },
    });
  }, [used, playSfx, flipControls]);

  // Hover handlers for popover
  const handleMouseEnter = () => {
    // Clear any existing timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    // Start 1-second timer
    hoverTimerRef.current = setTimeout(() => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const vw = window.innerWidth / 100;

      // Calculate position for popover

      const x = rect.right + 3 * vw;

      const y = rect.top + -rect.height / 2;

      setPopoverPosition({ x, y });
      setShowPopover(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    // Clear timer if mouse leaves before 1 second
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    // Hide popover
    setShowPopover(false);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={wrapperRef}
        className={twMerge(
          "absolute z-10 top-[-30%] left-[54.8vw] flex items-center pointer-events-none minion-card",
          isTop && "top-[60%]",
          canUseHeroPower && "canAttack",
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="mt-[0.5vw] w-[8vw] h-[8vw]"
          style={{ perspective: "1200px" }}
        >
          <motion.div
            className="relative w-full h-full pointer-events-auto"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ rotateY: used ? 180 : 0 }}
            animate={flipControls}
            onMouseDown={handleHeroPowerMouseDown}
          >
            {/* Front face - available */}
            <div
              className="absolute inset-0"
              style={{ backfaceVisibility: "hidden" }}
            >
              <HeroPowerCircle heroPower={player.hero.heroPower!} />
            </div>

            {/* Back face - used */}
            <div
              className="absolute inset-0 rounded-full text-center smallShadow"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                backgroundImage: `url(${hero_power_used})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
          </motion.div>
        </div>
      </div>
      {/* Render popover when hovering */}
      <AnimatePresence>
        {showPopover && (
          <HeroPowerPopover
            heroPower={player.hero.heroPower!}
            isTop={isTop}
            position={popoverPosition}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default HeroPower;
