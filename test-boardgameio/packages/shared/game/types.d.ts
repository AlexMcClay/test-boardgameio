import type { CardTemplateKey } from "./data/cards";

/**
 * Framework-independent player identifier ("0" | "1" at runtime; typed as
 * string to stay drop-in compatible with existing indexing code).
 */
export type PlayerID = string;

/**
 * Framework-independent game context (replaces boardgame.io's Ctx).
 * turn increments per player-turn (turn 1 = P0's first turn, turn 2 = P1's, ...).
 */
export interface GameCtx {
  currentPlayer: PlayerID;
  turn: number;
  gameover?: { winner: PlayerID | "draw" };
}

/** Back-compat alias so existing `Ctx` imports keep working during migration. */
export type Ctx = GameCtx;

export type DeckString = Partial<Record<CardTemplateKey, number>>;

/**
 * Receipt from spending mana, recording how much came from temporary vs
 * permanent crystals so a refund can restore the exact mix. See game/utils/mana.ts.
 */
export interface ManaPayment {
  temp: number;
  permanent: number;
}

export interface HeroPower {
  name: string;
  description: string;
  manaCost: number;
  effects: Array<EffectTypes>;
  targetQuery: TargetQuery;
  imageUrl: string; // URL to the card image
}

/**
 * The emote wheel. Every hero records these under the same keys, so a hero
 * missing one just falls back to silence rather than to another hero's line.
 *
 * Hearthstone also ships a seasonal greeting per in-game holiday (Winter Veil,
 * Hallow's End, Noblegarden, ...) that swaps in for `greetings` while the event
 * runs. Deliberately not modelled — there are no in-game events here to key
 * them off.
 */
export type HeroEmoteKey =
  | "greetings"
  | "wellPlayed"
  | "oops"
  | "threaten"
  | "thanks"
  | "wow"
  // Cut from the live emote wheel but still shipped in the audio, so worth
  // keeping addressable: Blizzard removed "Sorry" and "Good Game".
  | "sorry"
  | "goodGame"
  /** Used when both players picked the same class. */
  | "greetingsMirror";

/**
 * Opponents that get a bespoke opening line instead of the hero's usual
 * `start` — Uther and Jaina both greet Arthas by name, Malfurion greets Illidan.
 *
 * Only opponents that exist as a `Hero` here are listed. The wiki also has
 * lines aimed at Tyrande Whisperwind (Malfurion) and Varian Wrynn (Anduin),
 * left out because neither is a hero in this game and the keys could never fire.
 */
export type HeroOpponentKey = "arthas" | "illidan";

/**
 * The hero's "I can't do that" barks, keyed so `noticeStore` can look one up
 * straight from the code that rejected the move.
 *
 * Most keys ARE `MoveValidationError` codes (see game/utils/validateMove.ts) and
 * must stay spelled identically. The rest cover errors Hearthstone voices but
 * this engine has no validation code for yet — `needs-weapon`,
 * `hero-already-attacked`, `hand-full`, `cant-play` — plus `generic`, the
 * catch-all for any code with no line of its own.
 */
export type HeroErrorKey =
  // Shared with MoveValidationError:
  | "not-enough-mana"
  | "board-full"
  | "cant-attack"
  | "summon-sickness"
  | "stealthed"
  | "invalid-target"
  | "must-attack-taunt"
  // No MoveValidationError counterpart (yet):
  | "needs-weapon"
  | "hero-already-attacked"
  | "hand-full"
  | "cant-play"
  | "generic";

/**
 * A hero's voice lines, keyed by cue. Generic over what a cue holds so that
 * `Hero.sfx` (the clips) and `Hero.sfxText` (their transcripts) are forced to
 * use the identical key set — adding a cue to one is a type error until it's
 * added to the other.
 *
 * `TCue` is the WHOLE cue, and for clips that means an `SFXInstance[]` played
 * as a SEQUENCE (MulliganOverlay awaits each line in turn). `thinking` is
 * therefore `TCue[]`: its three lines are ALTERNATIVE takes, one picked at
 * random, not three lines played back to back.
 */
export interface HeroSFXCues<TCue> {
  /** The announcer naming this hero at the start of a match. */
  announcer?: TCue;
  /** The hero's own opening line, played over the mulligan. */
  start?: TCue;
  /** Opening line used when both players picked this same class. */
  startMirror?: TCue;
  /** Opening lines aimed at one specific opponent, overriding `start`. */
  startVs?: Partial<Record<HeroOpponentKey, TCue>>;
  /** Played when this hero is chosen on the hero-select screen. */
  picked?: TCue;
  /** The hero swinging — weapon, or bare-handed. */
  attack?: TCue;
  death?: TCue;
  concede?: TCue;
  /** ALTERNATIVES: one is picked at random while the turn timer idles. */
  thinking?: TCue[];
  /** The turn timer is nearly up. */
  outOfTime?: TCue;
  /** Deck is nearly empty. */
  lowCards?: TCue;
  /** Deck is empty; fatigue starts. */
  noCards?: TCue;
  emotes?: Partial<Record<HeroEmoteKey, TCue>>;
  errors?: Partial<Record<HeroErrorKey, TCue>>;
}

/**
 * Voice lines, mirroring `Card.sfx`. Same convention as the per-card lines:
 * a `soundId` starting with "/" is a path relative to the sfx root rather
 * than a manifest key, so these never touch SFX_MANIFEST.
 */
export type HeroSFX = HeroSFXCues<SFXInstance[]>;

/**
 * Transcripts for `Hero.sfx`, cue for cue. Nothing plays these — they're what
 * makes a wall of `VO_HERO_08_ERROR07_81.ogg` filenames readable at the call
 * site, and they're the copy a subtitle/accessibility pass would draw on.
 * `<angle brackets>` mark a non-verbal clip (e.g. `<death sound>`).
 */
export type HeroSFXText = HeroSFXCues<string>;

export interface Hero {
  name: string;
  portrait: string;
  ability?: string;
  class: string;
  heroName: string;
  heroPower: HeroPower;
  sfx?: HeroSFX;
  sfxText?: HeroSFXText;
}

export interface Card {
  id: string;
  originalID: string;
  title: string;
  description: string;
  baseMana?: number;
  baseAttack?: number;
  baseHealth?: number;
  overload?: number | DynamicValue; // Mana crystals locked next turn when this card is played
  type?: string[]; // e.g., "Spell", "Beast", "Demon", etc.
  imageUrl?: string; // URL to the card image
  effects: Array<EffectTypes>;
  onPlace: Array<EffectTypes>; // Effects that trigger when the card is placed
  deathrattle?: Array<EffectTypes>;
  isPlaced?: boolean; // Optional, to track if the card is placed on the board
  summoningSickness?: boolean; // Optional, to track if minion was just placed (shows Zzz)
  isSpell?: boolean; // Optional, to indicate if the card is a spell
  isMinion: boolean; // Optional, to indicate if the card is a minion
  isWeapon?: boolean; // Optional, to indicate if the card is a weapon
  baseDurability?: number; // Weapon-only: charges before it breaks
  durabilityLost?: number; // Weapon-only: parallel to damageTaken, charges used toward baseDurability
  isUncollectible?: boolean; // Optional, to indicate if the card is uncollectible (like tokens)
  /**
   * Choose One: template keys of this card's OPTION CARDS — real uncollectible
   * card templates (Hearthstone's model: Wrath EX1_154a/b, "Cat Form"/"Bear
   * Form"). Playing a card with this set pays its mana, then opens a
   * pendingChoice instead of resolving; the picked option card's `effects`
   * run with the PARENT as context (the placed minion, or the held spell).
   */
  chooseOne?: string[];
  /**
   * Temporary: this card discards itself from hand at the end of its
   * controller's turn (the Discover Gift cards). Swept by endTurnCleanup.
   */
  temporary?: boolean;
  // Bool states
  taunt?: boolean; // Optional, to indicate if the card has taunt
  frozen?: boolean;
  stealth?: boolean;
  divineShield?: boolean;
  charge?: boolean;
  rush?: boolean;
  poisonous?: boolean;
  immune?: boolean;
  windfury?: boolean;
  elusive?: boolean; // Can't be targeted by spells or Hero Powers (Faerie Dragon)
  // Plain flag, not a grantable keyword — nothing in Legacy hands this out.
  cantAttack?: boolean; // Ancient Watcher / Ragnaros: may never declare an attack
  // Set by the silence effect. Card text keeps its printed description; the UI
  // stamps a red X over it (Card/Overlays/SilencedOverlay).
  silenced?: boolean;
  // 2. Structural tracking for real-time damage
  damageTaken: number;
  attacksLeft: number;
  // 3. Volatile attachment array
  modifiers?: CardModifier[];
  // Ongoing mechanics — each is refreshed continuously by its own pass in
  // refreshOngoing (game/index.ts) and materialized as managed CardModifiers.
  // `duration` on these defs is ignored: presence is the lifecycle.
  aura?: ApplyModifierEffect[]; // Active while THIS minion is on board; targets via effect.target (friendly-board / adjacent / friendly-hand / ...)
  inHand?: ApplyModifierEffect[]; // Active while THIS card is in a hand; targets "self" or "adjacent" (hand neighbors)
  enrage?: ApplyModifierEffect[]; // Active while THIS minion is damaged on board; targets "self"
  // "Whenever X happens, do Y" — see TriggerDef. Active while this card is in
  // play (on board, or equipped for weapons like Sword of Justice).
  triggers?: TriggerDef[];
  hideAuraGlow?: boolean; // Suppress the aura "pool of light" (Old Murk-Eye / Prophet Velen style exceptions)
  rarity?: "Common" | "Rare" | "Epic" | "Legendary";
  tags?: string[];
  targetQuery: TargetQuery;
  battlecryQuery?: TargetQuery;
  class: string;
  sfx?: {
    death?: SFXInstance[];
    play?: SFXInstance[];
    attack?: SFXInstance[];
    /** Voice line for when one of this card's `triggers` fires. */
    trigger?: SFXInstance[];
  };
  set: string[];
}

export interface SFXInstance {
  soundId: string;
  volume?: number;
  delay?: number; // Optional delay in milliseconds before playing the sound
}

export interface Player {
  id: PlayerID;
  name: string;
  // Mana crystals — see game/utils/mana.ts for the full rules. Every crystal
  // state (filled / empty / locked / pending / temporary) derives from these.
  maxMana: number; // Permanent crystals owned ("maximum mana")
  manaCap: number; // Ceiling on maxMana; 10 by default, raisable, hard cap 99
  availableMana: number; // Filled permanent crystals. MAY BE NEGATIVE when overload exceeds maxMana
  tempMana: number; // This-turn-only crystals (Coin/Innervate): spent first, vanish when spent
  overloadPending: number; // Accrued this turn from cards played; locks next turn (padlock beneath crystals)
  overloadLocked: number; // Crystals locked THIS turn (padlock blocking crystals)
  heroPortrait: string;
  maxHealth: number;
  health: number;
  armor: number;
  frozen?: boolean;
  divineShield?: boolean;
  immune?: boolean;
  attacksLeft: number;
  baseAttack: number;
  modifiers: CardModifier[];
  hand: Card[];
  deck: Card[];
  burntCards: Card[]; // Cards that couldn't fit in hand (hand was full)
  heroPowerUsedThisTurn: boolean;
  hero: Hero;
  weapon: Card | null; // Only one weapon can be equipped at a time
}

export type EffectContext = EffectContextWithCard | EffectContextWithHeroPower;

export interface EffectContextBase {
  G: GameState;
  ctx: Ctx;
  card?: Card;
  heroPower?: HeroPower;
  target?: TargetValue;
  playerID: string;
  location: "hand" | "board";
  lastTargetDied?: boolean;
  excessDamageDealt?: number; // Stores math for cards like Piercing Shot
  lastDamageDealt?: number;
  temp?: number;
  type: "spell" | "minion" | "heroPower" | "hero";
  // Index into GameState.eventHistory of the top-level (cardPlayed/heroPower/attack)
  // event that triggered this effect chain, so child events can reference it back.
  sourceEventIndex?: number;
}

interface EffectContextWithCard extends EffectContextBase {
  card: Card;
  type: "minion" | "spell";
}

interface EffectContextWithHeroPower extends EffectContextBase {
  heroPower: HeroPower;
  type: "heroPower";
}

type EffectContextWithOptionalCard = Omit<
  EffectContext,
  "card" | "heroPower" | "type"
> &
  Partial<Pick<EffectContext, "card" | "heroPower" | "type">>;

// ---------------------------------------------------------------------------
// TRIGGERS
//
// A trigger is "whenever <something happens>, do <effects>". The engine opens a
// TRIGGER WINDOW at fixed sequence points inside its actions (see fireTriggers
// in game/index.ts) and every card in play gets a chance to react.
//
// Two classes of window, and the difference matters:
//   - INTERCEPTION windows run their effects INLINE, mid-action, so the result
//     is visible to the rest of that action. "When your hero is attacked, gain
//     8 Armor" must add the armor BEFORE combat damage is computed.
//   - REACTION windows QUEUE their matches onto G.pendingTriggers; the host
//     drains them one at a time (machine: resolvingTriggers, one macrostep and
//     therefore one state update per firing). This matches Hearthstone: an AoE
//     deals all its damage first, then each "whenever damaged" reaction fires.
// ---------------------------------------------------------------------------

/**
 * The vocabulary card authors write. Several entries normalize onto the same
 * internal window with a preset filter — ON_SELF_DAMAGE / ON_MINION_DAMAGE /
 * ON_HERO_DAMAGE are all the DAMAGE window, differing only in which subject
 * they accept. See TRIGGER_SPECS in game/utils/triggers.ts.
 */
export type TriggerEventType =
  | "ON_SELF_DAMAGE" // this minion took damage (Acolyte of Pain, Gurubashi)
  | "ON_MINION_DAMAGE" // any/friendly minion took damage (Frothing, Armorsmith)
  | "ON_HERO_DAMAGE" // a hero took damage (Eye for an Eye)
  | "ON_MINION_DEATH" // a minion died (Flesheating Ghoul, Cult Master)
  | "ON_CHARACTER_HEAL" // anything was healed (Lightwarden)
  | "ON_MINION_HEALED" // a minion was healed (Northshire Cleric)
  | "OVERHEAL" // healing exceeded the missing health (Crimson Clergy)
  | "ON_SUMMON" // a minion entered play by any means (Knife Juggler)
  | "ON_MINION_PLAYED" // ...specifically played from hand (Repentance, Snipe)
  | "ON_CARD_PLAYED" // any card played (Questing Adventurer)
  | "ON_SPELL_CAST" // a spell finished resolving (Mana Wyrm, Pyromancer)
  | "ON_SECRET_PLAYED" // reserved for Secretkeeper — no call site yet
  | "ON_END_TURN"
  | "ON_START_TURN"
  | "ON_MINION_ATTACK" // a minion declared an attack (INTERCEPTION)
  | "ON_ENEMY_ATTACK"; // an enemy declared an attack (INTERCEPTION — secrets)

/** The internal windows every TriggerEventType normalizes onto. */
export type TriggerWindowType =
  | "DAMAGE"
  | "HEAL"
  | "DEATH"
  | "SUMMON"
  | "CARD_PLAYED"
  | "SPELL_CAST"
  | "SECRET_PLAYED"
  | "TURN_END"
  | "TURN_START"
  | "ATTACK_DECLARED";

/** Facts about the event, captured when the window opens. */
export interface TriggerData {
  /** Damage/heal actually applied (after shields, clamping). */
  amount?: number;
  /** Healing that went to waste because the target was already full. */
  overheal?: number;
  /** SUMMON only: did this minion come from the player's hand? */
  playedFromHand?: boolean;
}

/** Who/what the window happened TO. */
export interface TriggerSubject {
  kind: "card" | "player";
  id: string;
  ownerId: PlayerID;
}

/** One open window, passed to fireTriggers. */
export interface TriggerWindow {
  window: TriggerWindowType;
  /**
   * The player the window "belongs to", which FRIENDLY/ENEMY are measured
   * against: the acting player for turn/play/cast/summon/attack windows, the
   * subject's controller for damage/heal/death windows.
   */
  actingPlayer: PlayerID;
  subject?: TriggerSubject;
  data?: TriggerData;
  /** Index of the top-level event this window belongs to, for event chaining. */
  sourceEventIndex?: number;
}

/**
 * One "whenever X, do Y" clause on a card. Lives in Card.triggers; silence
 * wipes them along with the rest of the card's text.
 */
export interface TriggerDef {
  on: TriggerEventType;
  /**
   * The window's relevant player, relative to THIS card's controller — the
   * same scoping vocabulary ModifierLifecycle.expiryOwner uses.
   */
  player: "FRIENDLY" | "ENEMY" | "ANY_PLAYER";
  /**
   * Extra identity filter against the subject: "only" fires just for this card
   * (Gurubashi Berserker), "exclude" never fires for it (Knife Juggler doesn't
   * ping himself). Omitted = no identity constraint.
   */
  self?: "only" | "exclude";
  /** Narrows the SUBJECT card — tribe, attack <= 3, and so on. */
  conditions?: TargetCondition[];
  /** 0..1, rolled when the window matches (Nat Pagle's coin flip). */
  chance?: number;
  /**
   * Runs with this card as context.card and the subject as context.target, so
   * `target: "user-select"` inside means "the thing that triggered me".
   * context.lastDamageDealt / context.temp carry TriggerData.amount.
   */
  effects: EffectTypes[];
  /** Label shown on the trigger event; defaults to the card's title. */
  name?: string;
}

/**
 * A matched REACTION waiting to resolve. Matching (and the data snapshot)
 * happened when the window opened; resolution happens later, and fizzles
 * silently if the owner has left play by then.
 */
export interface PendingTrigger {
  cardId: string;
  ownerId: PlayerID;
  /** Index into the owner's `triggers` array. */
  triggerIndex: number;
  subject?: TriggerSubject;
  data?: TriggerData;
  sourceEventIndex?: number;
}

// ---------------------------------------------------------------------------
// PENDING CHOICE (Choose One / Discover)
// ---------------------------------------------------------------------------

/**
 * A prompt waiting on the player. `options` are real Card instances in both
 * shapes — for chooseOne they're the option cards (whose `effects` and
 * `targetQuery` drive resolution), for discover they're the candidates
 * themselves (the picked one goes to hand).
 */
export type PendingChoice =
  | {
      kind: "chooseOne";
      playerId: PlayerID;
      /** The parent card: a minion already on the board, or a held spell. */
      sourceCardId: string;
      cardZone: "board" | "held";
      /** The parent spell instance while cardZone === "held". */
      heldCard?: Card;
      options: Card[];
      /** Cancel receipts — mirror of activeBattlecryMinion's. */
      manaPaid: ManaPayment;
      overloadPaid: number;
      sourceEventIndex?: number;
    }
  | {
      kind: "discover";
      playerId: PlayerID;
      /** Card that discovered, for the UI header / eventRef chaining. */
      sourceCardId?: string;
      options: Card[];
      /** Picked card enters hand with temporary: true (the Gift cards). */
      temporary?: boolean;
      /** Tracking/Thrive: the picked card is REMOVED from the deck. */
      removePickedFromDeck?: boolean;
      sourceEventIndex?: number;
    };

export interface ModifierLifecycle {
  // Who cast the buff? ("0" or "1")
  sourcePlayerId: string;
  // At what point in the game loop should this expire?
  expiryTrigger: "END_OF_TURN" | "START_OF_TURN" | "PERMANENT" | "MINION_DEATH";
  // Whose turn timeline triggers the expiry?
  expiryOwner: "BUFF_CASTER" | "BUFF_RECEIVER" | "ANY_PLAYER";
  // Optional counter for multi-turn effects (e.g., lasts 2 turns)
  turnsRemaining?: number;
  // Minion ID
  minionId?: string;
}

/** Numeric stats a modifier can change. */
export type ModifierStatKey =
  | "attack"
  | "health"
  | "mana"
  | "durability"
  | "spellDamage";

/** Boolean keywords a modifier can grant. */
export type ModifierBoolKey =
  | "taunt"
  | "divineShield"
  | "stealth"
  | "charge"
  | "rush"
  | "windfury"
  | "frozen"
  | "poisonous"
  | "immune"
  | "elusive";

/**
 * One ENCHANTMENT: a single named modifier grouping every change it makes —
 * stat deltas and boolean keyword grants together ("+2/+2 and Taunt" is ONE
 * modifier). Shown as a single entry in the card hover UI.
 *
 * Boolean grants are derived (see hasKeyword): a card "has taunt" if its base
 * flag is set OR any modifier grants it. Consumable keywords (divine shield
 * popped by damage, stealth broken by attacking) are stripped from the
 * granting modifier via consumeKeyword — the modifier's stats survive; the
 * modifier itself is removed only once nothing remains.
 */
export interface CardModifier {
  id: string;
  name: string; // e.g. "Blessing of Kings" (defaults to the source card title)
  description: string; // e.g. "+4/+4", "+2/+2 and Taunt" (auto-generated if omitted)
  img?: string; // imageUrl of the card that granted this modifier
  sourceCardId: string;
  // "temporary" modifications have a lifecycle; "aura" / "inHand" / "enrage"
  // are managed entries owned by their refresh pass (refreshOngoing) and are
  // added/removed automatically as their source condition changes.
  type: "aura" | "permanent" | "temporary" | "inHand" | "enrage";
  stackable: boolean;
  stats?: Partial<Record<ModifierStatKey, number>>; // resolved numbers
  keys?: Partial<Record<ModifierBoolKey, true>>; // boolean keyword grants
  override?: boolean; // applies to this modifier's stats
  lifecycle?: ModifierLifecycle; // Optional metadata for temporal mechanics
  // --- GRANTED TEXT -------------------------------------------------------
  // Rules text this enchantment adds to the card, on top of whatever is
  // printed on it (Soul of the Forest, Power Overwhelming). Both run exactly
  // like the printed versions; see getCardDeathrattles / getCardTriggers.
  // Silence removes them for free, because it strips the whole modifier.
  deathrattle?: EffectTypes[];
  triggers?: TriggerDef[];
  /**
   * Who applied this enchantment. Granted triggers run their effects as THIS
   * player rather than the card's controller, which is what lets Blessing of
   * Wisdom on an enemy minion still draw for the caster.
   */
  casterId?: PlayerID;
}

export type TargetValue = {
  type: "card" | "player" | "lane";
  id: string;
  player: PlayerID;
};

// Strongly type the valid keys of your Card interface that can be checked numerically
export type NumericCardKey = "attack" | "health" | "mana";

export type DynamicValue =
  | {
      type: "player-armor";
      player: "friendly" | "enemy" | "all";
      mult?: number;
    }
  | {
      type: "temp";
      mult?: number;
    }
  | {
      type: "player-health";
      player: "friendly" | "enemy" | "all";
      mult?: number;
    }
  | {
      type: "cards-played";
      player: "friendly" | "enemy" | "all";
      mult?: number;
    }
  | {
      type: "card-stat";
      stat:
        | "attack"
        | "health"
        | "mana"
        | "maxHealth"
        | "damageTaken"
        // Crystals the card locks when played, 0 for everything else — the
        // precise test for "a card with Overload" (Unbound Elemental).
        | "overload";
      mult?: number;
    } // inspects current target
  | {
      type: "minion-count";
      side: "friendly" | "enemy" | "all";
      conditions?: TargetCondition[];
      mult?: number;
    }
  | {
      type: "hand-count";
      side: "friendly" | "enemy" | "all";
      conditions?: TargetCondition[];
      mult?: number;
    }
  | { type: "excess-damage"; mult?: number }
  | { type: "damage-dealt"; mult?: number }
  | {
      type: "combo-count";
      mult?: number;
    }
  | {
      // How much health the hero is missing (maxHealth - health)
      type: "player-missing-health";
      player: "friendly" | "enemy";
      mult?: number;
    }
  | {
      // Cards played by the current player this turn (combo-count without the -1)
      type: "cards-played-turn";
      mult?: number;
    }
  | {
      // Permanent Mana Crystals owned ("maximum mana"), or the ceiling on them.
      type: "player-max-mana" | "player-mana-cap";
      player: "friendly" | "enemy";
      mult?: number;
    }
  | {
      // A hero's current Attack, weapon and buffs included (Savagery).
      type: "player-attack";
      player: "friendly" | "enemy";
      mult?: number;
    }
  | {
      // How many more cards the OTHER player holds; 0 when not behind
      // (Divine Favor).
      type: "hand-diff";
      player: "friendly" | "enemy";
      mult?: number;
    }
  | {
      // Charges left on an equipped weapon; 0 when unarmed (Harrison Jones).
      type: "weapon-durability";
      player: "friendly" | "enemy";
      mult?: number;
    }
  | {
      // Attack of an equipped weapon, buffs included; 0 when unarmed
      // (Bloodsail Raider, Dread Corsair, Blade Flurry).
      type: "weapon-attack";
      player: "friendly" | "enemy";
      mult?: number;
    };
// most recent damage delt

export type BooleanCardKey =
  | "taunt"
  | "divineShield"
  | "frozen"
  | "stealth"
  | "charge"
  | "rush"
  | "poisonous"
  | "immune"
  | "elusive"
  | "cantAttack"
  | "silenced"
  | "isMinion"
  | "isSpell"
  | "isWeapon"
  | "isUncollectible"
  | "summoningSickness";

export type TargetCondition =
  | { type: "boolean"; key: BooleanCardKey; value: boolean }
  | {
      type: "numeric";
      key: DynamicValue;
      operator: "==" | "!=" | ">" | ">=" | "<" | "<=";
      value: DynamicValue | number;
    }
  | {
      type: "text-contains";
      key: "title" | "description" | "class" | "rarity";
      value: string;
      /** Inverts the match — "a card from ANOTHER class" (Pilfer). */
      negate?: boolean;
    }
  | { type: "tags-include"; value: string } // For "Wisp", "Demon", "Murloc"
  | { type: "state-match"; condition: "isDamaged" | "isUndamaged" } // Special derived states
  | { type: "exclude-self" }
  | { type: "is-friendly" } // Prevent hitting self with AoE
  | { type: "exclude-target" }
  | { type: "has-weapon"; side: "friendly" | "enemy" };

export interface TargetQuery {
  side: "friendly" | "enemy" | "all";
  type: ("card" | "player" | "hand" | "lane")[];
  conditions?: TargetCondition[]; // Chain multiple rules seamlessly
}

// EFFECT TYPES

export type EffectTypes =
  | DamageEffect
  | HealEffect
  | DrawEffect
  | ChangeKeyEffect
  | SummonEffect
  | DestroyEffect
  | ManaEffect
  | FreezeEffect
  | DivineShieldEffect
  | TauntEffect
  | StealthEffect
  | ChargeEffect
  | RushEffect
  | WindfuryEffect
  | PoisonousEffect
  | ImmuneEffect
  | ApplyModifierEffect
  | ArmorEffect
  | ConditionalEffect
  | SequenceEffect
  | BounceEffect
  | StoreTempVarEffect
  | AddToHandEffect
  | ReturnToHandEffect
  | DiscardEffect
  | EquipEffect
  | DurabilityEffect
  | SilenceEffect
  | TransformEffect
  | TakeControlEffect
  | DiscoverEffect;

/**
 * Offer the player a pick of `count` cards; the picked one goes to their hand.
 * Sets G.pendingChoice and HALTS the action there — so a discover must be the
 * LAST effect in a card's effect list (every Legacy discover card complies).
 */
export interface DiscoverEffect {
  type: "discover";
  /** Where candidates come from: all templates, or the owner's deck. */
  source: "global" | "deck";
  /** Fixed menu of template keys (the Gift cards) — overrides source search. */
  cardID?: string[];
  conditions?: TargetCondition[]; // e.g. tags-include Beast, isSpell
  /** Picked card enters hand with temporary: true. */
  temporary?: boolean;
  /** source "deck" only: the picked card is REMOVED from the deck (Tracking). */
  removeFromSource?: boolean;
  /** How many options to offer. Defaults to 3. */
  count?: number;
}

/**
 * Wipes everything text-granted from a minion: keyword flags, enchantments,
 * deathrattle/aura/enrage/inHand. Never kills (damage is clamped below max
 * health afterwards). Externally-granted auras survive — refreshOngoing
 * re-applies them on the next pass.
 */
export type SilenceEffect = {
  type: "silence";
} & BaseEffectSelection;

/**
 * Replaces a board minion with a different template IN PLACE — same board
 * index, same card.id (so the UI doesn't remount the slot). Irreversible:
 * the new card's originalID is the template it became.
 */
export type TransformEffect = {
  type: "transform";
  /** A specific template, or a list picked from at random per target. */
  cardID: string | string[];
} & BaseEffectSelection;

/**
 * Moves a minion to the acting player's board. No-ops when that board is
 * already full (7). The stolen minion enters with summoning sickness.
 */
export type TakeControlEffect = {
  type: "takeControl";
} & BaseEffectSelection;

export interface StoreTempVarEffect {
  type: "storeVar";
  target: "user-select";
  value: DynamicValue;
}

export interface ConditionalEffect {
  type: "conditional";
  conditions: TargetCondition[];
  then: EffectTypes[];
  else?: EffectTypes[];
}

export interface SequenceEffect {
  type: "sequence";
  steps: EffectTypes[];
}

export interface BounceEffect {
  type: "bounce";
  target: "user-select";
  modifiers?: ApplyModifierEffect[]; // For giving it "Costs (2) less"
}

/**
 * Where an addToHand pulls its cards from. "trigger-subject" is the card that
 * opened the current trigger window (context.target) — the only source that
 * needs no zone, since it may already have left play.
 */
export type AddToHandSource =
  | "deck"
  | "global"
  | "graveyard"
  | "hand"
  | "board"
  | "trigger-subject";

export interface AddToHandEffect {
  type: "addToHand";
  source: AddToHandSource;
  removeFromSource?: boolean; // If true, removes from source (e.g., draw from deck)
  // Which zone the `source` is read from. Defaults to the acting player's own;
  // "enemy-hand" / "enemy-deck" flip it to the opponent (Mind Vision,
  // Thoughtsteal). Also used for board/hand copies.
  target?:
    | "user-select"
    | "friendly-board"
    | "enemy-board"
    | "friendly-hand"
    | "enemy-hand"
    | "friendly-deck"
    | "enemy-deck";
  /**
   * WHOSE hand receives the cards; defaults to the acting player. Orthogonal to
   * `target`, which names the zone the pool is READ from — King Mukla reads no
   * zone and gives to "enemy", Lorewalker Cho copies the spell just cast into
   * the other player's hand.
   */
  recipient?: "self" | "enemy";
  conditions?: TargetCondition[]; // Filter cards (e.g., Demons, cost 7-10, etc.)
  cardID?: string | string[]; // Specific card(s) to add (e.g., "Cub", "Arcane Bolt")
  value: number | DynamicValue; // Count of cards to add
  rand?: {
    n: number; // How many random cards to pick
  };
  modifiers?: ApplyModifierEffect[]; // Apply modifiers after adding
  fallback?: {
    // If no matches found (e.g., "Sense Demons")
    cardID: string;
  };
}

export interface ReturnToHandEffect {
  type: "returnToHand";
  target: "user-select" | "friendly-board" | "enemy-board" | "board";
  conditions?: TargetCondition[];
  rand?: { n: number }; // Random selection
  modifiers?: ApplyModifierEffect[]; // Applied AFTER stripping all buffs
}

export type EffectTarget =
  | "user-select"
  | "friendly-hero"
  | "friendly-all"
  | "friendly-board"
  | "enemy-hero"
  | "enemy-board"
  | "enemy-all"
  | "board"
  // Both heroes plus every minion on both boards. Distinct from "board", which
  // is minions only. Pair with `exclude-self` for "all OTHER characters"
  // (Mad Bomber) — identity conditions keep hero targets, see resolveTargets.
  | "all-characters"
  | "self"
  | "adjacent" // neighbors of context.card — board index ±1 when on board, hand index ±1 when in hand
  | "adjacent-target" // neighbors of context.target on its owner's board (e.g. Explosive Shot)
  | "friendly-hand" // cards in the acting player's hand (e.g. Sorcerer's Apprentice)
  | "enemy-hand"
  | "friendly-weapon" // the acting player's equipped weapon (e.g. Deadly Poison)
  | "enemy-weapon"; // the opponent's equipped weapon

export type BaseEffectSelection = {
  target: EffectTarget;
  conditions?: TargetCondition[]; // filter conditions, so like "2 damage to all taunt minions"
  rand?: {
    split: boolean; // random split, just for damage for now, maybe for healing later
    n: number; // 0 for all, positive for specific, negative for size - n
  };
};

export type BaseBoolEffect = {
  // Set by battlecry keyword grants (e.g. Argent Protector). Mirrors the flag
  // on DamageEffect; it was previously smuggled through an `as` cast.
  battlecry?: boolean;
} & BaseEffectSelection;

export type FreezeEffect = {
  type: "freeze";
} & BaseBoolEffect;

export type DivineShieldEffect = {
  type: "divineShield";
} & BaseBoolEffect;

export type TauntEffect = {
  type: "taunt";
} & BaseBoolEffect;

export type StealthEffect = {
  type: "stealth";
} & BaseBoolEffect;

export type ChargeEffect = {
  type: "charge";
} & BaseBoolEffect;

export type RushEffect = {
  type: "rush";
} & BaseBoolEffect;

export type WindfuryEffect = {
  type: "windfury";
} & BaseBoolEffect;

export type PoisonousEffect = {
  type: "poisonous";
} & BaseBoolEffect;

export type ImmuneEffect = {
  type: "immune";
} & BaseBoolEffect;

/**
 * The keyword effects — the ones whose whole job is flipping a boolean on a
 * target. Listed explicitly rather than Extract'd from EffectTypes, because
 * damage/heal/destroy also carry BaseEffectSelection and would sneak in.
 */
export type BoolKeywordEffect =
  | FreezeEffect
  | DivineShieldEffect
  | TauntEffect
  | StealthEffect
  | ChargeEffect
  | RushEffect
  | WindfuryEffect
  | PoisonousEffect
  | ImmuneEffect;

export type BoolEffectType = BoolKeywordEffect["type"];

export type DamageEffect = {
  type: "damage";
  value: number | DynamicValue;
  battlecry?: boolean; // Indicates if this damage is part of a battlecry (bypasses taunt)
} & BaseEffectSelection;

type DestroyEffect = {
  type: "destroy";
} & BaseEffectSelection;

type HealEffect = {
  type: "heal";
  value: number | DynamicValue;
} & BaseEffectSelection;

export type ApplyModifierEffect = {
  type: "applyModifier";
  /** Enchantment name; defaults to the source card's title. */
  name?: string;
  /** Hover text; auto-generated from stats/keys if omitted ("+2/+2 and Taunt"). */
  description?: string;
  // When false (default), re-applying a modifier with the same sourceCardId +
  // name REPLACES the existing one (and one that resolves to all-zero stats
  // with no keys removes it). When true, every application stacks.
  stackable?: boolean;
  /** Stat deltas (or sets, with override). Values resolve at apply time. */
  stats?: Partial<Record<ModifierStatKey, number | DynamicValue>>;
  /** Boolean keyword grants: { taunt: true, stealth: true, ... } */
  keys?: Partial<Record<ModifierBoolKey, true>>;
  /**
   * Rules TEXT to graft onto the target — the enchantment equivalent of the
   * card's own `deathrattle` / `triggers`. A modifier carrying only text (no
   * stats, no keys) is still a real enchantment, so pass a `description`:
   * describeModifier can only summarise numbers and keywords.
   */
  deathrattle?: EffectTypes[];
  triggers?: TriggerDef[];
  override?: boolean;
  mult?: number | DynamicValue; // multiplies every stat value
  min?: number; // per-stat clamp on the resulting stat (refresh passes)
  max?: number;
  duration?: {
    expiryTrigger: "END_OF_TURN" | "START_OF_TURN";
    expiryOwner: "BUFF_CASTER" | "BUFF_RECEIVER" | "ANY_PLAYER";
    turnsRemaining?: number;
  };
} & BaseEffectSelection;

type DrawEffect = {
  type: "draw";
  value: number | DynamicValue;
  target?: "self" | "enemy";
};

type ChangeKeyEffect = {
  type: "changeKey";
  key: keyof Card; // Key to change in the card object
  value: number | DynamicValue;
  target: "user-select" | "self"; // Target of the change, either "other" or "self"
};

export type SummonEffect = {
  type: "summon";
  target: "self" | "enemy";
  /**
   * Summon a fresh copy of the card this effect is running on, from its own
   * template — "Deathrattle: Resummon this minion" (Ancestral Spirit). Takes
   * precedence over cardID; the copy carries no damage or enchantments.
   */
  fromSelf?: boolean;
  cardID?: string | string[]; // A specific card, or a list of options picked from at random (per summon). Omit to summon from all minion templates.
  conditions?: TargetCondition[]; // Filter candidates (e.g. summon a random Demon)
  value: number | DynamicValue; // How many minions to summon
};

type ArmorEffect = {
  type: "armor";
  target: "self" | "enemy";
  value: number | DynamicValue;
};

type EquipEffect = {
  type: "equip";
  target: "self" | "enemy";
  cardID: string; // ID of the weapon card to equip
};

/**
 * Changes a weapon's CURRENT durability — distinct from
 * `applyModifier({ stats: { durability: n } })`, which changes its MAXIMUM.
 * Positive repairs (clamped at max), negative chips it (and can break it).
 */
export type DurabilityEffect = {
  type: "durability";
  value: number | DynamicValue;
} & BaseEffectSelection;

export type ManaMode =
  | "temporary" // The Coin / Innervate: this turn only, spent first, vanishes
  | "crystal-empty" // Wild Growth: +maximum mana, no available mana
  | "crystal-filled" // +maximum AND +available mana
  | "destroy" // Felguard: destroy permanent crystals, empty ones first
  | "unlock-overload" // Lava Shock: unlock and refill overloaded crystals
  | "raise-cap"; // Wildheart Guff: raise the ceiling above 10

type ManaEffect = {
  type: "mana";
  value: number | DynamicValue;
  /** Defaults to "temporary", which is what The Coin and Innervate want. */
  mode?: ManaMode;
  /** "unlock-overload" only. Defaults to "locked". */
  scope?: "locked" | "pending" | "both";
  /** Defaults to "self". */
  target?: "self" | "enemy";
};

type DiscardEffect = {
  type: "discard";
  strategy: "random" | "highest-cost" | "lowest-cost" | "all";
  value: number | DynamicValue;
  target?: "self" | "enemy";
};

// Move metadata for animation detection
export type MoveMetadata = {
  cardId: string;
  location: "hand" | "board";
  target?: TargetValue;
  timestamp: number;
};

// Game event types for comprehensive event tracking
// Every recorded event carries a monotonic `seq` (its index in
// GameState.eventHistory), assigned by recordEvent. Clients use it to filter
// already-processed events (timestamps can collide within the same ms).
export type GameEvent = GameEventBody & { seq?: number };

type GameEventBody =
  | AttackEvent
  | BattlecryEvent
  | DamageEvent
  | HealEvent
  | DeathEvent
  | CardPlayedEvent
  | MinionPlacedEvent
  | SummonEvent
  | EndTurnEvent
  | SpellEvent
  | DrawCardEvent
  | BeginTurnEvent
  | ChangeKeyEvent
  | ManaEvent
  | FreezeEvent
  | DivineShieldEvent
  | TauntEvent
  | StealthEvent
  | ChargeEvent
  | RushEvent
  | WindfuryEvent
  | PoisonousEvent
  | ImmuneEvent
  | ApplyModifierEvent
  | ArmorEvent
  | DebugEvent
  | AddToHandEvent
  | ReturnToHandEvent
  | BurnCardEvent
  | DiscardEvent
  | HeroPowerEvent
  | EquipEvent
  | DurabilityEvent
  | DestroyWeaponEvent
  | GameEndEvent
  | CoinTossEvent
  | MulliganEvent
  | SilenceEvent
  | TransformEvent
  | TakeControlEvent
  | TriggerEvent
  | ChoiceOfferedEvent
  | ChoiceResolvedEvent;

/**
 * A Choose One / Discover prompt opened. Options ride along so the client can
 * render the overlay from the event stream if it wants to.
 */
export type ChoiceOfferedEvent = {
  type: "choiceOffered";
  kind: "chooseOne" | "discover";
  playerId: PlayerID;
  /** The parent card (chooseOne) or the discovering card (discover). */
  cardId?: string;
  options: Card[];
  timestamp: number;
  eventRef?: number;
};

/**
 * The player picked an option. Recorded BEFORE the option's effects run so
 * everything they produce chains back here via eventRef. Also what satisfies
 * MatchManager's eventHistory-growth "move applied" heuristic.
 */
export type ChoiceResolvedEvent = {
  type: "choiceResolved";
  kind: "chooseOne" | "discover";
  playerId: PlayerID;
  /** The parent/discovering card, when there was one. */
  cardId?: string;
  optionIndex: number;
  optionName: string;
  /** Discover: snapshot of the picked card as it entered the hand. */
  card?: Card;
  timestamp: number;
  eventRef?: number;
};

/**
 * A card's trigger fired. Recorded BEFORE the trigger's effects run, so every
 * event those effects produce points back here via eventRef — the client gets
 * "this minion lit up, and then these things happened" for free.
 */
export type TriggerEvent = {
  type: "trigger";
  cardId: string; // the card whose trigger fired
  playerId: PlayerID; // its controller
  name: string; // TriggerDef.name, or the card's title
  triggerType: TriggerEventType;
  timestamp: number;
  /** What the window happened to, when there was one. */
  subjectId?: string;
  subjectType?: "card" | "player";
  eventRef?: number;
  snapshot: Card;
};

/** A minion had its text and enchantments wiped. */
export type SilenceEvent = {
  type: "silence";
  cardId: string;
  playerId: PlayerID;
  sourceId?: string;
  timestamp: number;
  eventRef?: number;
  snapshot: Card; // Deep clone of the card AFTER the wipe
};

/** A minion was replaced in place by a different template (Polymorph/Hex). */
export type TransformEvent = {
  type: "transform";
  cardId: string; // preserved across the swap
  playerId: PlayerID;
  sourceId?: string;
  timestamp: number;
  card: Card; // what it became
  eventRef?: number;
  snapshot: Card; // Deep clone of the replacement at record time
};

/** A minion changed sides (Mind Control, Sylvanas). */
export type TakeControlEvent = {
  type: "takeControl";
  cardId: string;
  fromPlayerId: PlayerID;
  toPlayerId: PlayerID;
  playerId: PlayerID; // the player who GAINED it (mirrors other events)
  sourceId?: string;
  timestamp: number;
  card: Card;
  eventRef?: number;
  snapshot: Card;
};

/** Recorded once at game creation: who won the coin toss and goes first. */
export type CoinTossEvent = {
  type: "coinToss";
  firstPlayer: PlayerID;
  timestamp: number;
};

/** A player locked in their starting hand (replacedCount cards redrawn). */
export type MulliganEvent = {
  type: "mulligan";
  playerId: PlayerID;
  replacedCount: number;
  timestamp: number;
};

type GameEndEvent = {
  type: "gameEnd";
  winner: PlayerID | "draw";
  timestamp: number;
};

type DebugEvent = {
  type: "debug";
  playerId: PlayerID;
  timestamp: number;
  details: string;
};

type ApplyModifierEvent = {
  type: "applyModifier";
  sourceId?: string; // Card/effect that caused this status change
  targetId: string; // Card/minion gaining the enchantment
  targetType: "card" | "player";
  playerId: PlayerID;
  timestamp: number;
  name: string;
  description: string;
  stats?: Partial<Record<ModifierStatKey, number>>;
  keys?: Partial<Record<ModifierBoolKey, true>>;
  removed?: boolean; // the modifier (or a keyword grant on it) was removed
};

type BaseGameBoolEvent = {
  sourceId?: string; // Card/effect that caused this status change
  targetId: string; // Card/minion gaining the status
  targetType: "card" | "player";
  playerId: PlayerID;
  timestamp: number;
};

export type FreezeEvent = {
  type: "freeze";
} & BaseGameBoolEvent;

export type DivineShieldEvent = {
  type: "divineShield";
} & BaseGameBoolEvent;

export type TauntEvent = {
  type: "taunt";
} & BaseGameBoolEvent;

export type StealthEvent = {
  type: "stealth";
} & BaseGameBoolEvent;

export type ChargeEvent = {
  type: "charge";
} & BaseGameBoolEvent;

export type RushEvent = {
  type: "rush";
} & BaseGameBoolEvent;

export type WindfuryEvent = {
  type: "windfury";
} & BaseGameBoolEvent;

export type PoisonousEvent = {
  type: "poisonous";
} & BaseGameBoolEvent;

export type ImmuneEvent = {
  type: "immune";
} & BaseGameBoolEvent;

export type SummonEvent = {
  type: "summon";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card; // Include full card data for easier animation handling
  eventRef?: number; // Index of the top-level event that caused this
};

export type EquipEvent = {
  type: "equip";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card; // Include full weapon card data for easier animation handling
  eventRef?: number; // Index of the top-level event that caused this
  snapshot: Card; // Deep clone of the equipped weapon at record time
};

/**
 * An equipped weapon broke — ran out of durability, or was destroyed outright.
 *
 * Distinct from DeathEvent, which this used to masquerade as: a weapon is not a
 * minion, it has no board slot to play a death animation on, and the client's
 * death handling fires the minion-death cue for it. Deliberately does NOT open
 * the DEATH trigger window; "whenever a minion dies" must not see a weapon.
 */
export type DestroyWeaponEvent = {
  type: "destroyWeapon";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card; // The weapon that broke, for sfx lookup
  eventRef?: number; // Index of the top-level event that caused this
  snapshot: Card; // Deep clone of the weapon at the moment it broke
};

export type DurabilityEvent = {
  type: "durability";
  cardId: string;
  playerId: PlayerID;
  value: number; // Signed delta actually applied after clamping
  timestamp: number;
  eventRef?: number; // Index of the top-level event that caused this
  snapshot: Card; // Deep clone of the weapon after the change
};

export type ArmorEvent = {
  type: "armor";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  value: number;
};

export type SpellEvent = {
  type: "spell";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card; // Include full card data for easier animation handling
  turn: number;
};

export type ManaEvent = {
  type: "mana";
  playerId: PlayerID;
  timestamp: number;
  // Optional so the hero-power recordEvent can stay as-is.
  mode?: ManaMode;
  value?: number;
  snapshot?: Player; // Deep clone of the player after the change
};

export type EndTurnEvent = {
  type: "endTurn";
  playerId: PlayerID;
  timestamp: number;
};

export type BeginTurnEvent = {
  type: "beginTurn";
  playerId: PlayerID;
  timestamp: number;
};

export type DrawCardEvent = {
  type: "drawCard";
  playerId: PlayerID;
  timestamp: number;
  cardId: string;
  eventRef?: number; // Index of the top-level event that caused this
  snapshot: Card; // Deep clone of the drawn card at record time
};

export type ChangeKeyEvent = {
  type: "changeKey";
  key: string;
  value: any;
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
};

export type CardPlayedEvent = {
  type: "cardPlayed";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card; // Include full card data for easier animation handling
  turn: number;
};

export type MinionPlacedEvent = {
  type: "minionPlaced";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card; // Include full card data for easier animation handling
  turn: number;
};

export type AttackEvent = {
  type: "attack";
  attackerId: string;
  targetId: string;
  targetType: "card" | "player";
  targetPlayerId: PlayerID;
  attackerPlayerId: PlayerID;
  sourceId?: string; // Optional for extensibility
  timestamp: number;
  card?: Card; // Attacking minion/weapon card, for sfx lookup (absent for bare hero attacks)
};

export type BattlecryEvent = {
  type: "battlecry";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  targetId: string;
  targetType: "card" | "player";
};

export type DamageEvent = {
  type: "damage";
  sourceId?: string; // Card/effect that caused damage
  targetId: string;
  targetType: "card" | "player";
  playerId: PlayerID;
  value: number;
  timestamp: number;
  eventRef?: number; // Index of the top-level event that caused this
  snapshot: Card | Player; // Deep clone of the damaged card/player at record time
};

export type HealEvent = {
  type: "heal";
  sourceId?: string; // Card/effect that caused healing
  targetId: string;
  targetType: "card" | "player";
  playerId: PlayerID;
  value: number;
  timestamp: number;
  eventRef?: number; // Index of the top-level event that caused this
  snapshot: Card | Player; // Deep clone of the healed card/player at record time
};

export type DeathEvent = {
  type: "death";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card; // The card that died, for sfx lookup
  eventRef?: number; // Index of the top-level event that caused this
  snapshot: Card; // Deep clone of the card at the moment it died
};

export type AddToHandEvent = {
  type: "addToHand";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card;
  source: AddToHandSource;
  eventRef?: number; // Index of the top-level event that caused this
  snapshot: Card; // Deep clone of the card at record time
};

export type ReturnToHandEvent = {
  type: "returnToHand";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card;
  fromBoard: boolean;
  eventRef?: number; // Index of the top-level event that caused this
  snapshot: Card; // Deep clone of the card at record time
};

export type BurnCardEvent = {
  type: "burnCard";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card;
};

export type HeroPowerEvent = {
  type: "heroPower";
  playerId: PlayerID;
  timestamp: number;
  targetId?: string;
  targetType?: "card" | "player";
  heroPower: HeroPower;
};

export type DiscardEvent = {
  type: "discard";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card;
  strategy: "random" | "highest-cost" | "lowest-cost" | "all";
  eventRef?: number; // Index of the top-level event that caused this
  snapshot: Card; // Deep clone of the card at record time
};

export interface SavedDeck {
  id: string;
  name: string;
  hero: Hero;
  deckString: DeckString;
}

export interface GameState {
  players: Record<PlayerID, Player>;
  board: Record<PlayerID, Card[]>;
  lastMove?: MoveMetadata; // Track last move for animation detection
  gameEvents: GameEvent[]; // Current move events (cleared each move)
  eventHistory: GameEvent[]; // Full game history (debug log)
  activeBattlecryMinion?: {
    cardId: string;
    playerId: PlayerID;
    sourceEventIndex: number; // Index of the cardPlayed event this battlecry belongs to
    manaPaid: ManaPayment; // Receipt so cancelling refunds the exact temp/permanent mix
    overloadPaid: number; // Overload charged by this play, refunded on cancel
  } | null; // Tracks minion waiting to resolve targeted battlecry

  // Index of the top-level event (cardPlayed/attack/heroPower) whose effects
  // left minions at <= 0 HP. Set by moves, consumed by resolveDeathWave for
  // eventRef chaining, cleared once the board is clean.
  pendingSourceEventIndex?: number;

  // Matched REACTION triggers waiting to resolve, oldest first. Filled by
  // fireTriggers; drained one per macrostep by the machine's resolvingTriggers
  // state (or all at once by engine.applyMove's settle path).
  pendingTriggers?: PendingTrigger[];

  // Set when a player ends their turn; the turn only actually flips once
  // deaths and end-of-turn triggers have finished resolving. Consumed by
  // finishTurnAdvance (engine.ts).
  pendingTurnAdvance?: boolean;

  // A Choose One / Discover prompt waiting on the player. Options are FULL
  // Card instances for both kinds (instantiated once, so both clients and
  // MCTS clones see the same list — plain JSON, structuredClone-safe).
  // Everything halts on it: the machine parks in `awaitingChoice`, the settle
  // loop stops, and applyMove rejects every move except
  // resolveChoice / cancelChoice / endTurn.
  pendingChoice?: PendingChoice;

  // Runaway backstop: counts trigger firings within one player action so a
  // pair of minions that trigger each other can't loop forever. Reset wherever
  // a move clears G.gameEvents.
  triggerFires?: number;

  // Automatic (non-targeted) battlecry waiting to resolve. Set by placeCard,
  // consumed by resolvePendingAutoBattlecry via the machine's
  // resolvingBattlecry state (or drained synchronously by engine.applyMove's
  // settle path).
  pendingAutoBattlecry?: {
    cardId: string;
    playerId: PlayerID;
    target?: TargetValue;
    sourceEventIndex?: number;
  } | null;

  // Pre-game mulligan phase. Set at game creation (coin toss decides
  // firstPlayer = ctx.currentPlayer); active until both seats confirm their
  // starting hands, at which point the first turn begins.
  mulligan?: {
    active: boolean;
    firstPlayer: PlayerID;
    confirmed: Record<PlayerID, boolean>;
  };

  // ADD THIS: Global tracking of spent spells and dead minions
  graveyard: {
    card: Card;
    originalOwner: PlayerID;
    diedOnTurn: number;
  }[];

  // Tracking of discarded cards
  discardedCards: {
    card: Card;
    originalOwner: PlayerID;
    discardedOnTurn: number;
    strategy: string;
  }[];
}
