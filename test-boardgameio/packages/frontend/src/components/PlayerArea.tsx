import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import HeroSection from "./HeroSection";
import { twMerge } from "tailwind-merge";
import PlayerHand from "./PlayerHand";
import type { GameState, Player, Card } from "@project/shared";
import { isUserSelectValue } from "@project/shared";
import { useDragStore } from "@/stores/dragStore";
import { useEffect } from "react";

interface Props extends BoardProps<GameState> {
  isTop?: boolean; // true for player 1, false or undefined for player 0
  player: Player;
  actualG: GameState; // actual game state that is not the visual game state
}

const mana_crystal = "assets/mana.png";
const mana_bar = "assets/mana_bar.png";

const PlayerArea = ({
  player,
  isTop,
  G,
  ctx,
  events,
  moves,
  actualG,
  ...props
}: Props) => {
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
      const heroElement = document.querySelector(
        `[data-player-id="${player.id}"]`,
      );
      if (heroElement) {
        const rect = heroElement.getBoundingClientRect();
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
      }
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

  return (
    <div
      className={` h-full w-screen flex justify-between items-${isTop ? "end" : "start"} `}
    >
      {/* HERO STATS */}
      <div
        className={twMerge(
          "absolute z-0 self-center justify-center w-full flex items-center pointer-events-none",
          !isTop && "translate-y-[-97%] translate-x-[-0.1%]",
          isTop && "translate-y-[57%] translate-x-[0%]",
        )}
      >
        <HeroSection
          player={player}
          isTop={isTop}
          G={G}
          ctx={ctx}
          events={events}
          moves={moves}
          {...props}
        />
      </div>

      <PlayerHand
        actualG={actualG}
        player={player}
        isTop={isTop}
        G={G}
        ctx={ctx}
        events={events}
        moves={moves}
        {...props}
      />

      {/* Name */}

      <div
        className={twMerge(
          "absolute z-10 top-[23.5%] left-[0vw] flex items-center pointer-events-none ",
          isTop && "top-[29.5%] left-[0vw]",
        )}
      >
        <div className="text-[1.2vw] text-center font-extrabold text-white font-belwe bg-black/60 pl-[0.5vw] pr-[2vw] py-[0.6vw]">
          {player.name}
        </div>
      </div>

      {/* Hero Power */}

      {player.hero.heroPower && (
        <div
          className={twMerge(
            "absolute z-10 top-[-10%] left-[55vw] flex items-center pointer-events-none ",
            isTop && "top-[60%]",
          )}
        >
          <div
            title={player.hero.heroPower.name}
            className="flex items-center justify-center pointer-events-auto  px-[0.5vw] py-[0.1vw] rounded-full w-[4.5vw] h-[4.5vw] text-center bg-amber-500/80 "
            onMouseDown={handleHeroPowerMouseDown}
          ></div>
        </div>
      )}

      {/* Mana */}
      <div
        className={twMerge(
          "absolute z-10 top-[53.5%] left-[64.1vw] flex items-center pointer-events-none ",
          isTop && "top-[30%] left-[62vw]",
        )}
      >
        <div
          className="flex items-center justify-center  px-[0.5vw] py-[0.1vw] rounded-full w-[4.5vw] text-center "
          title={`${player.mana} / ${player.manaCrystals} Mana`}
          style={{
            backgroundImage: `url(${mana_bar})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            // darken background with filter
            backgroundBlendMode: "multiply",
            filter: "brightness(120%)",
            // filter it slightly light blue
            backgroundColor: "rgba(59, 130, 246, 0.5)",
          }}
        >
          <span className="text-[1.1vw] scale-150 text-center font-extrabold text-white font-belwe text-shadow-A">
            {player.mana}/{player.manaCrystals}
          </span>
        </div>
        {!isTop && (
          <div className="ml-[0.5vw] mt-[0.05vw] flex items-center justify-center">
            {Array.from({ length: player.manaCrystals }, (_, i) => (
              <img
                key={i}
                src={mana_crystal}
                alt="Mana"
                // darken the crystal if it's above the player's current mana
                className={twMerge(
                  "  w-[1.81vw] h-[2vw] object-contain shadow-lg ",

                  i < player.mana ? "brightness-150" : "brightness-50",
                )}
                draggable="false"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerArea;
