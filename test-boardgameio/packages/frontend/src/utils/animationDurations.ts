interface AnimationData {
  duration: number;
}

export const ATTACK_ANIMATION: AnimationData = {
  duration: 500,
};

export const DEATH_ANIMATION: AnimationData = {
  duration: 300,
};

// A card discarded from hand.
//
// Two numbers, because the hold and the flourish are not the same window. The
// queue holds for `duration` while the card is still in the visual hand; the
// visual state then advances, the card unmounts, and its AnimatePresence exit
// plays for `exit` on the way out. Holding for the full `exit` would stall the
// game behind an animation the player has already read.
export const DISCARD_ANIMATION: AnimationData & {
  exit: number;
  stagger: number;
} = {
  duration: 400,
  exit: 1400,
  // Doomguard discards two at once; offset them so they read as a sequence.
  stagger: 180,
};

// A minion transformed in place. The board slot keeps its id and so never
// remounts; this is the beat that lets the player register the swap.
export const TRANSFORM_ANIMATION: AnimationData & { stagger: number } = {
  duration: 500,
  // A board-wide transform (Hex on everything) shouldn't fire one stacked cue.
  stagger: 160,
};

export const DESTROY_WEAPON_ANIMATION: AnimationData = {
  duration: 300,
};

export const SPELL_CAST_ANIMATION: AnimationData = {
  duration: 200,
};

export const MINION_SUMMONED_ANIMATION: AnimationData = {
  duration: 600,
};

export const TRIGGER_ANIMATION: AnimationData & { stagger: number } = {
  duration: 500,
  // Offset between trigger firings that land in the SAME replay step, so two
  // minions reacting to one event read as a sequence instead of a single flash.
  stagger: 220,
};

// Mulligan completion: the overlay shows the replaced cards for this long...
export const MULLIGAN_REVEAL_ANIMATION: AnimationData = {
  duration: 2000,
};

// ...then the hands settle onto the board while the queue stays held.
export const MULLIGAN_END_ANIMATION: AnimationData = {
  duration: 3000,
};

// How long the mulligan cards sit alone in the hand (after the overlay
// closes) before the first turn's drawn card lands. Part of the settle
// window above, so it must stay <= MULLIGAN_END_ANIMATION.duration.
export const MULLIGAN_TURN_DRAW_DELAY = 1500; // ms

export const MINION_PLACED_ANIMATION: AnimationData = {
  duration: 100,
};

export const HIT_NUMBER_ANIMATION: AnimationData = {
  duration: 500,
};

export const CARD_PLAYED_ANIMATION: AnimationData = {
  duration: 1500,
};
