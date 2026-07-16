import type { Card, GameState, Player } from "@project/shared";
import type { GameBoardProps } from "@/types/gameProps";
import { isUserSelectValue } from "@project/shared";
import { useDragStore } from "@/stores/dragStore";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import HeroPowerPopover from "./HeroPowerPopover";
import { AnimatePresence } from "motion/react";
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
  const endTargeting = useDragStore((s) => s.endTargeting);
  const targetingMode = useDragStore((s) => s.targetingMode);

  function handleHeroPowerMouseDown(e: React.MouseEvent) {
    e.preventDefault();

    if (!player.hero.heroPower) return;

    const heroPower = player.hero.heroPower;

    // Validate conditions
    if (player.heroPowerUsedThisTurn) {
      console.warn("Hero power already used this turn");
      return;
    }

    if (player.mana < heroPower.manaCost) {
      console.warn("Not enough mana for hero power");
      return;
    }

    // Check if requires targeting
    const requiresUserSelection = heroPower.effects.some((effect) =>
      isUserSelectValue(effect),
    );

    if (requiresUserSelection) {
      // Get hero section position as origin

      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const origin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      // Create a pseudo-card for hero power to pass validation context
      const heroPowerCard: Card = {
        id: `hero-power-${player.id}`,
        originalID: `hero-power-${player.id}`,
        title: heroPower.name,
        description: heroPower.description,
        effects: heroPower.effects,
        onPlace: [],
        targetQuery: heroPower.targetQuery,
        isMinion: false,
        damageTaken: 0,
        attacksLeft: 0,
        class: player.hero.class,
        set: [],
      };

      startTargeting(
        "hero-power",
        `hero-power-${player.id}`,
        origin,
        heroPowerCard,
      );
    } else {
      // Direct execution for non-targeted hero powers
      moves.useHeroPower();
    }
  }

  // Handle hero power targeting mouse events
  useEffect(() => {
    if (targetingMode !== "hero-power") return;

    const updateTargetingCursor = useDragStore.getState().updateTargetingCursor;

    // Helper function to find target ID via coordinate bounding boxes
    const getTargetAtCoordinates = (clientX: number, clientY: number) => {
      // Find all player containers on the board
      const playerElements = document.querySelectorAll(
        '[data-player-bounds="true"]',
      );

      for (const el of playerElements) {
        const rect = el.getBoundingClientRect();

        // Check if mouse coordinates fall strictly within the element's actual box boundary
        const isInsideX = clientX >= rect.left && clientX <= rect.right;
        const isInsideY = clientY >= rect.top && clientY <= rect.bottom;

        if (isInsideX && isInsideY) {
          return el.getAttribute("data-player-id");
        }
      }
      return null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateTargetingCursor({ x: e.clientX, y: e.clientY });

      // Determine hovered target
      const targetPlayerId = getTargetAtCoordinates(e.clientX, e.clientY);
      let targetCardId: string | null = null;

      if (!targetPlayerId) {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        targetCardId =
          element?.closest("[data-card-id]")?.getAttribute("data-card-id") ||
          null;
      }

      if (targetCardId || targetPlayerId) {
        useDragStore.setState({
          hoveredTarget: {
            type: targetCardId ? "card" : "player",
            id: targetCardId || targetPlayerId,
          },
        });
      } else {
        useDragStore.setState({ hoveredTarget: null });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const targetPlayerId = getTargetAtCoordinates(e.clientX, e.clientY);

      let targetCardId: string | null = null;
      if (!targetPlayerId) {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        targetCardId =
          element?.closest("[data-card-id]")?.getAttribute("data-card-id") ||
          null;
      }

      if (targetCardId || targetPlayerId) {
        // Dispatch hero-power-target event
        const event = new CustomEvent("hero-power-target", {
          detail: {
            targetCardId,
            targetPlayerId,
          },
        });
        window.dispatchEvent(event);
      }

      useDragStore.setState({ hoveredTarget: null });
      endTargeting();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [targetingMode, endTargeting]);

  const used = player.heroPowerUsedThisTurn;

  const canUseHeroPower =
    !used && player.mana >= (player.hero.heroPower?.manaCost || 0) && !isTop;

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
        {used ? (
          <div
            className="flex items-center justify-center mt-[0.5vw] pointer-events-auto  px-[0.5vw] py-[0.1vw] rounded-full w-[8vw] h-[8vw] text-center smallShadow"
            onMouseDown={handleHeroPowerMouseDown}
            style={{
              backgroundImage: `url(${hero_power_used})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          ></div>
        ) : (
          <div className="relative" onMouseDown={handleHeroPowerMouseDown}>
            <HeroPowerCircle heroPower={player.hero.heroPower!} />
          </div>
        )}
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
