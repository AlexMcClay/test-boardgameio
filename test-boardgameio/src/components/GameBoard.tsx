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
import { useEffect } from "react";
import { validateMove } from "@/utils/validateMove";

interface Props extends BoardProps<GameState> {}

const backgroundImage = "src/assets/wood.jpg"; // Path to your background image

const Gameboard = ({ ctx, G, moves, ...props }: Props) => {
  const activeCard = useDragStore((state) => state.activeCard);
  const setActiveCard = useDragStore((state) => state.setActiveCard);
  const setCurrentPlayer = useDragStore((state) => state.setCurrentPlayer);

  useEffect(() => {
    setCurrentPlayer(ctx.currentPlayer);
  }, [ctx.currentPlayer, setCurrentPlayer]);

  const p0 = G.players["0"];
  const p1 = G.players["1"];
  const board0 = G.board["0"];
  const board1 = G.board["1"];

  console.log(ctx.phase, "Current phase");

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Get the card being dragged from active.data
    const card = active.data.current?.card;
    setActiveCard(card || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
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

    // Validate BEFORE animating
    const validation = validateMove(
      G,
      ctx,
      active.id as string,
      location,
      target,
    );

    if (!validation.valid) {
      console.warn(`Cannot perform move (UI): ${validation.error}`);
      // Optionally show error toast/message to user
      return; // Don't animate or execute move
    }

    // VALID MOVE - Now queue animations
    // await addAnimation(...);

    // Then execute move
    moves.placeCard(active.id, location, target);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // console.log("Drag over", event);
  };

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
              {board1.map((card, idx) => (
                <DropDetectCard
                  playerID="1"
                  key={`p1-board-${idx}`}
                  card={card}
                  ctx={ctx}
                />
              ))}
            </Lane>
            <Lane playerID="0">
              {board0.map((card, idx) => (
                <DropDetectCard
                  playerID="0"
                  key={`p0-board-${idx}`}
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
            {activeCard ? (
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
    </div>
  );
};

export default Gameboard;
