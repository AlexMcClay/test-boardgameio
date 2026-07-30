import type {
  Hero,
  HeroEmoteKey,
  HeroErrorKey,
  HeroOpponentKey,
  HeroPower,
  HeroSFX,
  HeroSFXCues,
  HeroSFXText,
  SFXInstance,
} from "../types";

/**
 * Announcer voice lines, keyed by filename under `assets/audio/sfx/announcer/`.
 *
 * Same shape as the per-card lines in cards.ts: a leading "/" marks the id as a
 * path relative to the sfx root, so the frontend's `resolveSfxPath` resolves it
 * directly and none of these need an entry in SFX_MANIFEST.
 */
const announcer = (file: string): SFXInstance[] => [
  { soundId: `/announcer/${file}` },
];

/**
 * A hero's own voice lines, under `assets/audio/sfx/classHeroes/<Class>/`.
 * Same leading-slash convention as `announcer` above.
 */
const heroLine = (folder: string, file: string): SFXInstance[] => [
  { soundId: `/classHeroes/${folder}/${file}` },
];

// ---------------------------------------------------------------------------
// HERO VOICE LINES
//
// Every line below was transcribed from the hero's "Sounds" table on
// hearthstone.wiki.gg (see scripts/hs_hero_sounds.py, which scrapes the table,
// converts the .wav to .ogg, and dumps the transcripts). Filenames are taken
// from the wiki VERBATIM and are wildly inconsistent — Shaman mixes
// `VO_Hero_02_*` and `VO_HERO_02_*` in one folder, Shaman's "not a valid
// target" is `ERROR010_29`, and every class's ERROR11 is numbered `_20`
// (colliding with ERROR01's number) rather than continuing the run. None of
// that is a typo here; the asset filenames really are like that, and the paths
// are case-sensitive once served off Linux.
//
// Not carried over from the wiki tables, deliberately:
//   - Seasonal greetings (Winter Veil, Hallow's End, ...) — no in-game events
//     to key them off.
//   - Card-specific trigger lines (Rexxar's Animal Companion, Gul'dan's "Kara
//     Kazham!") — those belong on the card, via `Card.sfx.trigger`.
//   - Anduin's four "Shut up, Priest" muted emotes — tied to a card we don't
//     have.
//   - Opening lines aimed at Tyrande Whisperwind and Varian Wrynn — neither is
//     a hero here, so the cue could never fire.
// ---------------------------------------------------------------------------

/** A clip and what it says: `[filename under the hero's folder, transcript]`. */
type Line = readonly [file: string, transcript: string];

/**
 * One hero's complete set of lines. Declared as `HeroSFXCues<Line>` so these
 * tables are forced into the exact key set `Hero.sfx` / `Hero.sfxText` expect —
 * a cue named here that the type doesn't know about is a compile error.
 */
type HeroLines = HeroSFXCues<Line>;

/** The cues holding exactly one line, i.e. everything `heroSfx` can loop over. */
const SINGLE_CUES = [
  "start",
  "startMirror",
  "picked",
  "attack",
  "death",
  "concede",
  "outOfTime",
  "lowCards",
  "noCards",
] as const;

/** Splits a keyed group of lines into its clip half and its transcript half. */
const splitGroup = <K extends string>(
  folder: string,
  group: Partial<Record<K, Line>>,
): [Partial<Record<K, SFXInstance[]>>, Partial<Record<K, string>>] => {
  const clips: Partial<Record<K, SFXInstance[]>> = {};
  const text: Partial<Record<K, string>> = {};

  for (const [key, [file, transcript]] of Object.entries(group) as [
    K,
    Line,
  ][]) {
    clips[key] = heroLine(folder, file);
    text[key] = transcript;
  }

  return [clips, text];
};

/**
 * Expands one hero's line table into the paired `sfx` / `sfxText` halves.
 *
 * The point of the table-plus-builder shape: a clip and its transcript are
 * written once, side by side, so they can't drift apart — which two hand-kept
 * parallel object literals of ~40 entries each certainly would.
 */
const heroSfx = (
  folder: string,
  announcerLine: SFXInstance[],
  lines: HeroLines,
): Pick<Hero, "sfx" | "sfxText"> => {
  // The announcer clip lives in a different folder and just names the class,
  // so it has no wiki transcript to pair with.
  const sfx: HeroSFX = { announcer: announcerLine };
  const sfxText: HeroSFXText = {};

  for (const cue of SINGLE_CUES) {
    const line = lines[cue];
    if (!line) continue;
    sfx[cue] = heroLine(folder, line[0]);
    sfxText[cue] = line[1];
  }

  if (lines.thinking) {
    sfx.thinking = lines.thinking.map(([file]) => heroLine(folder, file));
    sfxText.thinking = lines.thinking.map(([, transcript]) => transcript);
  }

  if (lines.startVs) {
    [sfx.startVs, sfxText.startVs] = splitGroup<HeroOpponentKey>(
      folder,
      lines.startVs,
    );
  }
  if (lines.emotes) {
    [sfx.emotes, sfxText.emotes] = splitGroup<HeroEmoteKey>(
      folder,
      lines.emotes,
    );
  }
  if (lines.errors) {
    [sfx.errors, sfxText.errors] = splitGroup<HeroErrorKey>(
      folder,
      lines.errors,
    );
  }

  return { sfx, sfxText };
};

// Hero Power Definitions
const armorUp: HeroPower = {
  name: "Armor Up!",
  description: "Gain 2 Armor.",
  imageUrl: "assets/hero_powers/Armor_Up.jpg",
  manaCost: 2,
  effects: [
    {
      type: "armor",
      value: 2,
      target: "self",
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const fireblast: HeroPower = {
  name: "Fireblast",
  description: "Deal 1 damage.",
  imageUrl: "assets/hero_powers/Fireblast.jpg",
  manaCost: 2,
  effects: [
    {
      type: "damage",
      value: 1,
      target: "user-select",
    },
  ],
  targetQuery: {
    side: "all",
    type: ["card", "player"],
  },
};

const lesserHeal: HeroPower = {
  name: "Lesser Heal",
  description: "Restore 2 Health.",
  imageUrl: "assets/hero_powers/Lesser_Heal.jpg",
  manaCost: 2,
  effects: [
    {
      type: "heal",
      value: 2,
      target: "user-select",
    },
  ],
  targetQuery: {
    side: "all",
    type: ["card", "player"],
  },
};

const lifeTap: HeroPower = {
  name: "Life Tap",
  description: "Draw a card and take 2 damage.",
  imageUrl: "assets/hero_powers/Life_Tap.jpg",
  manaCost: 2,
  effects: [
    {
      type: "draw",
      value: 1,
    },
    {
      type: "damage",
      value: 2,
      target: "friendly-hero",
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const reinforce: HeroPower = {
  name: "Reinforce",
  description: "Summon a 1/1 Silver Hand Recruit.",
  imageUrl: "assets/hero_powers/Reinforce.jpg",
  manaCost: 2,
  effects: [
    {
      type: "summon",
      cardID: "silver-hand-recruit",
      target: "self",
      value: 1,
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const shapeshift: HeroPower = {
  name: "Shapeshift",
  description: "+1 Attack this turn. +1 Armor.",
  imageUrl: "assets/hero_powers/Shapeshift.jpg",
  manaCost: 2,
  effects: [
    {
      type: "applyModifier",
      stats: { attack: 1 },
      target: "friendly-hero",
      duration: {
        expiryTrigger: "END_OF_TURN",
        expiryOwner: "BUFF_CASTER",
      },
      override: false,
    },
    {
      type: "armor",
      value: 1,
      target: "self",
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const steadyShot: HeroPower = {
  name: "Steady Shot",
  description: "Deal 2 damage to the enemy hero.",
  imageUrl: "assets/hero_powers/Steady_Shot.jpg",
  manaCost: 2,
  effects: [
    {
      type: "damage",
      value: 2,
      target: "enemy-hero",
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const daggerMastery: HeroPower = {
  name: "Dagger Mastery",
  description: "Equip a 1/2 Dagger.",
  imageUrl: "assets/hero_powers/Dagger_Mastery.jpg",
  manaCost: 2,
  effects: [
    {
      type: "equip",
      cardID: "wicked-knife",
      target: "self",
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

const totemicCall: HeroPower = {
  name: "Totemic Call",
  description: "Summon a random basic Totem.",
  imageUrl: "assets/hero_powers/Totemic_Call.jpg",
  manaCost: 2,
  effects: [
    {
      type: "summon",
      // Random one of the basic Totems (Healing Totem omitted: its end-of-turn
      // "restore 1 Health to friendly minions" trigger isn't supported yet).
      cardID: ["searing-totem", "stoneclaw-totem", "wrath-of-air-totem"],
      target: "self",
      value: 1,
    },
  ],
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

// Placeholder hero power for heroes not yet implemented
const placeholderPower: HeroPower = {
  name: "Placeholder",
  description: "Not yet implemented.",
  manaCost: 2,
  effects: [],
  imageUrl: "assets/hero_powers/Placeholder.jpg",
  targetQuery: {
    side: "friendly",
    type: [],
  },
};

// --- Line tables, one per hero ---------------------------------------------

const garroshLines: HeroLines = {
  start: ["VO_HERO_01_Start_09.ogg", "Victory or Death!"],
  startMirror: ["VO_HERO_01_MIRROR_START_02.ogg", "Hahaha! Bring it on!"],
  picked: ["VO_HERO_01_Picked_08.ogg", "None are stronger than I!"],
  attack: ["VO_HERO_01_Attack_16.ogg", "Lok'tar ogar!"],
  death: ["VO_HERO_01_Death_17.ogg", "<death sound>"],
  concede: ["VO_HERO_01_Concede_07.ogg", "I choose death!"],
  outOfTime: ["VO_HERO_01_Time_11.ogg", "I must choose!"],
  lowCards: ["VO_HERO_01_LowCards_18.ogg", "I'm almost out of cards!"],
  noCards: ["VO_HERO_01_NoCards_19.ogg", "I'm out of cards!"],
  thinking: [
    ["VO_HERO_01_Thinking1_12.ogg", "Hmmm..."],
    ["VO_HERO_01_Thinking2_13.ogg", "Hmmm... I wonder..."],
    ["VO_HERO_01_Thinking3_14.ogg", "What now...."],
  ],
  emotes: {
    greetings: ["VO_HERO_01_Greetings_01.ogg", "Heh, Greetings."],
    wellPlayed: ["VO_HERO_01_WellPlayed_02.ogg", "<VO sound>"],
    oops: ["VO_HERO_01_Oops_03.ogg", "That was an error."],
    threaten: ["VO_HERO_01_Threaten_04.ogg", "I will crush you!"],
    thanks: ["VO_HERO_01_Thanks_05.ogg", "My thanks."],
    wow: ["VO_HERO_01_WOW_11.ogg", "Astonishing!"],
    sorry: ["VO_HERO_01_Sorry_06.ogg", "Sorry that happened."],
    goodGame: ["VO_HERO_01_GG_15.ogg", "Good game."],
    greetingsMirror: ["VO_HERO_01_MIRROR_GREETINGS_01.ogg", "Heh. Heh. Hello!"],
  },
  errors: {
    "needs-weapon": ["VO_HERO_01_ERROR01_20.ogg", "I need a weapon."],
    "not-enough-mana": [
      "VO_HERO_01_ERROR02_21.ogg",
      "I don't have enough Mana.",
    ],
    "cant-attack": [
      "VO_HERO_01_ERROR03_22.ogg",
      "That minion already attacked.",
    ],
    "hero-already-attacked": [
      "VO_HERO_01_ERROR04_23.ogg",
      "I already attacked.",
    ],
    "summon-sickness": [
      "VO_HERO_01_ERROR05_24.ogg",
      "Give that minion a turn to get ready.",
    ],
    "hand-full": ["VO_HERO_01_ERROR06_25.ogg", "My hand is full!"],
    "board-full": ["VO_HERO_01_ERROR07_26.ogg", "I have too many minions."],
    stealthed: [
      "VO_HERO_01_ERROR08_27.ogg",
      "I can't target Stealthed minions.",
    ],
    "cant-play": ["VO_HERO_01_ERROR09_28.ogg", "I can't play that."],
    "invalid-target": [
      "VO_HERO_01_ERROR10_29.ogg",
      "That's not a valid target.",
    ],
    "must-attack-taunt": [
      "VO_HERO_01_ERROR11_20.ogg",
      "A minion with Taunt is in the way.",
    ],
    generic: ["VO_HERO_01_ERROR12_31.ogg", "I cannot do that."],
  },
};

const thrallLines: HeroLines = {
  start: ["VO_Hero_02_Start_09.ogg", "For Doomhammer!"],
  startMirror: ["VO_HERO_02_MIRROR_START_ALT_03.ogg", "For the Frostwolves!"],
  picked: ["VO_Hero_02_Picked_08.ogg", "Storm, Earth and Fire, heed my call!"],
  attack: ["VO_Hero_02_Attack_16.ogg", "Elements guide me!"],
  death: ["VO_Hero_02_Death_17.ogg", "<death sound>"],
  concede: ["VO_Hero_02_Concede_07.ogg", "You win this one, friend."],
  outOfTime: ["VO_Hero_02_Time_11.ogg", "There is little time!"],
  lowCards: ["VO_Hero_02_LowCards_18.ogg", "I'm almost out of cards!"],
  noCards: ["VO_Hero_02_NoCards_19.ogg", "I'm out of cards!"],
  thinking: [
    ["VO_Hero_02_Thinking1_12.ogg", "Hmmm..."],
    ["VO_Hero_02_Thinking2_13.ogg", "I wonder..."],
    ["VO_Hero_02_Thinking3_14.ogg", "Hmm... What to do..."],
  ],
  emotes: {
    greetings: ["VO_Hero_02_Greetings_01.ogg", "Greetings, friend."],
    wellPlayed: ["VO_Hero_02_WellPlayed_02.ogg", "<VO sound>"],
    oops: ["VO_Hero_02_Oops_03_ALT.ogg", "<VO sound>"],
    threaten: ["VO_Hero_02_Threaten_04.ogg", "The Elements will destroy you!"],
    thanks: ["VO_Hero_02_Thanks_05.ogg", "I thank you."],
    wow: ["VO_HERO_02_WOW_12_ALT.ogg", "That's incredible!"],
    sorry: ["VO_Hero_02_Sorry_06.ogg", "Sorry that happened."],
    goodGame: ["VO_Hero_02_GG_15.ogg", "Good game."],
    greetingsMirror: ["VO_HERO_02_MIRROR_GREETINGS_01.ogg", "Good to see you."],
  },
  errors: {
    "needs-weapon": ["VO_Hero_02_ERROR01_20.ogg", "I need a weapon."],
    "not-enough-mana": [
      "VO_Hero_02_ERROR02_21.ogg",
      "I don't have enough Mana.",
    ],
    "cant-attack": [
      "VO_Hero_02_ERROR03_22.ogg",
      "That minion already attacked.",
    ],
    "hero-already-attacked": [
      "VO_Hero_02_ERROR04_23.ogg",
      "I already attacked.",
    ],
    "summon-sickness": [
      "VO_Hero_02_ERROR05_24.ogg",
      "Give that minion a turn to get ready.",
    ],
    "hand-full": ["VO_Hero_02_ERROR06_25.ogg", "My hand is too full!"],
    "board-full": ["VO_Hero_02_ERROR07_26.ogg", "I have too many minions."],
    stealthed: [
      "VO_Hero_02_ERROR08_27.ogg",
      "I can't target Stealthed minions.",
    ],
    "cant-play": ["VO_Hero_02_ERROR09_28.ogg", "I can't play that."],
    // Not a typo: the shipped filename really is ERROR010, with three digits.
    "invalid-target": [
      "VO_Hero_02_ERROR010_29.ogg",
      "That's not a valid target.",
    ],
    "must-attack-taunt": [
      "VO_HERO_02_ERROR11_21.ogg",
      "A minion with Taunt is in the way.",
    ],
    generic: ["VO_Hero_02_ERROR12_31.ogg", "I can't do that."],
  },
};

const valeeraLines: HeroLines = {
  start: ["VO_HERO_03_Start_09.ogg", "Watch your back."],
  startMirror: ["VO_HERO_03_MIRROR_START_02.ogg", "I always do."],
  picked: ["VO_HERO_03_Picked_08.ogg", "They'll never see it coming."],
  attack: ["VO_HERO_03_Attack_16.ogg", "Here we go."],
  death: ["VO_HERO_03_Death_17.ogg", "<death sound>"],
  concede: ["VO_HERO_03_Concede_07.ogg", "I give up."],
  outOfTime: ["VO_HERO_03_Time_11.ogg", "I must choose soon!"],
  lowCards: ["VO_HERO_03_LowCards_18.ogg", "I'm almost out of cards!"],
  noCards: ["VO_HERO_03_NoCards_19.ogg", "I'm out of cards!"],
  thinking: [
    ["VO_HERO_03_Thinking1_12.ogg", "Hmmm..."],
    ["VO_HERO_03_Thinking2_13.ogg", "I wonder..."],
    ["VO_HERO_03_Thinking3_14.ogg", "So many options..."],
  ],
  emotes: {
    greetings: ["VO_HERO_03_Greetings_01.ogg", "The pleasure is mine."],
    wellPlayed: ["VO_HERO_03_WellPlayed_02.ogg", "<VO sound>"],
    oops: ["VO_HERO_03_Oops_03.ogg", "Mistakes were made."],
    threaten: ["VO_HERO_03_Threaten_04.ogg", "I will be your death!"],
    thanks: ["VO_HERO_03_Thanks_05.ogg", "Thank you."],
    wow: ["VO_HERO_03_WOW_11.ogg", "Incredible."],
    sorry: ["VO_HERO_03_Sorry_06.ogg", "Sorry about that."],
    goodGame: ["VO_HERO_03_GG_15.ogg", "Good game."],
    greetingsMirror: [
      "VO_HERO_03_MIRROR_GREETINGS_01.ogg",
      "It's all mine! Huh.",
    ],
  },
  errors: {
    "needs-weapon": ["VO_HERO_03_ERROR01_20.ogg", "I need a weapon."],
    "not-enough-mana": [
      "VO_HERO_03_ERROR02_21.ogg",
      "I don't have enough Mana.",
    ],
    "cant-attack": [
      "VO_HERO_03_ERROR03_22.ogg",
      "That minion already attacked.",
    ],
    "hero-already-attacked": [
      "VO_HERO_03_ERROR04_23.ogg",
      "I already attacked.",
    ],
    "summon-sickness": [
      "VO_HERO_03_ERROR05_24.ogg",
      "Give that minion a turn to get ready.",
    ],
    "hand-full": ["VO_HERO_03_ERROR06_25.ogg", "My hand is too full!"],
    "board-full": ["VO_HERO_03_ERROR07_26.ogg", "I have too many minions."],
    stealthed: [
      "VO_HERO_03_ERROR08_27.ogg",
      "I can't target Stealthed minions.",
    ],
    "cant-play": ["VO_HERO_03_ERROR09_28.ogg", "I can't play that."],
    "invalid-target": [
      "VO_HERO_03_ERROR10_29.ogg",
      "That's not a valid target.",
    ],
    "must-attack-taunt": [
      "VO_HERO_03_ERROR11_20.ogg",
      "A minion with Taunt is in the way.",
    ],
    generic: ["VO_HERO_03_ERROR12_31.ogg", "I can't do that."],
  },
};

const utherLines: HeroLines = {
  start: ["VO_HERO_04_Start_09.ogg", "I will fight with honor!"],
  startMirror: ["VO_HERO_04_MIRROR_START_01.ogg", "I will command the light."],
  picked: ["VO_HERO_04_Picked_08.ogg", "I will serve."],
  attack: ["VO_HERO_04_Attack_16.ogg", "For justice!"],
  death: ["VO_HERO_04_Death_17.ogg", "<death sound>"],
  concede: ["VO_HERO_04_Concede_07.ogg", "The victory is yours."],
  outOfTime: ["VO_HERO_04_Time_11.ogg", "I must move quickly!"],
  lowCards: ["VO_HERO_04_LowCards_18.ogg", "I'm almost out of cards!"],
  noCards: ["VO_HERO_04_NoCards_19.ogg", "I'm out of cards!"],
  startVs: {
    arthas: [
      "VO_HERO_04_Male_Human_Start_Arthas_01.ogg",
      "You are not my king yet, boy.",
    ],
  },
  thinking: [
    ["VO_HERO_04_Thinking1_12.ogg", "Hmmm..."],
    ["VO_HERO_04_Thinking2_13.ogg", "I wonder..."],
    ["VO_HERO_04_Thinking3_14.ogg", "Let me think..."],
  ],
  emotes: {
    greetings: ["VO_HERO_04_Greetings_01.ogg", "Well met!"],
    wellPlayed: ["VO_HERO_04_WellPlayed_02.ogg", "Well played."],
    oops: ["VO_HERO_04_Oops_03.ogg", "That was a mistake."],
    threaten: ["VO_HERO_04_Threaten_04.ogg", "Justice demands retribution!"],
    thanks: ["VO_HERO_04_Thanks_05.ogg", "Thank you."],
    wow: ["VO_HERO_04_WOW_06.ogg", "By the Holy Light!"],
    sorry: ["VO_HERO_04_Sorry_06.ogg", "I am sorry."],
    goodGame: ["VO_HERO_04_GG_15.ogg", "Good game."],
    greetingsMirror: [
      "VO_HERO_04_MIRROR_GREETINGS_02.ogg",
      "Yes! Well met, indeed!",
    ],
  },
  errors: {
    "needs-weapon": ["VO_HERO_04_ERROR01_20.ogg", "I need a weapon."],
    "not-enough-mana": [
      "VO_HERO_04_ERROR02_21.ogg",
      "I don't have enough Mana.",
    ],
    "cant-attack": [
      "VO_HERO_04_ERROR03_22.ogg",
      "That minion already attacked.",
    ],
    "hero-already-attacked": [
      "VO_HERO_04_ERROR04_23.ogg",
      "I already attacked.",
    ],
    "summon-sickness": [
      "VO_HERO_04_ERROR05_24.ogg",
      "Give that minion a turn to get ready.",
    ],
    "hand-full": ["VO_HERO_04_ERROR06_25.ogg", "My hand is too full!"],
    "board-full": ["VO_HERO_04_ERROR07_26.ogg", "I have too many minions."],
    stealthed: [
      "VO_HERO_04_ERROR08_27.ogg",
      "I can't target Stealthed minions.",
    ],
    "cant-play": ["VO_HERO_04_ERROR09_28.ogg", "I can't play that."],
    "invalid-target": [
      "VO_HERO_04_ERROR10_29.ogg",
      "That's not a valid target.",
    ],
    "must-attack-taunt": [
      "VO_HERO_04_ERROR11_20.ogg",
      "A minion with Taunt is in the way.",
    ],
    generic: ["VO_HERO_04_ERROR12_31.ogg", "I can't do that."],
  },
};

const rexxarLines: HeroLines = {
  start: ["VO_HERO_05_Start_09.ogg", "Let the hunt begin!"],
  startMirror: ["VO_HERO_05_MIRROR_START_01.ogg", "Bring it on!"],
  picked: ["VO_HERO_05_Picked_08.ogg", "Only beasts are above deceit."],
  attack: ["VO_HERO_05_Attack_16.ogg", "I hunt alone."],
  death: ["VO_HERO_05_Death_17.ogg", "<death sound>"],
  concede: ["VO_HERO_05_Concede_07.ogg", "Well fought.  I concede."],
  outOfTime: ["VO_HERO_05_Time_11.ogg", "Time moves quickly!"],
  lowCards: ["VO_HERO_05_LowCards_19.ogg", "I'm almost out of cards!"],
  noCards: ["VO_HERO_05_NoCards_20.ogg", "I'm out of cards!"],
  thinking: [
    ["VO_HERO_05_Thinking1_12.ogg", "Hmmm..."],
    ["VO_HERO_05_Thinking2_13.ogg", "I wonder..."],
    ["VO_HERO_05_Thinking3_14.ogg", "Hrmmmmm..."],
  ],
  emotes: {
    greetings: ["VO_HERO_05_Greetings_01.ogg", "Greetings, traveler."],
    wellPlayed: ["VO_HERO_05_WellPlayed_02.ogg", "<VO sound>"],
    oops: ["VO_HERO_05_Oops_03.ogg", "That didn't quite hit the mark."],
    threaten: ["VO_HERO_05_Threaten_04.ogg", "I will hunt you down!"],
    thanks: ["VO_HERO_05_Thanks_05.ogg", "Thanks."],
    wow: ["VO_HERO_05_WOW_06.ogg", "Astounding!"],
    sorry: ["VO_HERO_05_Sorry_06.ogg", "My apologies."],
    greetingsMirror: ["VO_HERO_05_MIRROR_GREETINGS_02.ogg", "Hail!"],
  },
  errors: {
    "needs-weapon": ["VO_HERO_05_ERROR01_21.ogg", "I need a weapon."],
    "not-enough-mana": [
      "VO_HERO_05_ERROR02_22.ogg",
      "I don't have enough Mana.",
    ],
    "cant-attack": [
      "VO_HERO_05_ERROR03_23.ogg",
      "That minion already attacked.",
    ],
    "hero-already-attacked": [
      "VO_HERO_05_ERROR04_24.ogg",
      "I already attacked.",
    ],
    "summon-sickness": [
      "VO_HERO_05_ERROR05_25.ogg",
      "Give that minion a turn to get ready.",
    ],
    "hand-full": ["VO_HERO_05_ERROR06_26.ogg", "My hand is too full!"],
    "board-full": ["VO_HERO_05_ERROR07_27.ogg", "I have too many minions."],
    stealthed: [
      "VO_HERO_05_ERROR08_28.ogg",
      "I can't target Stealthed minions.",
    ],
    "cant-play": ["VO_HERO_05_ERROR09_29.ogg", "I can't play that."],
    "invalid-target": [
      "VO_HERO_05_ERROR10_30.ogg",
      "That's not a valid target.",
    ],
    "must-attack-taunt": [
      "VO_HERO_05_ERROR11_20.ogg",
      "A minion with Taunt is in the way.",
    ],
    generic: ["VO_HERO_05_ERROR12_32.ogg", "I can't do that."],
  },
};

const malfurionLines: HeroLines = {
  start: ["VO_HERO_06_Start_09.ogg", "I must protect the wild!"],
  startMirror: ["VO_HERO_06_MIRROR_START_01.ogg", "Nature must be preserved!"],
  picked: ["VO_HERO_06_Picked_08.ogg", "You were right to awaken me!"],
  attack: ["VO_HERO_06_Attack_16.ogg", "For the wilds!"],
  death: ["VO_HERO_06_Death_17.ogg", "<death sound>"],
  concede: ["VO_HERO_06_Concede_07.ogg", "I concede to you."],
  outOfTime: ["VO_HERO_06_Time_11.ogg", "Time waits for no one!"],
  lowCards: ["VO_HERO_06_LowCards_18.ogg", "I'm almost out of cards!"],
  noCards: ["VO_HERO_06_NoCards_19.ogg", "I'm out of cards!"],
  startVs: {
    illidan: [
      "VO_Hero_06_Male_NightElf_Start_Illidan_01.ogg",
      "You have much to answer for.",
    ],
  },
  thinking: [
    ["VO_HERO_06_Thinking1_12.ogg", "Hmmm..."],
    ["VO_HERO_06_Thinking2_13.ogg", "Hmmm... I wonder..."],
    ["VO_HERO_06_Thinking3_14.ogg", "What to do..."],
  ],
  emotes: {
    greetings: ["VO_HERO_06_Greetings_01.ogg", "My greetings."],
    wellPlayed: ["VO_HERO_06_WellPlayed_02.ogg", "<VO sound>"],
    oops: ["VO_HERO_06_Oops_03.ogg", "A natural mistake."],
    threaten: ["VO_HERO_06_Threaten_04.ogg", "Nature will rise against you!"],
    thanks: ["VO_HERO_06_Thanks_05.ogg", "My thanks to you."],
    wow: ["VO_HERO_06_WOW_06.ogg", "Spectacular!"],
    sorry: ["VO_HERO_06_Sorry_06.ogg", "Sorry about that."],
    greetingsMirror: ["VO_HERO_06_MIRROR_GREETINGS_02.ogg", "Salutations."],
  },
  errors: {
    "needs-weapon": ["VO_HERO_06_ERROR01_20.ogg", "I need a weapon."],
    "not-enough-mana": [
      "VO_HERO_06_ERROR02_21.ogg",
      "I don't have enough Mana.",
    ],
    "cant-attack": [
      "VO_HERO_06_ERROR03_22.ogg",
      "That minion already attacked.",
    ],
    "hero-already-attacked": [
      "VO_HERO_06_ERROR04_23.ogg",
      "I already attacked.",
    ],
    "summon-sickness": [
      "VO_HERO_06_ERROR05_24.ogg",
      "Give that minion a turn to get ready.",
    ],
    "hand-full": ["VO_HERO_06_ERROR06_25.ogg", "My hand is too full!"],
    "board-full": ["VO_HERO_06_ERROR07_26.ogg", "I have too many minions."],
    stealthed: [
      "VO_HERO_06_ERROR08_27.ogg",
      "I can't target Stealthed minions.",
    ],
    "cant-play": ["VO_HERO_06_ERROR09_28.ogg", "I can't play that."],
    "invalid-target": [
      "VO_HERO_06_ERROR10_29.ogg",
      "That's not a valid target.",
    ],
    "must-attack-taunt": [
      "VO_HERO_06_ERROR11_20.ogg",
      "A minion with Taunt is in the way.",
    ],
    generic: ["VO_HERO_06_ERROR12_31.ogg", "I can't do that."],
  },
};

const guldanLines: HeroLines = {
  start: ["VO_HERO_07_Start_09.ogg", "Your soul shall be mine!"],
  startMirror: ["VO_HERO_07_MIRROR_START_01.ogg", "I am your nightmare!"],
  picked: ["VO_HERO_07_Picked_08.ogg", "Embrace the shadows."],
  attack: ["VO_HERO_07_Attack_16.ogg", "Suffer!"],
  death: ["VO_HERO_07_Death_17.ogg", "<death sound>"],
  concede: ["VO_HERO_07_Concede_07.ogg", "You win... this time."],
  outOfTime: ["VO_HERO_07_Time_11.ogg", "I'm almost out of time!"],
  lowCards: ["VO_HERO_07_LowCards_18.ogg", "I'm almost out of cards!"],
  noCards: ["VO_HERO_07_NoCards_19.ogg", "I'm out of cards!"],
  thinking: [
    ["VO_HERO_07_Thinking1_12.ogg", "Hmmm..."],
    ["VO_HERO_07_Thinking2_13.ogg", "I wonder..."],
    ["VO_HERO_07_Thinking3_14.ogg", "So many possibilities..."],
  ],
  emotes: {
    greetings: ["VO_HERO_07_Greetings_01.ogg", "I greet you."],
    wellPlayed: ["VO_HERO_07_WellPlayed_02.ogg", "Well played."],
    oops: ["VO_HERO_07_Oops_03.ogg", "That was a mistake."],
    threaten: ["VO_HERO_07_Threaten_04.ogg", "Your soul shall suffer!"],
    thanks: ["VO_HERO_07_Thanks_05.ogg", "Thank you."],
    wow: ["VO_HERO_07_WOW_06.ogg", "Extraordinary."],
    sorry: ["VO_HERO_07_Sorry_06.ogg", "Sorry."],
    goodGame: ["VO_HERO_07_GG_15.ogg", "Good game."],
    greetingsMirror: ["VO_HERO_07_MIRROR_GREETINGS_02.ogg", "And I, you."],
  },
  errors: {
    "needs-weapon": ["VO_HERO_07_ERROR01_20.ogg", "I need a weapon."],
    "not-enough-mana": [
      "VO_HERO_07_ERROR02_21.ogg",
      "I don't have enough Mana.",
    ],
    "cant-attack": [
      "VO_HERO_07_ERROR03_22.ogg",
      "That minion already attacked.",
    ],
    "hero-already-attacked": [
      "VO_HERO_07_ERROR04_23.ogg",
      "I already attacked.",
    ],
    "summon-sickness": [
      "VO_HERO_07_ERROR05_24.ogg",
      "Give that minion a turn to get ready.",
    ],
    "hand-full": ["VO_HERO_07_ERROR06_25.ogg", "My hand is too full!"],
    "board-full": ["VO_HERO_07_ERROR07_26.ogg", "I have too many minions."],
    stealthed: [
      "VO_HERO_07_ERROR08_27.ogg",
      "I can't target Stealthed minions.",
    ],
    "cant-play": ["VO_HERO_07_ERROR09_28.ogg", "I can't play that."],
    "invalid-target": [
      "VO_HERO_07_ERROR10_29.ogg",
      "That's not a valid target.",
    ],
    "must-attack-taunt": [
      "VO_HERO_07_ERROR11_20.ogg",
      "A minion with Taunt is in the way.",
    ],
    generic: ["VO_HERO_07_ERROR12_31.ogg", "I can't do that."],
  },
};

const jainaLines: HeroLines = {
  // The Mage clips use a different numbering run from the other classes —
  // hers is _64, not the _09 the rest share.
  start: ["VO_HERO_08_Start_64.ogg", "You asked for it!"],
  startMirror: ["VO_HERO_08_MIRROR_START_01.ogg", "Oh, it is on."],
  picked: ["VO_HERO_08_Picked_63.ogg", "My magic will prevail!"],
  attack: ["VO_HERO_08_Attack_71.ogg", "I'm ready."],
  death: ["VO_HERO_08_Death_72.ogg", "<death sound>"],
  concede: ["VO_HERO_08_Concede_62.ogg", "You win this one."],
  outOfTime: ["VO_HERO_08_Time_66.ogg", "Time runs out on me!"],
  lowCards: ["VO_HERO_08_LowCards_73.ogg", "I'm almost out of cards!"],
  noCards: ["VO_HERO_08_NoCards_74.ogg", "I'm out of cards!"],
  startVs: {
    arthas: [
      "VO_HERO_08_Female_Human_START_Arthas_01.ogg",
      "There's nothing I should worry about, right Arthas?",
    ],
  },
  thinking: [
    ["VO_HERO_08_Thinking1_67.ogg", "Hmmm..."],
    ["VO_HERO_08_Thinking2_68.ogg", "I wonder..."],
    ["VO_HERO_08_Thinking3_69.ogg", "What to do... What to do..."],
  ],
  emotes: {
    greetings: ["VO_HERO_08_Greetings_56.ogg", "Hello."],
    wellPlayed: ["VO_HERO_08_WellPlayed_57.ogg", "Well played."],
    oops: ["VO_HERO_08_Oops_58.ogg", "Whoops."],
    threaten: ["VO_HERO_08_Threaten_59.ogg", "My magic will tear you apart!"],
    thanks: ["VO_HERO_08_Thanks_60.ogg", "Thank you."],
    wow: ["VO_HERO_08_WOW_06.ogg", "Amazing."],
    sorry: ["VO_HERO_08_Sorry_61.ogg", "I'm sorry."],
    goodGame: ["VO_HERO_08_GG_70.ogg", "Good game."],
    greetingsMirror: ["VO_HERO_08_MIRROR_GREETINGS_02.ogg", "Hello, stranger."],
  },
  errors: {
    "needs-weapon": ["VO_HERO_08_ERROR01_75.ogg", "I need a weapon."],
    "not-enough-mana": [
      "VO_HERO_08_ERROR02_76.ogg",
      "I don't have enough Mana.",
    ],
    "cant-attack": [
      "VO_HERO_08_ERROR03_77.ogg",
      "That minion already attacked.",
    ],
    "hero-already-attacked": [
      "VO_HERO_08_ERROR04_78.ogg",
      "I already attacked.",
    ],
    "summon-sickness": [
      "VO_HERO_08_ERROR05_79.ogg",
      "Give that minion a turn to get ready.",
    ],
    "hand-full": ["VO_HERO_08_ERROR06_80.ogg", "My hand is too full!"],
    "board-full": ["VO_HERO_08_ERROR07_81.ogg", "I have too many minions."],
    stealthed: [
      "VO_HERO_08_ERROR08_82.ogg",
      "I can't target Stealthed minions.",
    ],
    "cant-play": ["VO_HERO_08_ERROR09_83.ogg", "I can't play that."],
    "invalid-target": [
      "VO_HERO_08_ERROR10_84.ogg",
      "That's not a valid target.",
    ],
    "must-attack-taunt": [
      "VO_HERO_08_ERROR11_20.ogg",
      "A minion with Taunt is in the way.",
    ],
    generic: ["VO_HERO_08_ERROR12_86.ogg", "I can't do that."],
  },
};

const anduinLines: HeroLines = {
  start: ["VO_HERO_09_Start_09.ogg", "The Light shall bring victory!"],
  startMirror: [
    "VO_HERO_09_MIRROR_START_01.ogg",
    "Light smiles upon the just!",
  ],
  picked: ["VO_HERO_09_Picked_08.ogg", "I won't let you down."],
  attack: ["VO_HERO_09_Attack_16.ogg", "By the Light!"],
  death: ["VO_HERO_09_Death_17.ogg", "<death sound>"],
  concede: ["VO_HERO_09_Concede_07.ogg", "You have bested me."],
  outOfTime: ["VO_HERO_09_Time_11.ogg", "I must choose quickly!"],
  lowCards: ["VO_HERO_09_LowCards_18.ogg", "I'm almost out of cards!"],
  noCards: ["VO_HERO_09_NoCards_19.ogg", "I'm out of cards!"],
  thinking: [
    ["VO_HERO_09_Thinking1_12.ogg", "Hmmm..."],
    ["VO_HERO_09_Thinking2_13.ogg", "I wonder..."],
    ["VO_HERO_09_Thinking3_14.ogg", "I must consider..."],
  ],
  emotes: {
    greetings: ["VO_HERO_09_Greetings_01.ogg", "Greetings."],
    wellPlayed: ["VO_HERO_09_WellPlayed_02.ogg", "<VO sound>"],
    oops: ["VO_HERO_09_Oops_03.ogg", "Not quite what was planned."],
    threaten: ["VO_HERO_09_Threaten_04.ogg", "The Light shall burn you!"],
    thanks: ["VO_HERO_09_Thanks_05.ogg", "Thank you."],
    wow: ["VO_HERO_09_WOW_06.ogg", "Wow...."],
    sorry: ["VO_HERO_09_Sorry_06.ogg", "My apologies."],
    goodGame: ["VO_HERO_09_GG_15.ogg", "Good game."],
    greetingsMirror: [
      "VO_HERO_09_MIRROR_GREETINGS_02_ALT.ogg",
      "Hello, my friend!",
    ],
  },
  errors: {
    "needs-weapon": ["VO_HERO_09_ERROR01_20.ogg", "I need a weapon."],
    "not-enough-mana": [
      "VO_HERO_09_ERROR02_21.ogg",
      "I don't have enough Mana.",
    ],
    "cant-attack": [
      "VO_HERO_09_ERROR03_22.ogg",
      "That minion already attacked.",
    ],
    "hero-already-attacked": [
      "VO_HERO_09_ERROR04_23.ogg",
      "I already attacked.",
    ],
    "summon-sickness": [
      "VO_HERO_09_ERROR05_24.ogg",
      "Give that minion a turn to get ready.",
    ],
    "hand-full": ["VO_HERO_09_ERROR06_25.ogg", "My hand is too full!"],
    "board-full": ["VO_HERO_09_ERROR07_26.ogg", "I have too many minions."],
    stealthed: [
      "VO_HERO_09_ERROR08_27.ogg",
      "I can't target Stealthed minions.",
    ],
    "cant-play": ["VO_HERO_09_ERROR09_28.ogg", "I can't play that."],
    "invalid-target": [
      "VO_HERO_09_ERROR10_29.ogg",
      "That's not a valid target.",
    ],
    "must-attack-taunt": [
      "VO_HERO_09_ERROR11_20.ogg",
      "A minion with Taunt is in the way.",
    ],
    generic: ["VO_HERO_09_ERROR12_31.ogg", "I can't do that."],
  },
};

// individual hero definitions
export const warriorHero: Hero = {
  name: "Warrior",
  portrait: "assets/heros/Garrosh.jpg",
  class: "Warrior",
  heroName: "Garrosh Hellscream",
  heroPower: armorUp,
  ...heroSfx("Warrior", announcer("VO_ANNOUNCER_GARROSH_10.ogg"), garroshLines),
};

export const shamanHero: Hero = {
  name: "Shaman",
  portrait: "assets/heros/Thrall.jpg",
  class: "Shaman",
  heroName: "Thrall",
  heroPower: totemicCall,
  ...heroSfx("Shaman", announcer("VO_ANNOUNCER_THRALL_12.ogg"), thrallLines),
};

export const rogueHero: Hero = {
  name: "Rogue",
  portrait: "assets/heros/Valeera.jpg",
  class: "Rogue",
  heroPower: daggerMastery,
  heroName: "Valeera Sanguinar",
  ...heroSfx("Rogue", announcer("VO_ANNOUNCER_VALEERA_08.ogg"), valeeraLines),
};

export const paladinHero: Hero = {
  name: "Paladin",
  portrait: "assets/heros/Uther.jpg",
  heroPower: reinforce,
  class: "Paladin",
  heroName: "Uther Lightbringer",
  ...heroSfx("Paladin", announcer("VO_ANNOUNCER_UTHER_11.ogg"), utherLines),
};

export const hunterHero: Hero = {
  name: "Hunter",
  heroPower: steadyShot,
  portrait: "assets/heros/Rexxar.jpg",
  class: "Hunter",
  heroName: "Rexxar",
  ...heroSfx("Hunter", announcer("VO_ANNOUNCER_REXXAR_09.ogg"), rexxarLines),
};

export const druidHero: Hero = {
  heroPower: shapeshift,
  name: "Druid",
  portrait: "assets/heros/Malfurion.jpg",
  class: "Druid",
  heroName: "Malfurion Stormrage",
  ...heroSfx(
    "Druid",
    announcer("VO_ANNOUNCER_MALFURION_15.ogg"),
    malfurionLines,
  ),
};

export const warlockHero: Hero = {
  name: "Warlock",
  portrait: "assets/heros/Guldan.jpg",
  class: "Warlock",
  heroName: "Gul'dan",
  heroPower: lifeTap,
  // The apostrophe is literal in the announcer filename; it's a legal URL path
  // character, so it needs no escaping here.
  ...heroSfx("Warlock", announcer("VO_ANNOUNCER_GUL'DAN_13.ogg"), guldanLines),
};

export const mageHero: Hero = {
  name: "Mage",
  portrait: "assets/heros/Jaina.jpg",
  class: "Mage",
  heroName: "Jaina Proudmoore",
  heroPower: fireblast,
  ...heroSfx("Mage", announcer("VO_ANNOUNCER_JAINA_07.ogg"), jainaLines),
};

export const priestHero: Hero = {
  name: "Priest",
  portrait: "assets/heros/Anduin.jpg",
  class: "Priest",
  heroName: "Anduin Wrynn",
  heroPower: lesserHeal,
  ...heroSfx("Priest", announcer("VO_ANNOUNCER_ANDUIN_13.ogg"), anduinLines),
};

// Bonus: Later additions to Hearthstone included in your folder
export const demonHunterHero: Hero = {
  name: "Demon Hunter",
  portrait: "assets/heros/Illidan_Stormrage.jpg",
  class: "Demon Hunter",
  heroPower: placeholderPower,
  heroName: "Illidan Stormrage",
};

export const deathKnightHero: Hero = {
  name: "Death Knight",
  portrait: "assets/heros/Arthas.jpg",
  heroPower: placeholderPower,
  class: "Death Knight",
  heroName: "Arthas Menethil",
};

// Exported array containing all heroes
export const heros: Hero[] = [
  warriorHero,
  shamanHero,
  rogueHero,
  paladinHero,
  hunterHero,
  druidHero,
  warlockHero,
  mageHero,
  priestHero,
  // demonHunterHero,
  // deathKnightHero,
];
