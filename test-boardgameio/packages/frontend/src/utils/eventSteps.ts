// Splits one move's seq-ordered event log into sequential "resolution steps"
// for staggered replay. The authoritative state resolved atomically on the
// engine; these steps exist purely so the player can watch a chain resolve:
//
//   step 1: the action + its immediate damage (+ first death wave)
//   step 2: deathrattle effects triggered by that wave (+ next death wave)
//   step 3: ... and so on for chain reactions
//
// The engine records deathrattle effect events BEFORE their owner's death
// event (effects execute inside processDeaths before the death is recorded),
// so a wave reads like: [rattle effects, death, death, ...]. We therefore cut
// a new step whenever a non-death event arrives after we've seen deaths in
// the current step — that's the start of the next chain wave.
import type { GameEvent } from "@project/shared";

// Total over GameEvent so a new event type must declare whether it continues a
// chain — an omission would silently merge a post-death effect into the wave
// that killed the minion instead of starting its own step.
const CHAIN_EVENTS: Record<GameEvent["type"], boolean> = {
  damage: true,
  heal: true,
  summon: true,
  drawCard: true,
  addToHand: true,
  returnToHand: true,
  discard: true,
  equip: true,
  applyModifier: true,
  changeKey: true,
  freeze: true,
  divineShield: true,
  taunt: true,
  stealth: true,
  charge: true,
  rush: true,
  windfury: true,
  poisonous: true,
  immune: true,
  durability: true,
  silence: true,
  transform: true,
  // Sylvanas resolves hers from a deathrattle, so it must open its own step
  // rather than merge into the wave that killed her.
  takeControl: true,
  // Not chain continuations — bookkeeping, turn structure, or the action itself:
  attack: false,
  battlecry: false,
  death: false,
  cardPlayed: false,
  minionPlaced: false,
  endTurn: false,
  beginTurn: false,
  spell: false,
  mana: true,
  armor: false,
  debug: false,
  burnCard: false,
  heroPower: false,
  gameEnd: false,
  coinToss: false,
  mulligan: false,
};

/** Event types that indicate "the chain is continuing" after a death wave. */
const CHAIN_EVENT_TYPES = new Set<GameEvent["type"]>(
  (Object.keys(CHAIN_EVENTS) as GameEvent["type"][]).filter(
    (t) => CHAIN_EVENTS[t],
  ),
);

export function splitEventsIntoSteps(events: GameEvent[]): GameEvent[][] {
  const steps: GameEvent[][] = [];
  let current: GameEvent[] = [];
  let deathsInCurrent = false;

  for (const event of events) {
    if (event.type === "death") {
      current.push(event);
      deathsInCurrent = true;
      continue;
    }

    if (deathsInCurrent && CHAIN_EVENT_TYPES.has(event.type)) {
      // A death wave already played out in this step and the chain continues:
      // start the next wave as its own step.
      steps.push(current);
      current = [event];
      deathsInCurrent = false;
      continue;
    }

    current.push(event);
  }

  if (current.length > 0) steps.push(current);
  return steps;
}
