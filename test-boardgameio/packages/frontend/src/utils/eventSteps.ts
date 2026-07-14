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

/** Event types that indicate "the chain is continuing" after a death wave. */
const CHAIN_EVENT_TYPES = new Set<GameEvent["type"]>([
  "damage",
  "heal",
  "summon",
  "drawCard",
  "addToHand",
  "returnToHand",
  "discard",
  "equip",
  "applyModifier",
  "changeKey",
  "freeze",
  "divineShield",
  "taunt",
  "stealth",
  "charge",
  "rush",
  "windfury",
]);

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
