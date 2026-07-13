import type { GameState } from "@project/shared";
import type { Ctx } from "boardgame.io";
import React from "react";

type Props = {
  ctx: Ctx;
  G: GameState;
};

const EventHistory = (props: Props) => {
  return (
    <div
      className="bg-yellow-400/40 h-[65vh] w-[5.3vw] absolute top-[10.3vw] left-[10.5vw]"
      style={{
        transform: `rotateY(-10deg) rotateX(8deg) rotateZ(0.1deg) translateZ(${4 * 0.21}vw)`,
        transformOrigin: "center center",
      }}
    >
      {/* Events go Here */}
    </div>
  );
};

export default EventHistory;
