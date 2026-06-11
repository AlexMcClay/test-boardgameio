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
import { useEffect, useState, useRef, useCallback } from "react";
import { validateMove } from "@/utils/validateMove";
import { detectAllAnimations } from "@/utils/detectAnimations";
import AttackArrow from "./AttackArrow";
import HitNumbers from "./HitNumbers";
import { motion } from "motion/react";

interface Props extends BoardProps<GameState> {}

const backgroundImage = "assets/board.png"; // Path to your background image

const Gameboard = ({ ctx, G, moves, ...props }: Props) => {
  const activeCard = useDragStore((state) => state.activeCard);
  const setActiveCard = useDragStore((state) => state.setActiveCard);
  const setCurrentPlayer = useDragStore((state) => state.setCurrentPlayer);
  const setGameState = useDragStore((state) => state.setGameState);

  const { queueAnimation, startAnimating, playAnimations, isAnimating } =
    useAnimationStore();

  // Visual state buffer - keeps dead cards visible during animations
  const [visualBoard, setVisualBoard] = useState(G.board);

  useEffect(() => {
    setCurrentPlayer(ctx.currentPlayer);
  }, [ctx.currentPlayer, setCurrentPlayer]);

  useEffect(() => {
    setGameState(G);
  }, [G, setGameState]);

  // State-based animation detection with visual board management
  const prevGameStateRef = useRef<GameState | null>(null);
  const lastProcessedTimestamp = useRef<number>(0);

  // add useEffect event listenr for tilde to log G.eventHistory
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "`") {
        console.log("Event History:", G.gameEvents);
        console.log("Full Game History:", G.eventHistory);
        console.log("Active Battlecry Minion:", G.activeBattlecryMinion);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [G.gameEvents]);

  // ESC handler for canceling battlecry
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && G.activeBattlecryMinion) {
        console.log("Canceling battlecry with ESC");
        moves.cancelBattlecry();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [G.activeBattlecryMinion, moves]);

  useEffect(() => {
    const handleAnimationsAndVisualBoard = async () => {
      // Skip on initial mount
      if (!prevGameStateRef.current) {
        prevGameStateRef.current = structuredClone(G);
        setVisualBoard(G.board);
        return;
      }

      // Only process new events (by timestamp)
      const currentEvents = G.gameEvents || [];
      const newEvents = currentEvents.filter(
        (e) => e.timestamp > lastProcessedTimestamp.current,
      );

      // Skip if no new events to process
      if (newEvents.length === 0) {
        return;
      }

      // Detect all animations from event log
      const animations = detectAllAnimations(G);

      // Update tracking timestamp
      if (currentEvents.length > 0) {
        lastProcessedTimestamp.current = Math.max(
          ...currentEvents.map((e) => e.timestamp),
        );
      }

      // Update ref immediately
      prevGameStateRef.current = structuredClone(G);

      // Skip if already animating - just update the ref but don't process animations
      // This prevents the rapid attack bug while keeping state in sync
      if (isAnimating) {
        console.log("Currently animating, deferring state update");
        return;
      }

      // If a minion was placed, update visual board immediately to show it (before animations)
      if (newEvents.find((e) => e.type === "minionPlaced")) {
        setVisualBoard(G.board);
      }

      // If animations exist, play them BEFORE updating visual board
      if (animations.length > 0) {
        console.log("Starting animations:", animations);
        startAnimating();
        animations.forEach((animation) => queueAnimation(animation));
        await playAnimations(); // Wait for all animations to complete
        console.log("Animations complete, updating visual board");

        // Visual board will update below (dead cards removed from display)
      }

      // Update visual board after animations complete (or immediately if no animations)
      setVisualBoard(G.board);
    };

    handleAnimationsAndVisualBoard();
  }, [
    G,
    ctx.currentPlayer,
    isAnimating,
    startAnimating,
    queueAnimation,
    playAnimations,
  ]);

  const p0 = G.players["0"];
  const p1 = G.players["1"];
  const board0 = visualBoard["0"];
  const board1 = visualBoard["1"];

  // console.log(ctx.phase, "Current phase");

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

  // Simplified move execution - animations now handled by state-driven hook
  const executeMove = useCallback(
    async (
      cardId: string,
      location: "hand" | "board",
      target?: TargetValue,
    ) => {
      // Validate BEFORE executing move
      const validation = validateMove(G, ctx, cardId, location, target);

      if (!validation.valid) {
        console.warn(`Cannot perform move (UI): ${validation.error}`);
        return; // Don't execute invalid move
      }

      // Execute the move - animations will be detected and played by useEffect
      moves.placeCard(cardId, location, target);
    },
    [G, ctx, moves],
  );

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
  }, [executeMove]);

  return (
    <div
      className="w-screen h-screen  flex items-center justify-center overflow-hidden relative"
      style={{
        // backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        // filter: "brightness(0.2)",
        // darken background with filter
        backgroundBlendMode: "multiply",
      }}
    >
      <div
        className="aspect-[16/9] w-full max-h-screen  flex flex-col text-white px-6 py-4 gap-2"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          // filter: "brightness(0.2)",
          // darken background with filter
        }}
      >
        <DndContext
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
        >
          {/* Player 1 Hand */}
          <div className=" absolute w-full h-1/4 flex flex-col justify-end">
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
          <div
            className="absolute left-0 w-full h-1/2 flex flex-col gap-2 items-center justify-center py-2"
            style={{
              top: "calc(22.2%)",
            }}
          >
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
          <div className="absolute bottom-0 w-full h-1/4 flex flex-col justify-start">
            <PlayerArea
              player={p0}
              G={G}
              ctx={ctx}
              {...props}
              moves={moves}
              playerID="0"
            />
          </div>
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

      {/* Hit Numbers Overlay */}
      <HitNumbers />
    </div>
  );
};

export default Gameboard;
