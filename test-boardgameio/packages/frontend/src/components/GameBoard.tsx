import PlayerArea from "./PlayerArea";
import type { GameBoardProps } from "@/types/gameProps";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DragCancelEvent,
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
import GameOverOverlay from "./Board/GameOverOverlay";
import VersusOverlay, { VERSUS_OVERLAY_DURATION } from "./Board/VersusOverlay";
import SettingsOverlay from "./SettingsOverlay";
import {
  getSpendableMana,
  validateMove,
  type TargetValue,
} from "@project/shared";
import SettingsButton from "./SettingsButton";
import { useGameAnimation, useGameTargeting } from "@/hooks";
import { useAnimationStore } from "@/stores/animationStore";
import { useNoticeStore } from "@/stores/noticeStore";
import NoticeBanner from "./Board/NoticeBanner";
import EventHistory from "./Board/EventHistory";
import MulliganOverlay from "./Mulligan/MulliganOverlay";
import ChoiceOverlay from "./Choice/ChoiceOverlay";
import TargetingLayer from "./Targeting/TargetingLayer";

interface Props extends GameBoardProps {}

const battlefield = "assets/battlefields/board.jpg"; // Path to your background image
const moltenCoreMusic = "assets/audio/music/05_Molten_Core.mp3";
const arenaMusic = "assets/audio/music/05_Arena.mp3";

const Gameboard = ({ ctx, G, moves, ...props }: Props) => {
  const activeCard = useDragStore((state) => state.activeCard);
  const setActiveCard = useDragStore((state) => state.setActiveCard);
  const setCurrentPlayer = useDragStore((state) => state.setCurrentPlayer);
  const setLocalPlayerID = useDragStore((state) => state.setLocalPlayerID);
  const setGameState = useDragStore((state) => state.setGameState);
  // Used to hide the Choose One overlay while one of its halves is being aimed.
  const targetingMode = useDragStore((state) => state.targetingMode);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isAnimating, activeAnimations } = useAnimationStore();

  // Animation hook
  const { visualCtx, visualGameState, setVisualGameState, setVisualCtx } =
    useGameAnimation({
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
  }, [setGlobalTrack, backgroundMusic]);

  // ESC cancellation for battlecry / Choose One prompts. Aiming itself lives
  // in <TargetingLayer> below.
  useGameTargeting({ G, moves });

  // Track if the dragged card was hovered
  const [wasHovered, setWasHovered] = useState(false);

  useEffect(() => {
    setCurrentPlayer(ctx.currentPlayer);
  }, [ctx.currentPlayer, setCurrentPlayer]);

  useEffect(() => {
    setGameState(G);
  }, [G, setGameState]);

  // `mainPlayer` already resolves the hotseat case (props.playerID is null
  // there, so both seats are "local"). Published so non-React consumers —
  // noticeStore, picking whose hero barks at a rejected move — can reach it.
  useEffect(() => {
    setLocalPlayerID(mainPlayer);
  }, [mainPlayer, setLocalPlayerID]);

  // Pre-game matchup card. Seeded from whether the mulligan is still open at
  // mount, so reconnecting into a game already in progress skips it rather than
  // replaying the intro.
  const [showVersus, setShowVersus] = useState(() => !!G.mulligan?.active);

  useEffect(() => {
    if (!showVersus) return;
    const timer = setTimeout(
      () => setShowVersus(false),
      VERSUS_OVERLAY_DURATION,
    );
    return () => clearTimeout(timer);
  }, [showVersus]);

  const [yourTurn, setYourTurn] = useState(false);
  const prevMovePlayer = useRef<string | null>(null);

  // yourTurn Handler
  useEffect(() => {
    if (
      visualGameState.mulligan?.active ||
      visualCtx.currentPlayer === prevMovePlayer.current ||
      visualCtx.currentPlayer === undefined ||
      prevMovePlayer.current === undefined
    ) {
      return;
    } else {
      prevMovePlayer.current = visualCtx.currentPlayer;
      if (props.playerID && visualCtx.currentPlayer === props.playerID) {
        setYourTurn(true);
        setTimeout(() => {
          setYourTurn(false);
        }, 2000);
      }
    }
  }, [visualCtx, visualGameState]);

  // add useEffect event listenr for tilde to log G.eventHistory
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "`") {
        console.log("Event History:", G.gameEvents);
        console.log("Full Game History:", G.eventHistory);
        console.log("Active Battlecry Minion:", G.activeBattlecryMinion);
        console.log("GAME STATE", G);
        console.log("VISUAL GAME STATE", visualGameState);
        console.log("GAME CONTEXT", ctx);
        console.log("YOUR PLAYER: ", props.playerID);
        console.log("isAnimating: ", isAnimating);
        console.log("activeAnimations", activeAnimations);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    G.gameEvents,
    props.playerID,
    G.activeBattlecryMinion,
    activeAnimations,
    isAnimating,
    visualGameState,
  ]);

  // add useEffect event listenr for tilde to log G.eventHistory
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "l") {
        setVisualGameState(G);
        setVisualCtx(ctx);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [G, ctx]);

  // console.log(ctx.phase, "Current phase");

  const setDragPointerPosition = useDragStore(
    (state) => state.setDragPointerPosition,
  );
  const clearHoverBoard = useDragStore((state) => state.clearHoverBoard);
  const pointerMoveListenerRef = useRef<((e: PointerEvent) => void) | null>(
    null,
  );
  const pointerRafRef = useRef<number | null>(null);

  const stopTrackingDragPointer = useCallback(() => {
    if (pointerMoveListenerRef.current) {
      window.removeEventListener("pointermove", pointerMoveListenerRef.current);
      pointerMoveListenerRef.current = null;
    }
    if (pointerRafRef.current !== null) {
      cancelAnimationFrame(pointerRafRef.current);
      pointerRafRef.current = null;
    }
    setDragPointerPosition(null);
    clearHoverBoard();
  }, [setDragPointerPosition, clearHoverBoard]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Get the card being dragged from active.data
    const card = active.data.current?.card;
    const wasHoveredOnDrag = active.data.current?.wasHovered || false;
    setActiveCard(card || null);
    setWasHovered(wasHoveredOnDrag);

    // Track raw pointer position for board insertion-index calculation (used
    // by Lane). Coalesced to once per animation frame — raw pointermove can
    // fire far faster than React needs to re-render for this.
    let latestX = 0;
    let latestY = 0;
    const handlePointerMove = (e: PointerEvent) => {
      latestX = e.clientX;
      latestY = e.clientY;
      if (pointerRafRef.current === null) {
        pointerRafRef.current = requestAnimationFrame(() => {
          pointerRafRef.current = null;
          setDragPointerPosition({ x: latestX, y: latestY });
        });
      }
    };
    pointerMoveListenerRef.current = handlePointerMove;
    window.addEventListener("pointermove", handlePointerMove);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log("Drag ended", event);
    const { active, over } = event;
    setActiveCard(null);
    setWasHovered(false);

    // Read the insertion index before clearing drag state
    const { hoverBoardIndex, hoverBoardLane } = useDragStore.getState();
    stopTrackingDragPointer();

    if (!over) {
      return;
    }
    let target: TargetValue | undefined;
    let location: "hand" | "board" = "hand";
    let boardIndex: number | undefined;

    const draggedCard = active.data.current?.card;
    const isUnplacedMinion = draggedCard?.isMinion && !draggedCard?.isPlaced;

    // Determine target from drop data (use actual ctx, not visual)
    if (isUnplacedMinion && hoverBoardLane === ctx.currentPlayer) {
      target = {
        type: "lane",
        id: `lane-${ctx.currentPlayer}`,
        player: ctx.currentPlayer,
      };
      boardIndex = hoverBoardIndex ?? undefined;
    } else if (over.id === `lane-${ctx.currentPlayer}`) {
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
    await executePlaceCard(active.id as string, location, target, boardIndex);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveCard(null);
    setWasHovered(false);
    stopTrackingDragPointer();
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
      boardIndex?: number,
    ) => {
      // Validate BEFORE executing move
      const validation = validateMove(G, ctx, cardId, location, target);

      if (!validation.valid) {
        useNoticeStore.getState().showMoveError(validation.error);
        return; // Don't execute invalid move
      }

      // Execute the move - animations will be detected and played by useEffect
      moves.placeCard(cardId, target, boardIndex);
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
          backgroundImage: `url(${battlefield})`,
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
        <EventHistory
          ctx={visualCtx}
          G={visualGameState}
          playerID={mainPlayer}
        />
        <DndContext
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
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
                    pointerEvents: "none", // Re-enable clicks just for the banner itself
                  }}
                >
                  <YourTurn
                    mana={getSpendableMana(
                      visualGameState.players[props.playerID ?? "0"],
                    )}
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
      {/* End of game. Reads the VISUAL ctx so the banner waits for the killing
          blow's animation to finish rather than cutting over it. */}
      <AnimatePresence>
        {visualCtx?.gameover?.winner !== undefined && (
          <GameOverOverlay
            winner={visualCtx.gameover.winner}
            G={visualGameState}
            playerID={props.playerID}
          />
        )}
      </AnimatePresence>
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
      {/* Pre-game matchup card, ahead of the mulligan. */}
      <AnimatePresence>
        {showVersus && (
          <VersusOverlay
            key="versus-overlay"
            player={bottomPlayer}
            opponent={topPlayer}
          />
        )}
      </AnimatePresence>
      {/* Mulligan Overlay — reads ACTUAL state; the game hasn't started yet.
          Held back until the matchup card has had its five seconds. */}
      <AnimatePresence>
        {!showVersus && visualGameState.mulligan?.active && (
          <MulliganOverlay G={G} moves={moves} playerID={props.playerID} />
        )}
      </AnimatePresence>
      {/* Choose One / Discover prompt — reads ACTUAL state (it gates the whole
          game) and hides while a picked half is being aimed. */}
      <AnimatePresence>
        {G.pendingChoice && targetingMode !== "choice" && (
          <ChoiceOverlay
            G={G}
            ctx={ctx}
            moves={moves}
            playerID={props.playerID}
          />
        )}
      </AnimatePresence>
      {/* The single pointer handler for every targeting mode. Board-level so
          it survives its source unmounting mid-aim, and so heroes (rendered
          once per seat) can't double-handle a gesture. Takes the ACTUAL G —
          the resolvers validate against it. */}
      <TargetingLayer G={G} ctx={ctx} moves={moves} />
      {/* Rejected-move messages. Above everything, since a notice about a
          blocked action is useless if the thing that blocked it covers it. */}
      <NoticeBanner />
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
