import PlayerArea from "./PlayerArea";
import type { BoardProps } from "boardgame.io/react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  MeasuringStrategy,
} from "@dnd-kit/core";
import Lane from "./Lane";
import DropDetectCard from "./Card/DropDetectCard";
import { useDragStore } from "@/stores/dragStore";
import { useAnimationStore } from "@/stores/animationStore";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { detectAllAnimations } from "@/utils/detectAnimations";
import AttackArrow from "./AttackArrow";
import HitNumbers from "./HitNumbers";
import { pointerWithSmallBuffer } from "@/utils/customCollisionDetection";

import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { AnimatePresence, motion } from "motion/react";
import { useAudioStore } from "@/stores/audioStore";
import CardPlayed from "./CardPlayed";
import EndTurnButton from "./Board/EndTurnButton";
import BoardCardDeckTop from "./Board/BoardCardDeckTop";
import BoardCardDeckBottom from "./Board/BoardCardDeckBottom";
import DragCard from "./Board/DragCard";
import YourTurn from "./Board/YourTurn";
import SettingsOverlay from "./SettingsOverlay";
import {
  validateMove,
  type GameState,
  type TargetValue,
} from "@project/shared";
import SettingsButton from "./SettingsButton";

interface Props extends BoardProps<GameState> {}

const backgroundImage = "assets/board.png"; // Path to your background image
const moltenCoreMusic = "assets/audio/music/05_Molten_Core.mp3";
const arenaMusic = "assets/audio/music/05_Arena.mp3";

const Gameboard = ({ ctx, G, moves, ...props }: Props) => {
  const activeCard = useDragStore((state) => state.activeCard);
  const setActiveCard = useDragStore((state) => state.setActiveCard);
  const setCurrentPlayer = useDragStore((state) => state.setCurrentPlayer);
  const setGameState = useDragStore((state) => state.setGameState);

  const backgroundMusic = useMemo(() => {
    // Choose Music Randomly on Game Start
    const tracks = [moltenCoreMusic, arenaMusic];
    return tracks[Math.floor(Math.random() * tracks.length)];
  }, []);

  const setGlobalTrack = useAudioStore((state) => state.setGlobalTrack);
  // Set the default main theme on startup
  useEffect(() => {
    setGlobalTrack(backgroundMusic);
  }, [setGlobalTrack]);

  const { queueAnimationBatch, playAnimations, isAnimating } =
    useAnimationStore();

  // Visual state buffer - keeps dead cards visible during animations
  const [visualGameState, setVisualGameState] = useState<GameState>(G);
  const [visualCtx, setVisualCtx] = useState(ctx);

  // Track if the dragged card was hovered
  const [wasHovered, setWasHovered] = useState(false);

  // Settings overlay state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setCurrentPlayer(ctx.currentPlayer);
  }, [ctx.currentPlayer, setCurrentPlayer]);

  useEffect(() => {
    setGameState(G);
  }, [G, setGameState]);

  // State-based animation detection with visual board management
  const prevGameStateRef = useRef<GameState | null>(null);
  const lastProcessedTimestamp = useRef<number>(0);
  const [yourTurn, setYourTurn] = useState(false);
  const prevMovePlayer = useRef<string | null>(null);

  // yourTurn Handler
  useEffect(() => {
    if (
      visualCtx.currentPlayer === prevMovePlayer.current ||
      visualCtx.currentPlayer === undefined ||
      prevMovePlayer.current === undefined
    ) {
      return;
    } else {
      prevMovePlayer.current = visualCtx.currentPlayer;
      if (
        props.playerID &&
        visualCtx.currentPlayer === props.playerID &&
        visualCtx.turn > 1
      ) {
        setYourTurn(true);
        setTimeout(() => {
          setYourTurn(false);
        }, 2000);
      }
    }
  }, [visualCtx]);

  // add useEffect event listenr for tilde to log G.eventHistory
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "`") {
        console.log("Event History:", G.gameEvents);
        console.log("Full Game History:", G.eventHistory);
        console.log("Active Battlecry Minion:", G.activeBattlecryMinion);
        console.log("GAME STATE", G);
        console.log("GAME CONTEXT", ctx);
        console.log("YOUR PLAYER: ", props.playerID);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [G.gameEvents, props.playerID, G.activeBattlecryMinion]);

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
  }, [visualGameState.activeBattlecryMinion, moves]);

  useEffect(() => {
    const handleAnimationsAndVisualBoard = async () => {
      // Skip on initial mount
      if (!prevGameStateRef.current) {
        prevGameStateRef.current = structuredClone(G);
        setVisualGameState(G);
        setVisualCtx(ctx);
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
      // filter out all cardPlayed animations that belong to the player
      const animations = detectAllAnimations(G).filter((a) => {
        const isMyTurn = props.playerID && ctx.currentPlayer === props.playerID;
        // Read as: "Keep this if it's NOT (a card played by me)"
        return !(isMyTurn && a.type === "cardPlayed");
      });

      // Update tracking timestamp
      if (currentEvents.length > 0) {
        lastProcessedTimestamp.current = Math.max(
          ...currentEvents.map((e) => e.timestamp),
        );
      }

      // Update ref immediately
      prevGameStateRef.current = structuredClone(G);

      // If animations exist, add them to queue with current game state and ctx
      if (animations.length > 0) {
        // --- DUPLICATE CHECK START ---
        // Fetch the absolute newest queue array snapshot directly from the store
        const existingQueue = useAnimationStore.getState().queue;
        const incomingSerialized = JSON.stringify(animations);

        const isAlreadyQueued = existingQueue.some(
          (batch) => JSON.stringify(batch.animations) === incomingSerialized,
        );

        if (isAlreadyQueued) {
          console.warn(
            "⚠️ Multi-player race-condition caught in useEffect: This animation batch is already in the queue. Dropping duplicate.",
          );
          return; // Exit early so it doesn't queue or trigger an extra playAnimations loop
        }
        // --- DUPLICATE CHECK END ---

        console.log("Queueing animation batch:", animations);

        // Queue this batch of animations with the full game state and ctx
        queueAnimationBatch(animations, G, ctx);

        // If not currently animating, start playing the queue
        if (!isAnimating) {
          console.log("Starting animation queue");

          // Callback to update visual state after each batch completes
          const onBatchComplete = (gameState: GameState, batchCtx: any) => {
            console.log("Batch complete, updating visual state");
            setVisualGameState(gameState);
            setVisualCtx(batchCtx);
          };

          await playAnimations(onBatchComplete);
          console.log("All animations complete, syncing to current state");

          // After all animations complete, sync visual state to actual current state
          // setVisualGameState(G);
          // setVisualCtx(ctx);
        }
        // If already animating, the batch is queued and will play automatically
        // when the current batch finishes (handled by playAnimations loop)
      } else {
        // No animations detected
        if (isAnimating) {
          // Queue an empty batch so state updates after current animations finish
          console.log("Queueing state update (no animations)");
          queueAnimationBatch([], G, ctx);
        } else {
          // Not animating, update immediately
          setVisualGameState(G);
          setVisualCtx(ctx);
        }
      }
    };

    handleAnimationsAndVisualBoard();
  }, [G, ctx, isAnimating, queueAnimationBatch, playAnimations]);

  const mainPlayer = props.playerID ?? "0";
  const enemyPlayer = props.playerID
    ? props.playerID === "0"
      ? "1"
      : "0"
    : "1";
  const bottomPlayer = visualGameState.players[mainPlayer];
  const topPlayer = visualGameState.players[enemyPlayer];
  const bottomDeck = bottomPlayer.deck;
  const topDeck = topPlayer.deck;
  const bottomBoard = visualGameState.board[mainPlayer];
  const topBoard = visualGameState.board[enemyPlayer];

  // console.log(ctx.phase, "Current phase");

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Get the card being dragged from active.data
    const card = active.data.current?.card;
    const wasHoveredOnDrag = active.data.current?.wasHovered || false;
    setActiveCard(card || null);
    setWasHovered(wasHoveredOnDrag);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log("Drag ended", event);
    const { active, over } = event;
    setActiveCard(null);
    setWasHovered(false);

    if (!over) {
      return;
    }
    let target: TargetValue | undefined;
    let location: "hand" | "board" = "hand";

    // Determine target from drop data (use actual ctx, not visual)
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
        className="aspect-[16/9] w-full max-h-screen  flex flex-col text-white "
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          // filter: "brightness(0.2)",
          // darken background with filter
        }}
      >
        <EndTurnButton
          ctx={visualCtx}
          G={visualGameState}
          moves={moves}
          {...props}
        />
        <DndContext
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          collisionDetection={pointerWithSmallBuffer}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always, // Forces dnd-kit to remeasure elements frequently
            },
          }}
        >
          {/* Player 1 Hand */}
          <div className=" absolute w-full h-1/4 flex flex-col justify-end">
            <PlayerArea
              moves={moves}
              player={topPlayer}
              G={visualGameState}
              ctx={visualCtx}
              {...props}
              isTop
              playerID={mainPlayer}
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
            <Lane playerID={enemyPlayer} G={visualGameState} ctx={visualCtx}>
              {topBoard.map((card) => (
                <DropDetectCard
                  playerID={enemyPlayer}
                  key={card.id}
                  card={card}
                  ctx={visualCtx}
                  G={visualGameState}
                />
              ))}
            </Lane>
            <Lane playerID={mainPlayer} G={visualGameState} ctx={visualCtx}>
              {bottomBoard.map((card) => (
                <DropDetectCard
                  playerID={mainPlayer}
                  key={card.id}
                  card={card}
                  ctx={visualCtx}
                  G={visualGameState}
                />
              ))}
            </Lane>
          </div>

          {/* Your Turn */}
          <AnimatePresence>
            {yourTurn && (
              <motion.div
                key="your-turn-overlay"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none", // Allows clicking through the empty space around the graphic
                  zIndex: 999,
                }}
              >
                {/* This sub-wrapper ensures the scale origin remains perfectly centered on the graphic */}
                <motion.div
                  style={{
                    transformOrigin: "center center",
                    pointerEvents: "auto", // Re-enable clicks just for the banner itself
                  }}
                >
                  <YourTurn
                    mana={visualGameState.players[props.playerID ?? "0"].mana}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decks */}
          <BoardCardDeckTop deck={topDeck} ctx={visualCtx} />
          <BoardCardDeckBottom deck={bottomDeck} ctx={visualCtx} />

          {/* Player 0 Hand */}
          <div className="absolute bottom-0 w-full h-1/4 flex flex-col justify-start">
            <PlayerArea
              player={bottomPlayer}
              G={visualGameState}
              ctx={visualCtx}
              {...props}
              moves={moves}
              playerID={mainPlayer}
            />
          </div>
          <AnimatePresence
            onExitComplete={() => {
              console.log("exit complete");
            }}
          >
            {activeCard && !activeCard.isPlaced ? (
              // 1. DragOverlay must be the DIRECT child of AnimatePresence
              <DragOverlay
                key={`overlay-${activeCard.id}`}
                modifiers={[snapCenterToCursor]}
              >
                <DragCard
                  ctx={visualCtx}
                  activeCard={activeCard}
                  wasHovered={wasHovered}
                />
              </DragOverlay>
            ) : null}
          </AnimatePresence>
        </DndContext>
      </div>
      {visualCtx?.gameover?.winner && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/60 z-50">
          <div className="text-4xl text-white bg-black/90 px-6 py-4 rounded-lg shadow-lg">
            {`${visualGameState.players[visualCtx.gameover.winner].name} wins!`}
          </div>
        </div>
      )}
      {/* CardPlayed Overlay */}
      <CardPlayed
        {...props}
        ctx={visualCtx}
        G={visualGameState}
        moves={moves}
      />
      {/* Attack Arrow Overlay */}
      <AttackArrow ctx={ctx} playerID={props.playerID} />
      {/* Hit Numbers Overlay */}
      <HitNumbers />
      {/* Settings Overlay */}
      <SettingsButton setIsSettingsOpen={setIsSettingsOpen} />
      <SettingsOverlay
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default Gameboard;
