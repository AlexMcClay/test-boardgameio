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

export interface HeroPower {
  name: string;
  description: string;
  manaCost: number;
  effects: Array<EffectTypes>;
  targetQuery: TargetQuery;
  imageUrl: string; // URL to the card image
}

export interface Hero {
  name: string;
  portrait: string;
  ability?: string;
  class: string;
  heroName: string;
  heroPower?: HeroPower;
}

export interface Card {
  id: string;
  originalID: string;
  title: string;
  description: string;
  baseMana?: number;
  baseAttack?: number;
  baseHealth?: number;
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
  taunt?: boolean; // Optional, to indicate if the card has taunt
  frozen?: boolean;
  stealth?: boolean;
  divineShield?: boolean;
  charge?: boolean;
  rush?: boolean;
  windfury?: boolean;
  // 2. Structural tracking for real-time damage
  damageTaken: number;
  attacksLeft: number;
  // 3. Volatile attachment array
  modifiers?: CardModifier[];
  rarity?: "Common" | "Rare" | "Epic" | "Legendary";
  tags?: string[];
  targetQuery: TargetQuery;
  battlecryQuery?: TargetQuery;
  class: string;
  sfx?: {
    death?: SFXInstance[];
    play?: SFXInstance[];
    attack?: SFXInstance[];
  };
}

export interface SFXInstance {
  soundId: string;
  volume?: number;
  delay?: number; // Optional delay in milliseconds before playing the sound
}

export interface Player {
  id: PlayerID;
  name: string;
  manaCrystals: number;
  maxManaCrystals: number;
  heroPortrait: string;
  maxHealth: number;
  health: number;
  armor: number;
  frozen?: boolean;
  divineShield?: boolean;
  attacksLeft: number;
  baseAttack: number;
  modifiers: CardModifier[];
  mana: number;
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

export interface ModifierLifecycle {
  // Who cast the buff? ("0" or "1")
  sourcePlayerId: string;
  // At what point in the game loop should this expire?
  expiryTrigger: "END_OF_TURN" | "START_OF_TURN" | "PERMANENT";
  // Whose turn timeline triggers the expiry?
  expiryOwner: "BUFF_CASTER" | "BUFF_RECEIVER" | "ANY_PLAYER";
  // Optional counter for multi-turn effects (e.g., lasts 2 turns)
  turnsRemaining?: number;
}

export interface CardModifier {
  id: string;
  label?: string;
  sourceCardId: string;
  type: "aura" | "permanent" | "temporary"; // "temporary" modifications have a lifecycle
  stat:
    | "attack"
    | "health"
    | "mana"
    | "taunt"
    | "divineShield"
    | "frozen"
    | "durability";
  value: number;
  lifecycle?: ModifierLifecycle; // Optional metadata for temporal mechanics
  override: boolean;
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
      stat: "attack" | "health" | "mana" | "maxHealth";
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
    };
// most recent damage delt

export type BooleanCardKey =
  | "taunt"
  | "divineShield"
  | "frozen"
  | "stealth"
  | "charge"
  | "rush"
  | "isMinion"
  | "isSpell"
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
      key: "title" | "description" | "class";
      value: string;
    }
  | { type: "tags-include"; value: string } // For "Wisp", "Demon", "Murloc"
  | { type: "state-match"; condition: "isDamaged" | "isUndamaged" } // Special derived states
  | { type: "exclude-self" }
  | { type: "is-friendly" }; // Prevent hitting self with AoE

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
  | ApplyModifierEffect
  | ArmorEffect
  | ConditionalEffect
  | SequenceEffect
  | BounceEffect
  | StoreTempVarEffect
  | AddToHandEffect
  | ReturnToHandEffect
  | DiscardEffect
  | EquipEffect;

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

export interface AddToHandEffect {
  type: "addToHand";
  source: "deck" | "global" | "graveyard" | "hand" | "board";
  removeFromSource?: boolean; // If true, removes from source (e.g., draw from deck)
  target?:
    | "user-select"
    | "friendly-board"
    | "enemy-board"
    | "friendly-hand"
    | "enemy-hand"; // For board/hand copies
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

export type BaseEffectSelection = {
  target:
    | "user-select"
    | "friendly-hero"
    | "friendly-all"
    | "friendly-board"
    | "enemy-hero"
    | "enemy-board"
    | "enemy-all"
    | "board"
    | "self";
  conditions?: TargetCondition[]; // filter conditions, so like "2 damage to all taunt minions"
  rand?: {
    split: boolean; // random split, just for damage for now, maybe for healing later
    n: number; // 0 for all, positive for specific, negative for size - n
  };
};

export type BaseBoolEffect = {} & BaseEffectSelection;

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
  stat: "attack" | "health" | "mana" | "taunt" | "divineShield" | "frozen";
  override: boolean;
  value: number | DynamicValue;
  min?: number;
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
};

type ChangeKeyEffect = {
  type: "changeKey";
  key: keyof Card; // Key to change in the card object
  value: number | DynamicValue;
  target: "user-select" | "self"; // Target of the change, either "other" or "self"
};

type SummonEffect = {
  type: "summon";
  target: "self" | "enemy";
  cardID: string; // ID of the card to summon
  value: number | DynamicValue; // count
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

type ManaEffect = {
  type: "mana";
  value: number | DynamicValue;
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
  | ApplyModifierEvent
  | ArmorEvent
  | DebugEvent
  | AddToHandEvent
  | ReturnToHandEvent
  | BurnCardEvent
  | DiscardEvent
  | HeroPowerEvent
  | EquipEvent
  | GameEndEvent
  | CoinTossEvent
  | MulliganEvent;

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
  targetId: string; // Card/minion gaining the status
  targetType: "card" | "player";
  playerId: PlayerID;
  timestamp: number;
  key: string;
  value: any;
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
  source: "deck" | "global" | "graveyard" | "hand" | "board";
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
  } | null; // Tracks minion waiting to resolve targeted battlecry

  // Index of the top-level event (cardPlayed/attack/heroPower) whose effects
  // left minions at <= 0 HP. Set by moves, consumed by resolveDeathWave for
  // eventRef chaining, cleared once the board is clean.
  pendingSourceEventIndex?: number;

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
