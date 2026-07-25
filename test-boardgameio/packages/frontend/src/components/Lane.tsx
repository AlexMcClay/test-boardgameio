import { useDragStore } from "@/stores/dragStore";
import { useDroppable } from "@dnd-kit/core";
import type { Ctx, PlayerID } from "@project/shared";
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { AnimatePresence, motion } from "motion/react";
import type { GameState } from "@project/shared";

const BOARD_LIMIT = 7;

type Props = {
  children: React.ReactNode;
  playerID: PlayerID; // Added playerID to match the Board component
  G: GameState;
  ctx: Ctx;
};

const Lane = ({ children, playerID, ...props }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane-${playerID}`,
    data: {
      type: "lane",
      id: `lane-${playerID}`,
      player: playerID,
    },
  });

  const isValidTarget = useDragStore((state) => state.isValidTarget);
  const isValid = isValidTarget(
    {
      type: "lane",
      id: `lane-${playerID}`,
      player: playerID,
    },
    {
      G: props.G,
      ctx: props.ctx,
      playerID: props.ctx.currentPlayer,
      location: "board",
    },
  );

  // Live insertion-index preview while dragging an unplaced minion over this lane
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeCard = useDragStore((state) => state.activeCard);
  const dragPointerPosition = useDragStore((state) => state.dragPointerPosition);
  const setHoverBoard = useDragStore((state) => state.setHoverBoard);
  const [localHoverIndex, setLocalHoverIndex] = useState<number | null>(null);
  // Snapshot of the real cards' center-x positions, captured once per hover
  // session (before any ghost slot exists). Re-measuring live rects on every
  // update is unsafe: inserting the ghost shifts the real cards, which would
  // change what the next measurement reports, which moves the ghost again —
  // an infinite feedback loop that also thrashes dnd-kit's own droppable
  // measurement (MeasuringStrategy.Always) into "Maximum update depth
  // exceeded". Measuring once and reusing it for the rest of the drag avoids
  // that entirely.
  const stableCentersRef = useRef<number[] | null>(null);

  const boardLength = props.G.board[playerID].length;

  useEffect(() => {
    if (!activeCard) {
      stableCentersRef.current = null;
    }
  }, [activeCard]);

  useEffect(() => {
    const canHover =
      activeCard &&
      activeCard.isMinion &&
      !activeCard.isPlaced &&
      playerID === props.ctx.currentPlayer &&
      boardLength < BOARD_LIMIT &&
      dragPointerPosition &&
      containerRef.current;

    if (!canHover) {
      stableCentersRef.current = null;
      if (localHoverIndex !== null) setLocalHoverIndex(null);
      if (useDragStore.getState().hoverBoardLane === playerID) {
        setHoverBoard(null, null);
      }
      return;
    }

    const rect = containerRef.current!.getBoundingClientRect();
    const { x, y } = dragPointerPosition!;
    const withinBounds =
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    if (!withinBounds) {
      stableCentersRef.current = null;
      if (localHoverIndex !== null) setLocalHoverIndex(null);
      if (useDragStore.getState().hoverBoardLane === playerID) {
        setHoverBoard(null, null);
      }
      return;
    }

    if (!stableCentersRef.current) {
      const cardEls = Array.from(
        containerRef.current!.querySelectorAll<HTMLElement>("[data-card-id]"),
      );
      stableCentersRef.current = cardEls.map((el) => {
        const cardRect = el.getBoundingClientRect();
        return cardRect.left + cardRect.width / 2;
      });
    }

    const centers = stableCentersRef.current;
    let index = centers.length;
    for (let i = 0; i < centers.length; i++) {
      if (x < centers[i]) {
        index = i;
        break;
      }
    }

    if (index !== localHoverIndex) {
      setLocalHoverIndex(index);
      setHoverBoard(index, playerID);
    }
  }, [activeCard, dragPointerPosition, playerID, props.ctx.currentPlayer, boardLength]);

  const showGhost = localHoverIndex !== null;
  // Deliberately not React.Children.toArray(children): it re-derives each
  // child's key from its position in the array, so shifting the ghost's
  // index would reassign keys to the surrounding cards and force React to
  // remount them (losing state, replaying mount animations). children here
  // is always the plain keyed array from the board's .map(), so splice it
  // directly and preserve the original card.id keys untouched.
  const childArray = Array.isArray(children) ? children : [children];
  const renderedChildren = showGhost
    ? [
        ...childArray.slice(0, localHoverIndex!),
        <motion.div
          key="lane-insert-ghost"
          layout
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.15 }}
          className="w-[6.15vw] h-[8.32vw] rounded-[50%/50%] border-2 border-dashed border-amber-300/70 bg-amber-300/10 pointer-events-none"
        />,
        ...childArray.slice(localHoverIndex!),
      ]
    : childArray;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        containerRef.current = node;
      }}
      className={twMerge(
        `flex justify-center items-center gap-[0.8vw] relative`,
        isValid && "ring-2 ring-orange-300 bg-orange-400/10",
        isOver && "ring-2 ring-green-300 bg-green-400/20",
      )}
      style={{
        height: "calc(36%)", // Adjust height to account for gap
        width: "calc(55%)", // Adjust width to account for gap
      }}
    >
      <AnimatePresence initial={false}>{renderedChildren}</AnimatePresence>
    </div>
  );
};

export default Lane;
