// Trigger matching: which "whenever X" clauses care about a given window.
//
// Firing lives in game/index.ts (it needs executeEffects); everything here is
// pure predicate logic so it can be unit-tested and reused by both the
// interception path and the queued-reaction path.

import type {
  Card,
  EffectContext,
  GameState,
  PlayerID,
  TargetCondition,
  TriggerDef,
  TriggerEventType,
  TriggerWindow,
  TriggerWindowType,
} from "../types";
import { checkSingleTargetCondition } from "./effectEngine";

/**
 * How each authored trigger type maps onto an internal window, plus the preset
 * filters that distinguish types sharing a window.
 *
 * `subjectKind` — the subject must be a minion / a hero / either.
 * `selfOnly`    — the subject must BE the reacting card (ON_SELF_DAMAGE).
 * `requires`    — extra predicate over the window's captured data.
 */
interface TriggerSpec {
  window: TriggerWindowType;
  subjectKind?: "card" | "player";
  selfOnly?: boolean;
  requires?: (w: TriggerWindow) => boolean;
}

export const TRIGGER_SPECS: Record<TriggerEventType, TriggerSpec> = {
  ON_SELF_DAMAGE: { window: "DAMAGE", subjectKind: "card", selfOnly: true },
  ON_MINION_DAMAGE: { window: "DAMAGE", subjectKind: "card" },
  ON_HERO_DAMAGE: { window: "DAMAGE", subjectKind: "player" },
  ON_MINION_DEATH: { window: "DEATH", subjectKind: "card" },
  // Plain heals ignore pure-overheal events; OVERHEAL is the mirror image.
  ON_CHARACTER_HEAL: {
    window: "HEAL",
    requires: (w) => (w.data?.amount ?? 0) > 0,
  },
  ON_MINION_HEALED: {
    window: "HEAL",
    subjectKind: "card",
    requires: (w) => (w.data?.amount ?? 0) > 0,
  },
  OVERHEAL: { window: "HEAL", requires: (w) => (w.data?.overheal ?? 0) > 0 },
  ON_SUMMON: { window: "SUMMON", subjectKind: "card" },
  ON_MINION_PLAYED: {
    window: "SUMMON",
    subjectKind: "card",
    requires: (w) => w.data?.playedFromHand === true,
  },
  ON_CARD_PLAYED: { window: "CARD_PLAYED" },
  ON_SPELL_CAST: { window: "SPELL_CAST" },
  ON_SECRET_PLAYED: { window: "SECRET_PLAYED" },
  ON_END_TURN: { window: "TURN_END" },
  ON_START_TURN: { window: "TURN_START" },
  ON_MINION_ATTACK: { window: "ATTACK_DECLARED", subjectKind: "card" },
  ON_ENEMY_ATTACK: { window: "ATTACK_DECLARED" },
};

/**
 * Windows whose effects must run INLINE, mid-action, because the rest of the
 * action reads the result — armor gained "when your hero is attacked" has to
 * exist before combat damage is computed. Everything else queues.
 */
export const INTERCEPTION_WINDOWS: ReadonlySet<TriggerWindowType> = new Set([
  "ATTACK_DECLARED",
]);

export function isInterceptionWindow(window: TriggerWindowType): boolean {
  return INTERCEPTION_WINDOWS.has(window);
}

/** Does `def` on a card controlled by `ownerId` react to this window? */
export function triggerMatches(
  def: TriggerDef,
  owner: Card,
  ownerId: PlayerID,
  window: TriggerWindow,
  G: GameState,
  ctx: EffectContext["ctx"],
): boolean {
  const spec = TRIGGER_SPECS[def.on];
  if (!spec || spec.window !== window.window) return false;
  if (spec.requires && !spec.requires(window)) return false;

  // Player scope, measured from the reacting card's controller.
  if (def.player !== "ANY_PLAYER") {
    const isFriendly = window.actingPlayer === ownerId;
    if (def.player === "FRIENDLY" && !isFriendly) return false;
    if (def.player === "ENEMY" && isFriendly) return false;
  }

  const subject = window.subject;

  // Subject shape. A spec that demands a subject can't match a window without
  // one (a turn window has no subject at all).
  if (spec.subjectKind) {
    if (!subject || subject.kind !== spec.subjectKind) return false;
  }

  // Identity filters: ON_SELF_DAMAGE only fires for its own card; "exclude"
  // stops Knife Juggler pinging on his own arrival.
  const isSelf = subject?.kind === "card" && subject.id === owner.id;
  if (spec.selfOnly && !isSelf) return false;
  if (def.self === "only" && !isSelf) return false;
  if (def.self === "exclude" && isSelf) return false;

  // Conditions inspect the SUBJECT card (a Beast died, a <=3 attack minion was
  // summoned). With a hero subject there is no card to test, so they can't pass.
  if (def.conditions?.length) {
    const subjectCard = subject ? findSubjectCard(G, subject) : undefined;
    if (!subjectCard) return false;
    const context = {
      G,
      ctx,
      card: subjectCard,
      playerID: ownerId,
      location: "board",
      type: "minion",
    } as EffectContext;
    if (
      !def.conditions.every((cond: TargetCondition) =>
        checkSingleTargetCondition(subjectCard, cond, context, owner.id),
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * The subject's live Card. Checks the board first, then the owner's weapon —
 * a weapon can be a damage/heal subject only in odd cases, but Sword of
 * Justice proves weapons DO react, and symmetry costs nothing.
 *
 * The graveyard is the last resort, and it is what makes conditions work on the
 * CARD_PLAYED / SPELL_CAST windows: a spell is pushed to the graveyard BEFORE
 * those windows open, so it exists nowhere else by the time a reacting card
 * wants to inspect it (Unbound Elemental testing the played card for Overload).
 * Board is checked first, so a corpse in the DEATH window — which fires before
 * the sweep, and is therefore still on the board — is unaffected.
 */
export function findSubjectCard(
  G: GameState,
  subject: { kind: "card" | "player"; id: string; ownerId: PlayerID },
): Card | undefined {
  if (subject.kind !== "card") return undefined;
  const onBoard = G.board[subject.ownerId]?.find((c) => c.id === subject.id);
  if (onBoard) return onBoard;
  const weapon = G.players[subject.ownerId]?.weapon;
  if (weapon && weapon.id === subject.id) return weapon;
  return G.graveyard.find((g) => g.card.id === subject.id)?.card;
}

/**
 * Everything in play that can react, in Hearthstone's resolution order: the
 * active player's board left-to-right then their weapon, then the opponent's.
 * (A future secrets zone appends to each side here.)
 */
export function listTriggerOwners(
  G: GameState,
  activePlayer: PlayerID,
): Array<{ card: Card; ownerId: PlayerID }> {
  const enemy: PlayerID = activePlayer === "0" ? "1" : "0";
  const owners: Array<{ card: Card; ownerId: PlayerID }> = [];
  for (const pId of [activePlayer, enemy]) {
    G.board[pId]?.forEach((card) => owners.push({ card, ownerId: pId }));
    const weapon = G.players[pId]?.weapon;
    if (weapon) owners.push({ card: weapon, ownerId: pId });
  }
  return owners;
}

/** True while a card is still somewhere it can legally react from. */
export function isInPlay(G: GameState, cardId: string, ownerId: PlayerID) {
  return (
    !!G.board[ownerId]?.some((c) => c.id === cardId) ||
    G.players[ownerId]?.weapon?.id === cardId
  );
}
