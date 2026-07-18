interface AnimationData {
  duration: number;
}

export const ATTACK_ANIMATION: AnimationData = {
  duration: 500,
};

export const DEATH_ANIMATION: AnimationData = {
  duration: 300,
};

export const SPELL_CAST_ANIMATION: AnimationData = {
  duration: 200,
};

export const MINION_SUMMONED_ANIMATION: AnimationData = {
  duration: 400,
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
