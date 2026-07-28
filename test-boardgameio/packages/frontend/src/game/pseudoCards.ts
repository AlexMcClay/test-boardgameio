// Synthetic Cards for the two things that can aim an arrow but aren't cards.
//
// The targeting/highlight path (canTargetHighlight, validateTargetQuery) hard-
// requires a non-null Card, so a hero attack and a hero power each need a
// stand-in to carry a targetQuery. These never enter G — they exist only as
// dragStore.activeCard for the duration of an aim.
import type { Card, Player } from "@project/shared";

/** The fields both stand-ins share; only the aiming-relevant ones vary. */
function pseudoCard(
  id: string,
  player: Player,
  fields: Pick<
    Card,
    "title" | "description" | "effects" | "targetQuery" | "attacksLeft"
  >,
): Card {
  return {
    id,
    originalID: id,
    onPlace: [],
    isMinion: false,
    damageTaken: 0,
    class: player.hero.class,
    set: [],
    ...fields,
  };
}

/** Stand-in for a hero swinging a weapon. Heroes can only hit the enemy side. */
export function heroAttackCard(player: Player): Card {
  return pseudoCard(`hero-${player.id}`, player, {
    title: player.name,
    description: "",
    effects: [],
    targetQuery: { side: "enemy", type: ["card", "player"] },
    attacksLeft: player.attacksLeft,
  });
}

/** Stand-in for a targeted hero power; carries the power's own targetQuery. */
export function heroPowerCard(player: Player): Card {
  const heroPower = player.hero.heroPower!;
  return pseudoCard(`hero-power-${player.id}`, player, {
    title: heroPower.name,
    description: heroPower.description,
    effects: heroPower.effects,
    targetQuery: heroPower.targetQuery,
    attacksLeft: 0,
  });
}
