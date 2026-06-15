import { useDragStore } from "@/stores/dragStore";
import type { Ctx } from "boardgame.io";

interface Props {
  playerID: string | null;
  ctx: Ctx;
}

const AttackArrow = ({ playerID, ctx }: Props) => {
  const attackingCardId = useDragStore((s) => s.attackingCardId);
  const attackOrigin = useDragStore((s) => s.attackOrigin);
  const cursorPosition = useDragStore((s) => s.cursorPosition);
  const hoveredTarget = useDragStore((s) => s.hoveredTarget);

  if (!attackingCardId || !attackOrigin || !cursorPosition) return null;
  if (playerID && ctx.currentPlayer !== playerID) return null;

  const dx = cursorPosition.x - attackOrigin.x;
  const dy = cursorPosition.y - attackOrigin.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 20) return null;

  const angle = Math.atan2(dy, dx);
  const arrowHeadSize = 40;

  // If hovering over a target, shorten the line a bit extra to fit the bullseye cleanly
  const lineEndX = cursorPosition.x - Math.cos(angle) * arrowHeadSize;
  const lineEndY = cursorPosition.y - Math.sin(angle) * arrowHeadSize;

  const headAngle1 = angle + (3 * Math.PI) / 4;
  const headAngle2 = angle - (3 * Math.PI) / 4;
  const head1X = cursorPosition.x + Math.cos(headAngle1) * arrowHeadSize;
  const head1Y = cursorPosition.y + Math.sin(headAngle1) * arrowHeadSize;
  const head2X = cursorPosition.x + Math.cos(headAngle2) * arrowHeadSize;
  const head2Y = cursorPosition.y + Math.sin(headAngle2) * arrowHeadSize;

  // Determine if bullseye should render
  const isOverTarget = !!hoveredTarget && hoveredTarget.id !== attackingCardId;

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-50"
      style={{ position: "fixed", top: 0, left: 0 }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Arrow line */}
      <line
        x1={attackOrigin.x}
        y1={attackOrigin.y}
        x2={lineEndX}
        y2={lineEndY}
        stroke="#ef4444"
        strokeDasharray="20 20"
        strokeWidth="24"
        filter="url(#glow)"
        className="animate-dash"
      />

      {/* Arrowhead */}
      <polygon
        points={`${cursorPosition.x},${cursorPosition.y} ${head1X},${head1Y} ${head2X},${head2Y}`}
        fill="#ef4444"
        filter="url(#glow)"
      />

      {/* 🎯 Bullseye Render Group */}
      {isOverTarget && (
        <g filter="url(#glow)" className="animate-pulse">
          {/* Outer Ring */}
          <circle
            cx={cursorPosition.x}
            cy={cursorPosition.y}
            r="35"
            fill="none"
            stroke="#ef4444"
            strokeWidth="6"
          />
          {/* Inner Ring */}
          <circle
            cx={cursorPosition.x}
            cy={cursorPosition.y}
            r="20"
            fill="none"
            stroke="#ef4444"
            strokeWidth="4"
          />
          {/* Center Point */}
          <circle
            cx={cursorPosition.x}
            cy={cursorPosition.y}
            r="6"
            fill="#ef4444"
          />
          {/* Crosshairs */}
          <line
            x1={cursorPosition.x - 45}
            y1={cursorPosition.y}
            x2={cursorPosition.x - 25}
            y2={cursorPosition.y}
            stroke="#ef4444"
            strokeWidth="4"
          />
          <line
            x1={cursorPosition.x + 25}
            y1={cursorPosition.y}
            x2={cursorPosition.x + 45}
            y2={cursorPosition.y}
            stroke="#ef4444"
            strokeWidth="4"
          />
          <line
            x1={cursorPosition.x}
            y1={cursorPosition.y - 45}
            x2={cursorPosition.x}
            y2={cursorPosition.y - 25}
            stroke="#ef4444"
            strokeWidth="4"
          />
          <line
            x1={cursorPosition.x}
            y1={cursorPosition.y + 25}
            x2={cursorPosition.x}
            y2={cursorPosition.y + 45}
            stroke="#ef4444"
            strokeWidth="4"
          />
        </g>
      )}
    </svg>
  );
};

export default AttackArrow;
