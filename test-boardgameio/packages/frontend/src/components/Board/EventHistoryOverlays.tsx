// Static (non-animated) versions of the HitNumbers.tsx / PlacedCard.tsx deathrattle
// overlays, for use inside the EventHistory hover popover where snapshots are
// historical (not tied to a live DOM element or animation lifecycle).

const damage_icon = "assets/damage_icon.png";
const skullIcon = "assets/icons/skull.png";

interface StaticHitNumberProps {
  value: number;
  damageType: "damage" | "heal";
}

export const StaticHitNumber = ({
  value,
  damageType,
}: StaticHitNumberProps) => {
  const isDamage = damageType === "damage";

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
      <div className="relative flex items-center justify-center">
        <img
          src={damage_icon}
          alt="damage"
          className="absolute w-[6vw] h-[6vw] min-h-[6vw] min-w-[6vw] object-contain"
          style={{
            filter: isDamage
              ? "drop-shadow(0 0 10px rgba(220, 38, 38, 0.8))"
              : "drop-shadow(0 0 10px rgba(34, 197, 94, 0.8)) hue-rotate(90deg)",
          }}
        />
        <div
          className={`relative z-10 font-black text-[2vw] pointer-events-none select-none -top-1 -left-1 ${
            isDamage ? "text-white" : "text-green-500"
          }`}
          style={{
            textShadow: isDamage
              ? "0 0 10px rgba(220, 38, 38, 0.8), 0 0 20px rgba(220, 38, 38, 0.6), 2px 2px 4px rgba(0, 0, 0, 0.9)"
              : "0 0 10px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.6), 2px 2px 4px rgba(0, 0, 0, 0.9)",
            WebkitTextStroke: isDamage ? "1px #000000" : "2px #14532d",
          }}
        >
          {isDamage ? "-" : "+"}
          {value}
        </div>
      </div>
    </div>
  );
};

export const DeathSkullOverlay = () => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
      <img
        src={skullIcon}
        alt="Died"
        className="object-contain w-[6vw] h-[6vw]"
        style={{
          filter: "drop-shadow(0 0 8px rgba(0, 0, 0, 0.9))",
        }}
        draggable="false"
      />
    </div>
  );
};
