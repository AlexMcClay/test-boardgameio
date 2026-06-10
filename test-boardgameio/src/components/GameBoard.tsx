import PlayerArea from "./PlayerArea";
import type { BoardProps } from "boardgame.io/react";
import type { GameState, TargetValue } from "@/types";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Lane from "./Lane";
import DropDetectCard from "./Card/DropDetectCard";
import Card from "./Card";
import { useDragStore } from "@/stores/dragStore";
import { useAnimationStore } from "@/stores/animationStore";
import { useEffect, useState } from "react";
import { validateMove } from "@/utils/validateMove";
import { detectDeaths } from "@/utils/detectAnimations";
import AttackArrow from "./AttackArrow";

interface Props extends BoardProps<GameState> {}

const backgroundImage = "assets/wood.jpg"; // Path to your background image

const Gameboard = ({ ctx, G, moves, ...props }: Props) => {
  const activeCard = useDragStore((state) => state.activeCard);
  const setActiveCard = useDragStore((state) => state.setActiveCard);
  const setCurrentPlayer = useDragStore((state) => state.setCurrentPlayer);
  const setGameState = useDragStore((state) => state.setGameState);

  const { queueAnimation, playAnimations, isAnimating } = useAnimationStore();

  // Visual state buffer - keeps dead cards visible during animations
  const [visualBoard, setVisualBoard] = useState(G.board);

  useEffect(() => {
    setCurrentPlayer(ctx.currentPlayer);
  }, [ctx.currentPlayer, setCurrentPlayer]);

  useEffect(() => {
    setGameState(G);
  }, [G, setGameState]);

  // Only update visual board when not animating
  useEffect(() => {
    if (!isAnimating) {
      setVisualBoard(G.board);
    }
  }, [G.board, isAnimating]);

  const p0 = G.players["0"];
  const p1 = G.players["1"];
  const board0 = visualBoard["0"];
  const board1 = visualBoard["1"];

  console.log(ctx.phase, "Current phase");

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Get the card being dragged from active.data
    const card = active.data.current?.card;
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log("Drag ended", event);
    const { active, over } = event;
    setActiveCard(null);

    if (!over) {
      return;
    }
    let target: TargetValue | undefined;
    let location: "hand" | "board" = "hand";

    // Determine target from drop data
    if (over.id === `lane-${ctx.currentPlayer}`) {
      target = { type: "lane", id: over.id, player: ctx.currentPlayer };
    } else if (over.data.current?.type === "card") {
      if (over.data.current.id === active.id) return;
      location = active.data.current?.card?.isPlaced ? "board" : "hand";
      target = {
        type: "card",
        id: over.data.current.id,
        player: over.data.current.player,
      };
    } else if (over.data.current?.type === "player") {
      location = active.data.current?.card?.isPlaced ? "board" : "hand";
      target = {
        type: "player",
        id: over.data.current.id,
        player: over.data.current.player,
      };
    }

    // Execute the move with validation and animations
    await executeMove(active.id as string, location, target);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // console.log("Drag over", event);
  };

  // Shared function to execute a move with validation, animation, and state updates
  const executeMove = async (
    cardId: string,
    location: "hand" | "board",
    target?: TargetValue,
  ) => {
    // Validate BEFORE animating
    const validation = validateMove(G, ctx, cardId, location, target);

    if (!validation.valid) {
      console.warn(`Cannot perform move (UI): ${validation.error}`);
      return; // Don't animate or execute move
    }

    // VALID MOVE - Queue animations before executing move

    // 1. Snapshot current state (deep copy to compare later)
    const stateBefore: GameState = JSON.parse(JSON.stringify(G));

    // 2. Check if this is an attack action (placed card targeting something)
    const isAttack =
      target && (target.type === "card" || target.type === "player");

    if (isAttack && (target.type === "card" || target.type === "player")) {
      // Queue attack animation
      queueAnimation({
        type: "attack",
        attackerId: cardId,
        targetId: target.id,
        targetType: target.type,
        targetPlayerId: target.player,
        attackerPlayerId: ctx.currentPlayer,
      });
    }

    // 3. Execute the move (this updates the game state immediately)
    moves.placeCard(cardId, location, target);

    // 4. Detect deaths by comparing states
    const deaths = detectDeaths(stateBefore, G);

    // 5. Queue death animations
    deaths.forEach((death) => {
      queueAnimation(death);
    });

    // 6. Play all queued animations
    await playAnimations();
  };

  // Handle attack arrow target selection
  useEffect(() => {
    const handleAttackTarget = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { attackerId, targetCardId, targetPlayerId } = customEvent.detail;

      let target: TargetValue | undefined;
      const location: "hand" | "board" = "board";

      if (targetCardId) {
        // Find which player owns this card
        const player0HasCard = G.board["0"].some((c) => c.id === targetCardId);
        const targetPlayer = player0HasCard ? "0" : "1";

        target = {
          type: "card",
          id: targetCardId,
          player: targetPlayer,
        };
      } else if (targetPlayerId) {
        target = {
          type: "player",
          id: targetPlayerId,
          player: targetPlayerId,
        };
      }

      if (!target) return;

      // Execute the move with validation and animations
      await executeMove(attackerId, location, target);
    };

    window.addEventListener("attack-target", handleAttackTarget);

    return () => {
      window.removeEventListener("attack-target", handleAttackTarget);
    };
  }, [G, ctx, moves, queueAnimation, detectDeaths, playAnimations]);

  return (
    <div
      className="w-screen h-screen bg-[#1c1e22] flex items-center justify-center overflow-hidden relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        // filter: "brightness(0.2)",
        // darken background with filter
        backgroundBlendMode: "multiply",
        backgroundColor: "#00000099",
      }}
    >
      <div className="aspect-[16/9] w-full max-h-screen  flex flex-col text-white px-6 py-4 gap-2">
        <DndContext
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
        >
          {/* Player 1 Hand */}
          <div className="h-1/4 flex flex-col justify-end">
            <PlayerArea
              moves={moves}
              player={p1}
              G={G}
              ctx={ctx}
              {...props}
              playerID={"1"}
              isTop
            />
          </div>

          {/* Board Area */}
          <div className="flex flex-col gap-2 items-center justify-center h-[50%] border-y-4 bg border-yellow-800 py-2">
            {/* Player 1 Board */}
            <Lane playerID="1">
              {board1.map((card) => (
                <DropDetectCard
                  playerID="1"
                  key={card.id}
                  card={card}
                  ctx={ctx}
                />
              ))}
            </Lane>
            <Lane playerID="0">
              {board0.map((card) => (
                <DropDetectCard
                  playerID="0"
                  key={card.id}
                  card={card}
                  ctx={ctx}
                />
              ))}
            </Lane>
          </div>

          {/* Player 0 Hand */}
          <PlayerArea
            player={p0}
            G={G}
            ctx={ctx}
            {...props}
            moves={moves}
            playerID="0"
          />
          <DragOverlay>
            {activeCard && !activeCard.isPlaced ? (
              <Card
                card={activeCard}
                isDragging={true}
                ctx={ctx}
                playerID={""}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      {ctx?.gameover?.winner && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/60 z-50">
          <div className="text-4xl text-white bg-black/90 px-6 py-4 rounded-lg shadow-lg">
            {`${G.players[ctx.gameover.winner].name} wins!`}
          </div>
        </div>
      )}

      {/* Attack Arrow Overlay */}
      <AttackArrow />
    </div>
  );
};

export default Gameboard;
