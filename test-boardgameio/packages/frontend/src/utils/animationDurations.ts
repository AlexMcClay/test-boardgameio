interface AnimationData {
  duration: number;
}

export const ATTACK_ANIMATION: AnimationData = {
  duration: 500,
};

export const DEATH_ANIMATION: AnimationData = {
  duration: 300,
};

export const HIT_NUMBER_ANIMATION: AnimationData = {
  duration: 500,
};

export const CARD_PLAYED_ANIMATION: AnimationData = {
  duration: 1500,
};

export const BATCH_UPDATE_DELAY = 500; // ms delay between animation batches
