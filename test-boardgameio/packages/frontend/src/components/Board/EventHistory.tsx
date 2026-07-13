import type { Card, GameEvent, GameState, Player } from "@project/shared";
import type { Ctx, PlayerID } from "boardgame.io";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { twMerge } from "tailwind-merge";
import CardComponent from "../Card";
import HeroPowerExpanded from "../HeroPower/HeroPowerExpanded";
import { DeathSkullOverlay, StaticHitNumber } from "./EventHistoryOverlays";

const weapon_attack_icon = "/assets/icons/weapon_attack.png";

type Props = {
  ctx: Ctx;
  G: GameState;
  playerID: PlayerID;
};

type TopLevelEvent = Extract<
  GameEvent,
  { type: "cardPlayed" | "heroPower" | "attack" }
>;

type ChildEvent = Extract<
  GameEvent,
  {
    type:
      | "damage"
      | "heal"
      | "death"
      | "drawCard"
      | "addToHand"
      | "returnToHand"
      | "discard"
      | "equip"
      | "summon";
  }
>;

const isTopLevelEvent = (e: GameEvent): e is TopLevelEvent =>
  e.type === "cardPlayed" || e.type === "heroPower" || e.type === "attack";

const isChildEvent = (e: GameEvent): e is ChildEvent =>
  e.type === "damage" ||
  e.type === "heal" ||
  e.type === "death" ||
  e.type === "drawCard" ||
  e.type === "addToHand" ||
  e.type === "returnToHand" ||
  e.type === "discard" ||
  e.type === "equip" ||
  e.type === "summon";

function getEventOwner(event: TopLevelEvent): PlayerID {
  return event.type === "attack" ? event.attackerPlayerId : event.playerId;
}

function getEventImageUrl(
  event: TopLevelEvent,
  G: GameState,
): string | undefined {
  if (event.type === "cardPlayed") return event.card.imageUrl;
  if (event.type === "heroPower") return event.heroPower.imageUrl;
  // attack
  if (event.card) return event.card.imageUrl;
  return G.players[event.attackerPlayerId]?.heroPortrait;
}

type SnapshotEntry = {
  key: string;
  snapshot: Card | Player;
  overlay?: "damage" | "heal" | "death";
  overlayValue?: number;
  hidden?: boolean;
};

// Group child events by affected target: same-type damage/heal on the same
// target aggregates into one number; a matching death always wins the overlay.
// Drawing/adding a card to the OPPONENT's hand is hidden information - the
// local viewer shouldn't see what it actually was.
function buildEntries(
  children: ChildEvent[],
  localPlayerID: PlayerID,
): SnapshotEntry[] {
  const byId = new Map<string, SnapshotEntry>();
  const order: string[] = [];
  let anonCounter = 0;

  children.forEach((event) => {
    if (event.type === "damage" || event.type === "heal") {
      const id = event.targetId;
      if (!byId.has(id)) {
        order.push(id);
        byId.set(id, { key: id, snapshot: event.snapshot });
      }
      const entry = byId.get(id)!;
      if (entry.overlay === "death") return; // death already wins
      if (entry.overlay === event.type) {
        entry.overlayValue = (entry.overlayValue ?? 0) + event.value;
      } else {
        entry.overlay = event.type;
        entry.overlayValue = event.value;
      }
      entry.snapshot = event.snapshot;
    } else if (event.type === "death") {
      const id = event.cardId;
      if (!byId.has(id)) {
        order.push(id);
        byId.set(id, { key: id, snapshot: event.snapshot });
      }
      const entry = byId.get(id)!;
      entry.overlay = "death";
      entry.overlayValue = undefined;
      entry.snapshot = event.snapshot;
    } else {
      const id = `${event.type}-${anonCounter++}`;
      order.push(id);
      const hidden =
        (event.type === "drawCard" || event.type === "addToHand") &&
        event.playerId !== localPlayerID;
      const snapshot = event.type === "summon" ? event.card : event.snapshot;
      byId.set(id, { key: id, snapshot, hidden });
    }
  });

  return order.map((id) => byId.get(id)!);
}

function isSnapshotPlayer(snapshot: Card | Player): snapshot is Player {
  return "hero" in snapshot;
}

// CardComponent has a fixed intrinsic size (w-[7.8vw], aspect 5/7). Scaling it
// with a bare `transform: scale()` doesn't reserve the extra layout space it
// visually occupies, so siblings overlap it. This wrapper reserves the scaled
// box explicitly so flex layout accounts for the real rendered size.
const CARD_BASE_WIDTH_VW = 7.8;
const CARD_BASE_HEIGHT_VW = (CARD_BASE_WIDTH_VW * 7) / 5;

function ScaledCard({
  card,
  scale,
  back = false,
}: {
  card: Card;
  scale: number;
  back?: boolean;
}) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: `${CARD_BASE_WIDTH_VW * scale}vw`,
        height: `${CARD_BASE_HEIGHT_VW * scale}vw`,
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
        <CardComponent
          card={{ ...card, id: `history-${card.id}` }}
          type="game"
          back={back}
        />
      </div>
    </div>
  );
}

function OverlayLayer({
  overlay,
  overlayValue,
}: {
  overlay?: "damage" | "heal" | "death";
  overlayValue?: number;
}) {
  if (overlay === "death") return <DeathSkullOverlay />;
  if (
    (overlay === "damage" || overlay === "heal") &&
    overlayValue !== undefined
  ) {
    return <StaticHitNumber value={overlayValue} damageType={overlay} />;
  }
  return null;
}

function SnapshotVisual({
  snapshot,
  overlay,
  overlayValue,
  scale = 1,
  hidden = false,
}: {
  snapshot: Card | Player;
  overlay?: "damage" | "heal" | "death";
  overlayValue?: number;
  scale?: number;
  hidden?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      {isSnapshotPlayer(snapshot) ? (
        <div className="w-[7vw] h-[7vw] rounded-full overflow-hidden relative border-2 border-white/60">
          <img
            src={snapshot.heroPortrait}
            alt={snapshot.name}
            className="w-full h-full object-cover"
            draggable="false"
          />
          <div className="absolute bottom-0 inset-x-0 text-center text-white text-[0.9vw] font-bold bg-black/60">
            {snapshot.health} HP
          </div>
        </div>
      ) : (
        <div className={twMerge(overlay === "death" && "grayscale-50")}>
          <ScaledCard card={snapshot} scale={scale} back={hidden} />
        </div>
      )}
      <OverlayLayer overlay={overlay} overlayValue={overlayValue} />
    </div>
  );
}

function ParentVisual({
  event,
  G,
  overlay,
  overlayValue,
}: {
  event: TopLevelEvent;
  G: GameState;
  overlay?: "damage" | "heal" | "death";
  overlayValue?: number;
}) {
  if (event.type === "heroPower") {
    return (
      <div className="relative shrink-0">
        <HeroPowerExpanded heroPower={event.heroPower} />
        <OverlayLayer overlay={overlay} overlayValue={overlayValue} />
      </div>
    );
  }
  if (event.type === "cardPlayed") {
    return (
      <div className="relative shrink-0">
        <ScaledCard card={event.card} scale={1.4} />
        <OverlayLayer overlay={overlay} overlayValue={overlayValue} />
      </div>
    );
  }
  // attack
  if (event.card) {
    return (
      <div className="relative shrink-0">
        <div className={twMerge(overlay === "death" && "grayscale-75")}>
          <ScaledCard card={event.card} scale={1.4} />
        </div>

        <OverlayLayer overlay={overlay} overlayValue={overlayValue} />
      </div>
    );
  }
  const attacker = G.players[event.attackerPlayerId];
  return (
    <SnapshotVisual
      snapshot={attacker}
      overlay={overlay}
      overlayValue={overlayValue}
    />
  );
}

const Arrow = () => (
  <span className="text-white text-[1.5vw] font-bold select-none px-[0.3vw]">
    →
  </span>
);

// Number of full-size (square) entries that fit in the list by default.
const MAX_HISTORY_SLOTS = 7;

interface PopoverProps {
  event: TopLevelEvent;
  eventIndex: number;
  eventHistory: GameEvent[];
  G: GameState;
  playerID: PlayerID;
  position: { x: number; y: number } | null;
}

const EventHistoryPopover = ({
  event,
  eventIndex,
  eventHistory,
  G,
  playerID,
  position,
}: PopoverProps) => {
  if (!position) return null;

  const children = eventHistory.filter(
    (e): e is ChildEvent => isChildEvent(e) && e.eventRef === eventIndex,
  );

  const isMinionVsMinion =
    event.type === "attack" &&
    event.targetType === "card" &&
    event.card?.isMinion === true;

  const allEntries = buildEntries(children, playerID);

  // Minion-vs-minion attacks show exactly 2 cards: the parent (attacker)
  // carries its own retaliation overlay directly instead of a separate
  // arrow-connected duplicate, and the defender is the only arrow entry
  // (plus any genuinely distinct effects beyond the base 2 combatants).
  let parentOverlay: SnapshotEntry | undefined;
  let entries = allEntries;
  if (isMinionVsMinion && event.type === "attack") {
    parentOverlay = allEntries.find((e) => e.key === event.attackerId);
    entries = allEntries.filter((e) => e.key !== event.attackerId);
  }

  return createPortal(
    <motion.div
      className="fixed z-100 pointer-events-none flex items-center"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.1 }}
    >
      <ParentVisual
        event={event}
        G={G}
        overlay={parentOverlay?.overlay}
        overlayValue={parentOverlay?.overlayValue}
      />
      <div className="flex items-center flex-wrap gap-y-[1vw]">
        {entries.map((entry) => (
          <div key={entry.key} className="flex items-center">
            <Arrow />
            <SnapshotVisual
              snapshot={entry.snapshot}
              overlay={entry.overlay}
              overlayValue={entry.overlayValue}
              hidden={entry.hidden}
            />
          </div>
        ))}
      </div>
    </motion.div>,
    document.body,
  );
};

const EventHistory = ({ G, playerID }: Props) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const topLevelEntries = G.eventHistory
    .map((event, index) => ({ event, index }))
    .filter((e): e is { event: TopLevelEvent; index: number } =>
      isTopLevelEvent(e.event),
    )
    .reverse(); // most recent first

  // Attack entries render at half height (aspect-2/1 vs aspect-square), so
  // they only cost half a "slot". Capacity is 7 slots - the number of
  // full-size entries that fit by default - and we fill from most recent
  // until the next entry would overflow it.
  const visibleEntries: typeof topLevelEntries = [];
  let usedSlots = 0;
  for (const entry of topLevelEntries) {
    const slotCost = entry.event.type === "attack" ? 0.5 : 1;
    if (usedSlots + slotCost > MAX_HISTORY_SLOTS) break;
    usedSlots += slotCost;
    visibleEntries.push(entry);
  }

  const handleMouseEnter = (index: number, e: React.MouseEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    hoverTimerRef.current = setTimeout(() => {
      setHoverPosition({ x: rect.right + 12, y: rect.top });
      setHoveredIndex(index);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredIndex(null);
  };

  return (
    <div
      className=" h-[65vh] w-[5.3vw] absolute top-[10.3vw] left-[10.5vw] z-40 flex flex-col gap-[0.4vw] p-[0.4vw]  pointer-events-auto"
      style={{
        transform: `rotateY(-10deg) rotateX(8deg) rotateZ(0.1deg) translateZ(${4 * 0.21}vw)`,
        transformOrigin: "center center",
      }}
    >
      {visibleEntries.map(({ event, index }) => {
        const isSelf = getEventOwner(event) === playerID;
        const imageUrl = getEventImageUrl(event, G);
        return (
          <motion.div
            initial={{ opacity: 1, x: "-10vw" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25 }}
            key={index}
            onMouseEnter={(e) => handleMouseEnter(index, e)}
            onMouseLeave={handleMouseLeave}
            className={twMerge(
              "aspect-square w-full relative",
              event.type === "attack" && "aspect-2/1 ",
            )}
          >
            <div
              className={twMerge(
                "w-full minion-shadow relative aspect-square border-[0.25vw] rounded-[0.5vw] overflow-hidden cursor-pointer shrink-0",
                isSelf ? "border-blue-500" : "border-red-800",
                event.type === "attack" && "aspect-2/1",
              )}
            >
              {/* Conforming Inset Shadow Overlay */}
              <div
                className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-100 border border-black"
                style={{
                  boxShadow: "inset 0px 0px 5px 2px rgba(0, 0, 0, 1)",
                }}
              />

              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={event.type}
                  className="w-full h-full object-cover"
                  draggable="false"
                />
              )}
            </div>

            {event.type === "attack" && (
              <img
                src={weapon_attack_icon}
                alt="Attack"
                className="absolute w-[3vw] h-[3vw] object-contain pointer-events-none right-[-1vw] top-[-0.2vw] smallShadow"
              />
            )}
          </motion.div>
        );
      })}
      <AnimatePresence>
        {hoveredIndex !== null && (
          <EventHistoryPopover
            key="event-history-popover"
            event={G.eventHistory[hoveredIndex] as TopLevelEvent}
            eventIndex={hoveredIndex}
            eventHistory={G.eventHistory}
            G={G}
            playerID={playerID}
            position={hoverPosition}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventHistory;
