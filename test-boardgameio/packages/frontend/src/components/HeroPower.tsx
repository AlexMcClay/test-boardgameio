import type { Card, GameState, Player } from "@project/shared";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import { isUserSelectValue } from "@project/shared";
import { useDragStore } from "@/stores/dragStore";
import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
  actualG: GameState; // actual game state that is not the visual game state
}

const hero_power = "assets/hero_powers/hero_power.png";
const hero_power_used = "assets/hero_powers/hero_power_used.png";

const HeroPower = ({ player, isTop, moves }: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    !used && player.mana >= (player.hero.heroPower?.manaCost || 0);

  return (
    <div
      ref={wrapperRef}
      className={twMerge(
        "absolute z-10 top-[-30%] left-[54.8vw] flex items-center pointer-events-none minion-card",
        isTop && "top-[60%]",
        canUseHeroPower && "canAttack",
      )}
    >
      {used ? (
        <div
          title={player.hero.heroPower?.name}
          className="flex items-center justify-center mt-[0.5vw] pointer-events-auto  px-[0.5vw] py-[0.1vw] rounded-full w-[8vw] h-[8vw] text-center smallShadow"
          onMouseDown={handleHeroPowerMouseDown}
          style={{
            backgroundImage: `url(${hero_power_used})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>
      ) : (
        <>
          <div
            title={player.hero.heroPower?.name}
            className={twMerge(
              "flex items-center justify-center relative pointer-events-auto  px-[0.5vw] py-[0.1vw] rounded-full w-[8vw] h-[8vw] text-center smallShadow z-10",
            )}
            onMouseDown={handleHeroPowerMouseDown}
            style={{
              backgroundImage: `url(${hero_power})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <span className="text-[1.1vw] scale-150 text-center font-extrabold text-white font-belwe text-shadow-A absolute top-[0.35vw]">
              {player.hero.heroPower?.manaCost}
            </span>
          </div>
          <img
            src={player.hero.heroPower?.imageUrl}
            // alt={title}
            className={twMerge(
              "object-cover w-[4.7vw] left-[1.8vw]  rounded-full  select-none absolute z-[-3]",
            )}
            draggable="false"
          />
        </>
      )}
    </div>
  );
};

export default HeroPower;
