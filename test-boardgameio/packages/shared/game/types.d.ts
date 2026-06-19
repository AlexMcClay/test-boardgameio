import type { CardTemplateKey } from "./data/cards";
import type { Ctx, PlayerID } from "boardgame.io";

export type DeckString = Partial<Record<CardTemplateKey, number>>;

export interface Hero {
  name: string;
  portrait: string;
  ability?: string;
  class: string;
  heroName: string;
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
  hasAttacked?: boolean; // Optional, to track if the card has attacked this turn
  summoningSickness?: boolean; // Optional, to track if minion was just placed (shows Zzz)
  isSpell?: boolean; // Optional, to indicate if the card is a spell
  isMinion: boolean; // Optional, to indicate if the card is a minion
  isUncollectible?: boolean; // Optional, to indicate if the card is uncollectible (like tokens)
  taunt?: boolean; // Optional, to indicate if the card has taunt
  frozen?: boolean;
  stealth?: boolean;
  divineShield?: boolean;
  charge?: boolean;
  rush?: boolean;
  // 2. Structural tracking for real-time damage
  damageTaken: number;
  // 3. Volatile attachment array
  modifiers?: CardModifier[];
  rarity?: "Common" | "Rare" | "Epic" | "Legendary";
  tags?: string[];
  targetQuery: TargetQuery;
  battlecryQuery?: TargetQuery;
  class: string;
  sfx?: {
    death?: string[];
    play?: string[];
    attack?: string[];
  };
}

export interface Player {
  id: PlayerID;
  name: string;
  heroPortrait: string;
  maxHealth: number;
  health: number;
  armor: number;
  frozen?: boolean;
  divineShield?: boolean;
  mana: number;
  hand: Card[];
  deck: Card[];
}

export interface EffectContext {
  G: GameState;
  ctx: Ctx;
  card: Card;
  target?: TargetValue;
  playerID: string;
  location: "hand" | "board";
  lastTargetDied?: boolean;
  excessDamageDealt?: number; // Stores math for cards like Piercing Shot
  lastDamageDealt?: number;
  temp?: number;
}

type EffectContextWithOptionalCard = Omit<EffectContext, "card"> &
  Partial<Pick<EffectContext, "card">>;

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
  stat: "attack" | "health" | "mana" | "taunt" | "divineShield" | "frozen";
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
  | { type: "damage-dealt"; mult?: number }; // most recent damage delt

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
  | { type: "tags-include"; key: "types" | "tags"; value: string } // For "Wisp", "Demon", "Murloc"
  | { type: "state-match"; condition: "isDamaged" | "isUndamaged" } // Special derived states
  | { type: "exclude-self" }; // Prevent hitting self with AoE

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
  | ApplyModifierEffect
  | ArmorEffect
  | ConditionalEffect
  | SequenceEffect
  | BounceEffect
  | StoreTempVarEffect;

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

export type BaseBoolEffect = {
  battlecry?: boolean; // Indicates if this damage is part of a battlecry (bypasses taunt)
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

export type DamageEffect = {
  type: "damage";
  value: number | DynamicValue;
  battlecry?: boolean; // Indicates if this damage is part of a battlecry (bypasses taunt)
} & BaseEffectSelection;

type DestroyEffect = {
  type: "destroy";
  battlecry?: boolean; // Indicates if this destroy effect is part of a battlecry (bypasses taunt)
} & BaseEffectSelection;

type HealEffect = {
  type: "heal";
  value: number | DynamicValue;
  battlecry?: boolean;
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

type ManaEffect = {
  type: "mana";
  value: number | DynamicValue;
};

// Move metadata for animation detection
export type MoveMetadata = {
  cardId: string;
  location: "hand" | "board";
  target?: TargetValue;
  timestamp: number;
};

// Game event types for comprehensive event tracking
// Game event types for comprehensive event tracking
export type GameEvent =
  | AttackEvent
  | DamageEvent
  | HealEvent
  | DeathEvent
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
  | ApplyModifierEvent
  | ArmorEvent;

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

export type SummonEvent = {
  type: "summon";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card; // Include full card data for easier animation handling
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
};

export type ChangeKeyEvent = {
  type: "changeKey";
  key: string;
  value: any;
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
};

export type MinionPlacedEvent = {
  type: "minionPlaced";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
  card: Card; // Include full card data for easier animation handling
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
};

export type DamageEvent = {
  type: "damage";
  sourceId?: string; // Card/effect that caused damage
  targetId: string;
  targetType: "card" | "player";
  playerId: PlayerID;
  value: number;
  timestamp: number;
};

export type HealEvent = {
  type: "heal";
  sourceId?: string; // Card/effect that caused healing
  targetId: string;
  targetType: "card" | "player";
  playerId: PlayerID;
  value: number;
  timestamp: number;
};

export type DeathEvent = {
  type: "death";
  cardId: string;
  playerId: PlayerID;
  timestamp: number;
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
  maxMana: number; // Optional, if you want to track max mana globally
  lastMove?: MoveMetadata; // Track last move for animation detection
  gameEvents: GameEvent[]; // Current move events (cleared each move)
  eventHistory: GameEvent[]; // Full game history (debug log)
  activeBattlecryMinion?: { cardId: string; playerId: PlayerID } | null; // Tracks minion waiting to resolve targeted battlecry

  // ADD THIS: Global tracking of spent spells and dead minions
  graveyard: {
    card: Card;
    originalOwner: PlayerID;
    diedOnTurn: number;
  }[];
}
