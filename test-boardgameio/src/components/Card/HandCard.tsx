import React, { useState } from "react";
import DragCard from "./DragCard";
import type { Card } from "@/types";

type Props = {
  size: number; // Array of cards in hand
  index: number; // Index of the card in the hand
  isTop?: boolean; // Whether the player is on top (for styling)
  card: Card;
};

const HandCard = ({ size, index, isTop, card }: Props) => {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate the angle for fanning
  const maxFanAngle = 30; // degrees, total spread
  const angleStep = size > 1 ? maxFanAngle / (size - 1) : 0;
  const angle = -maxFanAngle / 2 + index * angleStep;

  // Calculate vertical offset for fanning
  const verticalOffset = 10; // Adjust this value for how much the cards should be pushed down
  const middle = Math.floor(size / 2);
  // Calculate translateY based on index and size
  // console.log(Math.abs(middle - index));
  const translateY = size > 1 ? Math.abs(middle - index) * verticalOffset : 0;

  return (
    <div
      key={`${isTop ? "p1" : "p0"}-hand-${card.id}`}
      className="relative transition-all duration-300 ease-in-out hover:scale-110 hover:z-50"
      style={{
        marginLeft: index > 0 ? `-${size * 9}px` : "0",
        zIndex: index + 1,
        // transform: isHovered
        //   ? "none"
        //   : `rotate(${angle}deg) translateY(${isTop ? -translateY : translateY}px)`,
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.zIndex = "100";
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.zIndex = (index + 1).toString();
      }}
    >
      <DragCard card={card} />
    </div>
  );
};

export default HandCard;
