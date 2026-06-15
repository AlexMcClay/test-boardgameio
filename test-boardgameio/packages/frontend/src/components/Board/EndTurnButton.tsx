import { useAudioStore } from "@/stores/audioStore";
import { hasToEndTurn, type GameState } from "@project/shared";
import type { BoardProps } from "boardgame.io/dist/types/packages/react";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";

interface Props extends BoardProps<GameState> {}
const exit_button = "assets/exit_button.png"; // Path to your exit button image

const EndTurnButton = (props: Props) => {
  const playerHasToEndTurn = useMemo(() => {
    if (props.playerID && props.playerID === props.ctx.currentPlayer)
      return hasToEndTurn(props.playerID, props.G);
    return false;
  }, [props.ctx.currentPlayer, props.G, props.playerID]);

  const playSfx = useAudioStore((state) => state.playSfx);

  return (
    <button
      className={twMerge(
        ` rounded-[50%/25%] absolute top-[44.5vh] h-[4vh] left-[79.2vw] w-[6.6vw] text-[1vw] uppercase font-belwe text-black scale-105   cursor-pointer z-50 brightness-80
           hover:scale-110 active:scale-100 transition-all duration-150 hue-rotate-[-10deg]
            `,
        props?.playerID
          ? props?.playerID != props.ctx.currentPlayer
            ? "text-[0.8vw]"
            : ``
          : "",
        playerHasToEndTurn && "canPlayCard",
      )}
      onMouseEnter={() => {
        playSfx("button-over");
      }}
      onClick={() => {
        playSfx("button-click");
        props.moves.endTurn();
      }}
      disabled={
        props.playerID ? props.playerID != props.ctx.currentPlayer : false
      }
      style={{
        backgroundImage: props?.playerID
          ? props?.playerID != props.ctx.currentPlayer
            ? ""
            : `url(${exit_button})`
          : `url(${exit_button})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        // darken background with filter
      }}
    >
      {props?.playerID
        ? props?.playerID != props.ctx.currentPlayer
          ? "Enemy Turn"
          : "End Turn"
        : "End Turn"}
    </button>
  );
};

export default EndTurnButton;
