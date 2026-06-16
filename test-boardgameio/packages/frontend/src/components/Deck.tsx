import React, { useState } from "react";
import { motion } from "motion/react";
import { useAudioStore } from "@/stores/audioStore";

const deck_frame = "assets/deck_frame.png";

type Props = {
  type: "edit" | "collectionManager" | "play";
  id: string;
  image: string;
  name: string;
  handleEditDeck?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  handleDeleteDeck?: (
    id: string,
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => void;
  // Props for the "edit" variant
  setDeckName?: (value: string) => void;
  isPremade?: boolean;
};

const Deck = ({
  type,
  id,
  name,
  handleDeleteDeck,
  handleEditDeck,
  image,
  setDeckName,
  isPremade = false,
}: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);

  // --- Variant: Collection Manager ---
  if (type === "collectionManager") {
    return (
      <motion.div
        layout
        layoutId={id}
        key={id}
        className="flex h-[4vw] min-h-[4vw] w-[10vw] items-end gap-[0.5vw] bg-black/40 rounded cursor-pointer relative"
        onClick={(e) => {
          handleEditDeck ? handleEditDeck(e) : null;
        }}
        onMouseEnter={() => playSfx("button-over")}
        style={{
          backgroundImage: `url(${image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <img
          src={deck_frame}
          alt="Deck Frame"
          className="absolute z-10 min-w-[11.5vw] top-[-0.5vw] left-[-1vw]"
          draggable="false"
        />
        <span className="w-full p-[0.3vw] text-[1.1vw] bg-gradient-to-r from-black to-transparent text-white">
          {name}
        </span>

        {!id.startsWith("premade-") && (
          <button
            onClick={(e) => (handleDeleteDeck ? handleDeleteDeck(id, e) : null)}
            className="text-red-400 hover:text-red-600 text-[0.8vw] px-[0.3vw] z-30"
          >
            ✕
          </button>
        )}
      </motion.div>
    );
  }

  // --- Variant: Edit ---
  if (type === "edit") {
    return (
      <motion.div
        layout
        title={name}
        layoutId={id}
        className="flex h-[4vw] w-[10vw] items-end gap-[0.5vw] bg-black/40 rounded border z-30 relative"
        style={{
          backgroundImage: `url(${image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <img
          src={deck_frame}
          alt="Deck Frame"
          className="absolute z-10 min-w-[11.5vw] top-[-0.5vw] left-[-1vw] pointer-events-none"
          draggable="false"
        />
        <div className="flex items-center w-full bg-gradient-to-r from-black to-transparent pr-[0.3vw] z-20">
          <input
            type="text"
            title={name}
            value={name}
            onChange={(e) => setDeckName?.(e.target.value)}
            placeholder="Enter deck name..."
            className="w-full p-[0.3vw] text-[1.1vw] bg-transparent text-white focus:outline-none"
            maxLength={30}
            readOnly={isPremade}
          />
          {isPremade && (
            <span className="text-[0.6vw] text-amber-400 font-bold whitespace-nowrap self-center*">
              (Premade)
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
};

export default Deck;
