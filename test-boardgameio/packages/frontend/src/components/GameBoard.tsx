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
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import { useGameAnimation, useGameTargeting } from "@/hooks";

interface Props extends BoardProps<GameState> {}

const backgroundImage = "assets/board.jpg"; // Path to your background image
const moltenCoreMusic = "assets/audio/music/05_Molten_Core.mp3";
const arenaMusic = "assets/audio/music/05_Arena.mp3";

const Gameboard = ({ ctx, G, moves, ...props }: Props) => {
  const activeCard = useDragStore((state) => state.activeCard);
  const setActiveCard = useDragStore((state) => state.setActiveCard);
  const setCurrentPlayer = useDragStore((state) => state.setCurrentPlayer);
  const setGameState = useDragStore((state) => state.setGameState);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Animation hook
  const { visualCtx, visualGameState } = useGameAnimation({
    ctx,
    G,
    playerID: props.playerID,
  });

  const mainPlayer = props.playerID ?? ctx.currentPlayer;
  const enemyPlayer = mainPlayer == "0" ? "1" : "0";
  const bottomPlayer = visualGameState.players[mainPlayer];
  const topPlayer = visualGameState.players[enemyPlayer];
  const bottomDeck = bottomPlayer.deck;
  const topDeck = topPlayer.deck;
  const bottomBoard = visualGameState.board[mainPlayer];
  const topBoard = visualGameState.board[enemyPlayer];

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

  // Targetinmg
  useGameTargeting({
    G,
    ctx,
    moves,
  });

  // Track if the dragged card was hovered
  const [wasHovered, setWasHovered] = useState(false);

  useEffect(() => {
    setCurrentPlayer(ctx.currentPlayer);
  }, [ctx.currentPlayer, setCurrentPlayer]);

  useEffect(() => {
    setGameState(G);
  }, [G, setGameState]);

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
    await executePlaceCard(active.id as string, location, target);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // console.log("Drag over", event);
  };

  // Simplified move execution - animations now handled by state-driven hook
  const executePlaceCard = useCallback(
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
              actualG={G}
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
              actualG={G}
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
        playerID={mainPlayer}
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
