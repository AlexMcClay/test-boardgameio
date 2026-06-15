import { useAudioStore } from "@/stores/audioStore";
import { useEffect, useRef } from "react";

type Props = {
  mana: number;
};

const your_turn = "assets/Your_Turn.png"; // Path to your exit button image

const YourTurn = ({ mana }: Props) => {
  const playSfx = useAudioStore((state) => state.playSfx);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      playSfx("your-turn");
    }
  }, [playSfx]); // Added playSfx to dependency array

  return (
    // REMOVED: top-[12vw] left-[25vw] absolute
    // CHANGED TO: relative so the text absolute positioning still anchors to this container
    <div className="relative flex flex-col items-center justify-center yourTurnGlow">
      <img
        src={your_turn}
        alt="your-turn"
        // REMOVED: top and left from here as well
        className="w-[50vw] h-auto"
      />
      {/* Positioned the text relative to the image banner center */}
      <p className="text-black font-belwe absolute top-[18.6vw] text-[1.5vw]">
        You Have {mana} mana.
      </p>
    </div>
  );
};

export default YourTurn;
