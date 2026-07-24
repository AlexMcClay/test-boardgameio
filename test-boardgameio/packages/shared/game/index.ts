import type {
  Card,
  CardModifier,
  GameState,
  ModifierStatKey,
  Player,
  TargetValue,
  Hero,
  EffectTypes,
  EffectContext,
  GameCtx,
  PlayerID,
} from "./types";
import {
  createCardFromID,
  consumeKeyword,
  getAttack,
  getCurrentHealth,
  getManaCost,
  getMaxHealth,
  getSpellDamage,
  hasKeyword,
  shuffleDeck,
  applyBoolEffectToCard,
  applyBoolEffectToPlayer,
  shouldMinionUnfreezeAtTurnEnd,
  shouldHeroUnfreezeAtTurnEnd,
  proccessApplyModifier,
  processApplyModifierToPlayer,
  dealDamageToCard,
  dealDamageToPlayer,
  healCard,
  healPlayer,
  recordEvent,
  isBaseEffectSelection,
  addCardToHand,
  findCardsInPool,
  resolveSummonCandidates,
  returnCardToHand,
  discardCardsFromHand,
  isUserSelectValue,
  getPlayerAttack,
  syncManagedModifiers,
  type ManagedModifierSpec,
} from "./utils";
type Ctx = GameCtx;
import {
  hasTargets,
  validateHeroAttack,
  validateMove,
  validateTargetQuery,
} from "./utils/validateMove";
import type { CardTemplateKey } from "./data/cards";
import {
  checkSingleTargetCondition,
  resolveDynamicValue,
  resolveTargets,
} from "./utils/effectEngine.js";

export function checkVictory(G: GameState): { winner: PlayerID } | undefined {
  if (G.players[0].health <= 0) {
    return { winner: "1" };
  } else if (G.players[1].health <= 0) {
    return { winner: "0" };
  }
}

export interface GameSetupData {
  player0: {
    playerUsername?: string;
    deck: Card[];
    hero: Hero;
  };
  player1: {
    playerUsername?: string;
    deck: Card[];
    hero: Hero;
  };
}

export const setupGame = (setupData: GameSetupData): GameState => {
  // Initialize player decks from setupData or use empty arrays
  const playerDeck = setupData?.player0.deck
    ? shuffleDeck([...setupData.player0.deck])
    : [];
  const opponentDeck = setupData?.player1.deck
    ? shuffleDeck([...setupData.player1.deck])
    : [];

  // Get hero data or use defaults
  const playerHero = setupData?.player0.hero;
  const opponentHero = setupData?.player1.hero;
  console.log("Setup Data:", setupData);
  const p0: Player = {
    id: "0",
    name: setupData?.player0.playerUsername || playerHero?.heroName || "Guest",
    heroPortrait: playerHero?.portrait || "assets/heros/Arthas.jpg",
    maxHealth: 30,
    health: 30,
    armor: 0,
    manaCrystals: 0,
    maxManaCrystals: 10,
    overloadPending: 0,
    overloadLocked: 0,
    mana: 1,
    baseAttack: 0,
    modifiers: [],
    attacksLeft: 1,
    hand: [],
    deck: playerDeck,
    burntCards: [],
    heroPowerUsedThisTurn: false,
    hero: playerHero,
    weapon: null,
  };

  const p1: Player = {
    id: "1",
    name:
      setupData?.player1.playerUsername || opponentHero?.heroName || "Guest",
    heroPortrait:
      opponentHero?.portrait || "assets/heros/Illidan_Stormrage.jpg",
    maxHealth: 30,
    health: 30,
    armor: 0,
    manaCrystals: 0,
    maxManaCrystals: 10,
    overloadPending: 0,
    overloadLocked: 0,
    mana: 1,
    baseAttack: 0,
    modifiers: [],
    attacksLeft: 1,
    hand: [],
    deck: opponentDeck,
    heroPowerUsedThisTurn: false,
    hero: opponentHero,
    burntCards: [],
    weapon: null,
  };

  console.log("Player 0:", p0.name);
  console.log("Player 1:", p1.name);

  const G: GameState = {
    players: {
      "0": p0,
      "1": p1,
    },

    board: {
      "0": [],
      "1": [],
    },
    gameEvents: [],
    eventHistory: [],
    activeBattlecryMinion: null,
    graveyard: [],
    discardedCards: [],
  };

  return G;
};

export const placeCard = (
  G: GameState,
  ctx: GameCtx,
  cardId: string,
  target?: TargetValue,
  boardIndex?: number, // Insert position on the board
) => {
  const player = G.players[ctx.currentPlayer];
  const card = player.hand.find((c) => c.id === cardId)!;

  // Single validation call
  const validation = validateMove(G, ctx, cardId, "hand", target);

  if (!validation.valid) {
    console.warn(`Invalid move: ${validation.error}`);
    return;
  }

  if (card.isPlaced) {
    console.warn("Minion Already Placed");
    return;
  }

  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  player.hand.splice(cardIndex, 1); // Remove the card from hand

  // Clear current move events (history is kept for debugging)
  G.gameEvents = [];

  // Track move metadata for animation detection
  G.lastMove = {
    cardId,
    location: "hand",
    target,
    timestamp: Date.now(),
  };

  player.mana -= !card.isPlaced ? getManaCost(card) : 0;

  // Generic event fired for every card played (minion, spell, or weapon)
  const sourceEventIndex = G.eventHistory.length;
  recordEvent(G, {
    type: "cardPlayed",
    cardId: card.id,
    playerId: ctx.currentPlayer,
    timestamp: Date.now(),
    card,
    turn: ctx.turn,
  });

  // Overload: charged only on a successful play from hand. The pending amount
  // is promoted into locked crystals at the start of this player's next turn.
  if (card.overload) {
    const amount = resolveDynamicValue(card.overload, {
      card,
      G,
      ctx,
      location: "hand",
      playerID: ctx.currentPlayer,
      target,
      type: card.isSpell ? "spell" : "minion",
    });
    player.overloadPending += amount;
  }

  // See if the card can be placed on the board
  if (card.isMinion && !card.isPlaced) {
    card.isPlaced = true;
    card.summoningSickness = true;

    recordEvent(G, {
      type: "minionPlaced",
      cardId: card.id,
      playerId: ctx.currentPlayer,
      timestamp: Date.now(),
      card, // Include full card data for animation
      turn: ctx.turn,
    });

    // Check if card needs targeted battlecry (damage or heal)
    const needsTargetedBattlecry =
      card.battlecryQuery &&
      card.onPlace.some((e) => {
        const test = isUserSelectValue(e);
        return test;
      });

    if (needsTargetedBattlecry && card.battlecryQuery) {
      // check if there is a valid target for battle cry, if there is then enter battlecry otherwise just place the minion
      const hasValidTargets = hasTargets(
        card.battlecryQuery,
        {
          G,
          ctx,
          location: "hand",
          playerID: ctx.currentPlayer,
          target,
          type: "minion",
        },
        card.id,
      );
      // console.log("TARGETS", hasTargts);
      if (hasValidTargets) {
        G.activeBattlecryMinion = {
          cardId: card.id,
          playerId: ctx.currentPlayer,
          sourceEventIndex,
        };
      }
    } else if (!needsTargetedBattlecry && card.onPlace.length > 0) {
      // Automatic (non-targeted) battlecry: not executed inline — the host
      // resolves it as its own step (machine: resolvingBattlecry state;
      // engine.applyMove: settle path), AFTER the minion is on the board,
      // matching the targeted resolveBattlecry path.
      G.pendingAutoBattlecry = {
        cardId: card.id,
        playerId: ctx.currentPlayer,
        target,
        sourceEventIndex,
      };
    }

    if (boardIndex !== undefined) {
      G.board[ctx.currentPlayer].splice(boardIndex, 0, card);
    } else {
      G.board[ctx.currentPlayer].push(card);
    }
  }

  if (card.isWeapon && !card.isPlaced) {
    equipWeapon(G, ctx, ctx.currentPlayer, card, sourceEventIndex, target);
  }

  if (card.isSpell) {
    recordEvent(G, {
      type: "spell",
      cardId: card.id,
      playerId: ctx.currentPlayer,
      timestamp: Date.now(),
      card,
      turn: ctx.turn,
    });

    executeEffects(card.effects, {
      card: card,
      G,
      ctx,
      location: "hand",
      playerID: ctx.currentPlayer,
      target,
      type: "spell",
      sourceEventIndex,
    });
    // ADD THIS: Push the resolved spell into the graveyard
    G.graveyard.push({
      card: JSON.parse(JSON.stringify(card)),
      originalOwner: ctx.currentPlayer,
      diedOnTurn: ctx.turn,
    });
  }

  // Deaths are no longer resolved inside the move: the host resolves them
  // (engine.applyMove drains waves synchronously; the gameMachine steps
  // through resolvingDeaths wave-by-wave). Stash the top-level event index
  // so death events recorded later still reference this move.
  G.pendingSourceEventIndex = sourceEventIndex;
};

export const minionAttack = (
  G: GameState,
  ctx: GameCtx,
  attackerId: string,
  target: TargetValue,
) => {
  const attacker = G.board[ctx.currentPlayer].find((c) => c.id === attackerId);

  if (!attacker) return;
  const validation = validateMove(G, ctx, attackerId, "board", target);

  if (!validation.valid) {
    console.warn(`Invalid move: ${validation.error}`);
    return;
  }

  // Track move metadata for animation detection
  G.lastMove = {
    cardId: attackerId,
    location: "board",
    target,
    timestamp: Date.now(),
  };

  G.gameEvents = [];

  const sourceEventIndex = G.eventHistory.length;
  recordEvent(G, {
    type: "attack",
    attackerId: attacker.id,
    targetId: target.id,
    targetType: target.type === "player" ? "player" : "card",
    targetPlayerId: target.player,
    attackerPlayerId: ctx.currentPlayer,
    sourceId: attackerId,
    timestamp: Date.now(),
    card: attacker,
  });

  const context: EffectContext = {
    card: attacker,
    G,
    ctx,
    location: "board",
    playerID: ctx.currentPlayer,
    target,
    type: "minion",
    sourceEventIndex,
  };

  executeEffects(attacker.effects, context);

  attacker.attacksLeft -= 1;

  // Attacking breaks Stealth: clears the base flag and strips the grant from
  // any modifier providing it ("Stealth until..." enchantments included).
  if (hasKeyword(attacker, "stealth")) {
    consumeKeyword(G, attacker, "card", ctx.currentPlayer, "stealth");
  }

  if (target.type === "card") {
    const defender = G.board[target.player].find((c) => c.id === target.id);

    if (!defender) return;

    executeEffects(defender.effects, {
      ...context,
      card: defender,
      target: { id: attacker.id, player: ctx.currentPlayer, type: "card" },
    });
  }

  // Deaths are no longer resolved inside the move: the host resolves them
  // (engine.applyMove drains waves synchronously; the gameMachine steps
  // through resolvingDeaths wave-by-wave). Stash the top-level event index
  // so death events recorded later still reference this move.
  G.pendingSourceEventIndex = sourceEventIndex;
  return G;
};

export const resolveBattlecry = (
  G: GameState,
  ctx: GameCtx,
  cardId: string,
  target: TargetValue,
) => {
  const card = G.board[ctx.currentPlayer].find((c) => c.id === cardId);

  if (!card || G.activeBattlecryMinion?.cardId !== cardId) {
    console.warn("Invalid battlecry resolution");
    return;
  }

  // Validate the move
  const validation = validateMove(G, ctx, cardId, "board", target);
  if (!validation.valid) {
    console.warn(`Invalid battlecry: ${validation.error}`);
    return;
  }

  // Clear events and track move
  G.gameEvents = [];
  G.lastMove = { cardId, location: "board", target, timestamp: Date.now() };

  const sourceEventIndex = G.activeBattlecryMinion.sourceEventIndex;

  // Execute battlecry effects
  executeEffects(card.onPlace, {
    card,
    G,
    ctx,
    location: "board",
    playerID: ctx.currentPlayer,
    target,
    type: "minion",
    sourceEventIndex,
  });

  // Record event for animations
  recordEvent(G, {
    type: "battlecry",
    cardId: card.id,
    playerId: ctx.currentPlayer,
    timestamp: Date.now(),
    targetId: target.id,
    targetType: target.type === "lane" ? "player" : target.type,
  });

  // Clear battlecry state
  G.activeBattlecryMinion = null;
  // Deaths are no longer resolved inside the move: the host resolves them
  // (engine.applyMove drains waves synchronously; the gameMachine steps
  // through resolvingDeaths wave-by-wave). Stash the top-level event index
  // so death events recorded later still reference this move.
  G.pendingSourceEventIndex = sourceEventIndex;
};

export const useHeroPower = (
  G: GameState,
  ctx: GameCtx,
  target?: TargetValue,
) => {
  const player = G.players[ctx.currentPlayer];
  const hero = player.hero;

  // Validation checks
  if (!hero || !hero.heroPower) {
    console.warn("No hero power available");
    return;
  }

  if (player.heroPowerUsedThisTurn) {
    console.warn("Hero power already used this turn");
    return;
  }

  if (player.mana < hero.heroPower.manaCost) {
    console.warn("Not enough mana for hero power");
    return;
  }

  const heroPower = hero.heroPower;

  // Check if hero power requires a target
  const requiresTarget = heroPower.effects.some((effect) => {
    if (isBaseEffectSelection(effect) && effect.target === "user-select") {
      return true;
    }
    return false;
  });

  // If requires target and no target provided, invalid
  if (requiresTarget && !target) {
    console.warn("Hero power requires a target");
    return;
  }

  // Validate target if provided
  if (target && requiresTarget) {
    const isValid = validateTargetQuery(
      heroPower.targetQuery,
      {
        G,
        ctx,
        playerID: ctx.currentPlayer,
        target,
        location: "hand",
        type: "heroPower",
      },
      `hero-power-${ctx.currentPlayer}`,
    );

    if (!isValid) {
      console.warn("Invalid target for hero power");
      return;
    }
  }

  // Clear events and track move
  G.gameEvents = [];
  G.lastMove = {
    cardId: `hero-power-${ctx.currentPlayer}`,
    location: "hand",
    target,
    timestamp: Date.now(),
  };

  // Deduct mana
  player.mana -= heroPower.manaCost;

  // Mark hero power as used
  player.heroPowerUsedThisTurn = true;

  // Record event for animations (recorded before effects run so any
  // resulting damage/draw/etc. events can reference this as their parent)
  const sourceEventIndex = G.eventHistory.length;
  recordEvent(G, {
    type: "heroPower",
    playerId: ctx.currentPlayer,
    timestamp: Date.now(),
    targetId: target?.id,
    targetType: target?.type === "lane" ? "player" : target?.type,
    heroPower: heroPower,
  });

  // Execute hero power effects
  executeEffects(heroPower.effects, {
    G,
    ctx,
    location: "hand",
    playerID: ctx.currentPlayer,
    target,
    type: "heroPower",
    heroPower: heroPower,
    sourceEventIndex,
  });

  // Record mana event
  recordEvent(G, {
    type: "mana",
    playerId: ctx.currentPlayer,
    timestamp: Date.now(),
  });

  // Process any deaths that may have resulted
  // Deaths are no longer resolved inside the move: the host resolves them
  // (engine.applyMove drains waves synchronously; the gameMachine steps
  // through resolvingDeaths wave-by-wave). Stash the top-level event index
  // so death events recorded later still reference this move.
  G.pendingSourceEventIndex = sourceEventIndex;
};

export const heroAttack = (G: GameState, ctx: GameCtx, target: TargetValue) => {
  const attackerId = ctx.currentPlayer as PlayerID;
  const attacker = G.players[attackerId];

  const validation = validateHeroAttack(G, ctx, target);
  if (!validation.valid) {
    console.warn(`Invalid hero attack: ${validation.error}`);
    return;
  }

  const attackValue = getPlayerAttack(attacker);
  const sourceId = `hero-${attackerId}`;

  G.lastMove = {
    cardId: sourceId,
    location: "board",
    target,
    timestamp: Date.now(),
  };

  G.gameEvents = [];

  // Recorded before damage resolves so any resulting damage/death/equip-break
  // events can reference this as their parent.
  const sourceEventIndex = G.eventHistory.length;
  recordEvent(G, {
    type: "attack",
    attackerId: sourceId,
    targetId: target.id,
    targetType: target.type === "player" ? "player" : "card",
    targetPlayerId: target.player,
    attackerPlayerId: attackerId,
    sourceId,
    timestamp: Date.now(),
    card: undefined,
  });

  if (target.type === "player") {
    dealDamageToPlayer(
      G,
      sourceId,
      target.player,
      attackValue,
      sourceEventIndex,
    );
  } else {
    const defenderCard = G.board[target.player].find((c) => c.id === target.id);
    if (!defenderCard) return;

    dealDamageToCard(
      G,
      sourceId,
      defenderCard,
      target.player,
      attackValue,
      sourceEventIndex,
    );

    // Minion strikes back at the attacking hero, same as minion-vs-minion combat,
    executeEffects(defenderCard.effects, {
      G,
      ctx,
      card: defenderCard,
      playerID: target.player,
      location: "board",
      target: { id: attackerId, player: attackerId, type: "player" },
      type: "minion",
      sourceEventIndex,
    });
  }

  attacker.attacksLeft -= 1;

  if (attacker.weapon) {
    // Weapon-triggered effects, e.g. Truesilver Champion healing the hero on each attack
    executeEffects(attacker.weapon.effects, {
      G,
      ctx,
      card: attacker.weapon,
      playerID: attackerId,
      location: "board",
      target,
      type: "minion",
      sourceEventIndex,
    });

    attacker.weapon.durabilityLost = (attacker.weapon.durabilityLost ?? 0) + 1;
    const remainingDurability =
      (attacker.weapon.baseDurability ?? 0) - attacker.weapon.durabilityLost;
    if (remainingDurability <= 0) {
      destroyWeapon(G, ctx, attackerId, attacker.weapon, sourceEventIndex);
    }
  }

  // Deaths are no longer resolved inside the move: the host resolves them
  // (engine.applyMove drains waves synchronously; the gameMachine steps
  // through resolvingDeaths wave-by-wave). Stash the top-level event index
  // so death events recorded later still reference this move.
  G.pendingSourceEventIndex = sourceEventIndex;
  return G;
};

const executeEffects = (effects: EffectTypes[], context: EffectContext) => {
  const { card, target, playerID, G, ctx, sourceEventIndex } = context;
  const cardId =
    context.type == "minion" || context.type == "spell"
      ? card!.id
      : `hero-power-${playerID}`;
  let isUserSelect = false;

  for (const effect of effects) {
    if (isUserSelectValue(effect)) {
      isUserSelect = true;
      break;
    }
  }

  effects.forEach((effect) => {
    switch (effect.type) {
      case "storeVar": {
        console.log(`RUNNING STORE VAR FOR ${card?.title} : 'TARGET"`, target);
        if (target && effect.target === "user-select") {
          const targetCard = G.board[target.player].find(
            (c) => c.id === target.id,
          );
          context.temp = resolveDynamicValue(effect.value, {
            ...context,
            card: targetCard!,
          });
        }
        break;
      }
      case "sequence":
        executeEffects(effect.steps, context);
        break;

      case "conditional":
        const targetCard: Card | undefined = target
          ? target.type === "card"
            ? G.board[target?.player].find((c) => c.id === target?.id)
            : target.type === "player"
              ? {
                  class: G.players[target.player].hero.class,
                  set: [],
                  effects: [],
                  divineShield: G.players[target.player].divineShield,
                  frozen: G.players[target.player].frozen,
                  title: G.players[target.player].name,
                  id: `player-${target.player}`,
                  originalID: `player-${target.player}`,
                  description: "",
                  onPlace: [],
                  damageTaken: 0,
                  isMinion: false,
                  attacksLeft: G.players[target.player].attacksLeft,
                  targetQuery: {
                    side: "all",
                    type: ["card"],
                  },
                }
              : undefined
          : undefined;
        if (
          card &&
          effect.conditions.every((condition) =>
            checkSingleTargetCondition(
              isUserSelect && targetCard ? targetCard : card,
              condition,
              context,
              card?.id,
            ),
          )
        ) {
          executeEffects(effect.then, context);
        } else if (effect.else) {
          executeEffects(effect.else, context);
        }
        break;
      case "damage": {
        let totalDamage = resolveDynamicValue(effect.value, context);
        // Spell Damage: boost every damage instance of a CAST spell by the
        // bonus its card carries (from source auras). Gated to spells only —
        // battlecries/attacks/deathrattles/weapons are "minion", hero powers
        // "heroPower", and healing is a separate case.
        if (context.type === "spell" && context.card) {
          totalDamage += getSpellDamage(context.card);
        }

        // --- BRANCH A: RANDOM SPLIT DAMAGE (e.g., Cinderstorm, Mad Bomber) ---
        if (effect.rand?.split) {
          console.log(
            `${card?.title}: Launching random split damage sequence for ${totalDamage} missiles.`,
          );

          // We execute a loop running exactly totalDamage times, firing 1-damage pings
          for (let i = 0; i < totalDamage; i++) {
            // Re-resolve valid targets dynamically every single loop iteration!
            // This ensures that if a minion's health drops to <= 0, it won't absorb any more missiles.
            const liveTargets = resolveTargets(effect, context).filter((t) => {
              if (t.type === "player") return true;
              if (t.cardRef) {
                // Double check direct live instance health
                const currentInst = G.board[t.ownerId].find(
                  (c) => c.id === t.id,
                );
                return currentInst && getCurrentHealth(currentInst) > 0;
              }
              return false;
            });

            // Break early if everything valid is completely obliterated
            if (liveTargets.length === 0) {
              console.log(
                "No valid live targets remaining. Ending missile barrage early.",
              );
              break;
            }

            // Grab exactly one random target from the currently alive target collection
            const randomTarget =
              liveTargets[Math.floor(Math.random() * liveTargets.length)];

            if (randomTarget.type === "player") {
              dealDamageToPlayer(
                G,
                cardId,
                randomTarget.ownerId,
                1,
                sourceEventIndex,
              );
            }

            if (randomTarget.type === "card") {
              const targetCard = G.board[randomTarget.ownerId].find(
                (c) => c.id === randomTarget.id,
              );
              if (targetCard) {
                dealDamageToCard(
                  G,
                  cardId,
                  targetCard,
                  randomTarget.ownerId,
                  1,
                  sourceEventIndex,
                );
              }
            }
          }
        }

        // --- BRANCH B: STANDARD / AoE DAMAGE (Your existing perfect pipeline) ---
        else {
          const targets = resolveTargets(effect, context);
          console.log(
            `${card?.title} targets: ${targets.map((t) => `${t.type} ${t.cardRef?.title ?? t.ownerId}`)}`,
          );

          targets.forEach((t) => {
            // --- TARGET TYPE: PLAYER / HERO ---
            if (t.type === "player") {
              dealDamageToPlayer(
                G,
                cardId,
                t.ownerId,
                totalDamage,
                sourceEventIndex,
              );
            }

            // --- TARGET TYPE: MINION / CARD ---
            if (t.type === "card") {
              const targetCard = G.board[t.ownerId].find((c) => c.id === t.id);

              if (targetCard && targetCard.isMinion) {
                if (effect.target === "user-select") {
                  const currentHealth = getCurrentHealth(targetCard);
                  if (
                    hasKeyword(targetCard, "divineShield") &&
                    totalDamage > 0
                  ) {
                    context.excessDamageDealt = 0;
                    context.lastTargetDied = false;
                  } else {
                    context.excessDamageDealt = Math.max(
                      0,
                      totalDamage - currentHealth,
                    );
                    context.lastTargetDied = currentHealth - totalDamage <= 0;
                  }
                }

                dealDamageToCard(
                  G,
                  cardId,
                  targetCard,
                  t.ownerId,
                  totalDamage,
                  sourceEventIndex,
                );
              }
            }
          });
        }

        break;
      }
      case "freeze":
      case "divineShield":
      case "taunt":
      case "stealth":
      case "charge":
      case "rush":
      case "windfury": {
        const targets = resolveTargets(effect, context);

        // Map effect types directly to your schema keys
        const keyMap: Record<string, any> = {
          freeze: "frozen",
          divineShield: "divineShield",
          taunt: "taunt",
          stealth: "stealth",
          charge: "charge",
          rush: "rush",
          windfury: "windfury",
        };
        const cardKey = keyMap[effect.type];

        targets.forEach((t) => {
          // --- TARGET: PLAYER / HERO ---
          if (t.type === "player") {
            // Freeze and Divine Shield make sense for a hero. Other stats like
            // Taunt/Stealth/Charge/Rush/Windfury are skipped for heroes (no weapons yet).
            if (effect.type === "freeze" || effect.type === "divineShield") {
              const targetPlayer = G.players[t.ownerId];
              if (targetPlayer) {
                applyBoolEffectToPlayer(
                  G,
                  cardId,
                  targetPlayer,
                  effect.type,
                  cardKey,
                );
              }
            }
          }

          // --- TARGET: MINION / CARD ---
          if (t.type === "card") {
            const targetCard = G.board[t.ownerId].find((c) => c.id === t.id);
            if (targetCard && targetCard.isMinion) {
              applyBoolEffectToCard(
                G,
                cardId,
                targetCard,
                t.ownerId,
                effect.type,
                cardKey,
              );
            }
          }
        });
        break;
      }
      case "heal": {
        const healValue = resolveDynamicValue(effect.value, context);
        const targets = resolveTargets(effect, context); // Handled perfectly by your unified routing

        console.log(
          `${card?.title} healing targets: ${targets.map((t) => `${t.type} ${t.cardRef?.title ?? t.ownerId}`)}`,
        );

        // Iterate over our pre-filtered and pre-selected collection
        targets.forEach((t) => {
          // --- TARGET TYPE: PLAYER / HERO ---
          if (t.type === "player") {
            healPlayer(G, cardId, t.ownerId, healValue, sourceEventIndex);
          }

          // --- TARGET TYPE: MINION / CARD ---
          if (t.type === "card") {
            const targetCard = G.board[t.ownerId].find((c) => c.id === t.id);

            if (targetCard) {
              healCard(
                G,
                cardId,
                targetCard,
                t.ownerId,
                healValue,
                sourceEventIndex,
              );
            }
          }
        });

        break;
      }
      case "mana":
        // increment current   player's mana
        G.players[playerID].mana += resolveDynamicValue(effect.value, context);
        recordEvent(G, {
          type: "mana",
          playerId: ctx.currentPlayer,
          timestamp: Date.now(),
        });
        break;

      case "changeKey":
        let cardToUpdate: typeof card | undefined;

        if (effect.target === "self") {
          cardToUpdate = card;
        } else if (effect.target === "user-select" && target?.type === "card") {
          cardToUpdate = G.board[target.player].find((c) => c.id === target.id);
        }
        if (cardToUpdate && cardToUpdate[effect.key] !== undefined) {
          // @ts-ignore
          cardToUpdate[effect.key] = effect.value;

          recordEvent(G, {
            type: "changeKey",
            playerId: ctx.currentPlayer,
            timestamp: Date.now(),
            cardId: cardToUpdate.id,
            key: effect.key,
            value: effect.value,
          });
        }
        break;
      case "applyModifier": {
        const modEffect = effect;
        // Resolve every stat's value once (provider as context.card)
        const mult = resolveDynamicValue(modEffect.mult ?? 1, context);
        const stats: Partial<Record<ModifierStatKey, number>> = {};
        (Object.keys(modEffect.stats ?? {}) as ModifierStatKey[]).forEach(
          (statKey) => {
            const raw = modEffect.stats?.[statKey];
            if (raw === undefined) return;
            stats[statKey] = resolveDynamicValue(raw, context) * mult;
          },
        );
        const changes = {
          name:
            modEffect.name ??
            card?.title ??
            context.heroPower?.name ??
            "Enchantment",
          description: modEffect.description,
          img: card?.imageUrl ?? context.heroPower?.imageUrl,
          stats,
          keys: modEffect.keys,
        };
        const targets = resolveTargets(effect, context); // Unified target array resolution

        console.log(
          `${card?.title} applying modifier targets: ${targets.map((t) => `${t.type} ${t.cardRef?.title ?? t.ownerId}`)}`,
        );

        // Iterate over our pre-filtered structural targets collection
        targets.forEach((t) => {
          // --- TARGET TYPE: PLAYER / HERO ---
          if (t.type === "player") {
            const targetPlayer = G.players[t.ownerId];
            if (targetPlayer) {
              processApplyModifierToPlayer(
                G,
                cardId,
                targetPlayer,
                playerID,
                modEffect,
                changes,
              );
            }
          }

          // --- TARGET TYPE: MINION / CARD ---
          if (t.type === "card") {
            // Weapons live on the player, not the board — fall back to the
            // resolved reference (e.g. Deadly Poison buffing your weapon).
            const targetCard =
              G.board[t.ownerId].find((c) => c.id === t.id) ?? t.cardRef;

            if (targetCard) {
              proccessApplyModifier(
                G,
                cardId,
                targetCard,
                playerID, // Note: passing playerID as caster/source scope
                modEffect,
                changes,
              );
            }
          }
        });

        break;
      }
      case "summon": {
        const enemyPlayerId = playerID === "0" ? "1" : "0";
        const playerTarget =
          effect.target === "self" ? playerID : enemyPlayerId;
        const value = resolveDynamicValue(effect.value, context);

        // Candidate template IDs: a specific card, a list to pick from, or all
        // summonable minions — optionally filtered by conditions.
        const candidates = resolveSummonCandidates(effect, context);
        if (candidates.length === 0) {
          console.warn("No valid summon candidates for effect", effect);
          break;
        }

        // check if the board can fit the summoned card
        for (let index = 0; index < value; index++) {
          if (G.board[playerTarget].length >= 7) {
            console.warn("Cannot summon more than 7 cards on the board");
            break; // Cannot summon more than 7 cards on the board
          }
          // Independent pick per summon (repeats allowed).
          const pickId =
            candidates.length === 1
              ? candidates[0]
              : candidates[Math.floor(Math.random() * candidates.length)];
          const summonedCard = createCardFromID(pickId as CardTemplateKey);
          if (summonedCard) {
            summonedCard.isPlaced = true; // Mark the summoned card as placed
            summonedCard.summoningSickness = true; // Summoned minions have summoning sickness
            recordEvent(G, {
              type: "summon",
              cardId: summonedCard.id,
              playerId: playerTarget,
              timestamp: Date.now(),
              card: summonedCard,
              eventRef: sourceEventIndex,
            });
            G.board[playerTarget].push(summonedCard);
          } else {
            console.warn(`Card with ID ${pickId} not found.`);
          }
        }

        break;
      }
      case "armor":
        const enemyPlayerId = playerID === "0" ? "1" : "0";
        const playerTarget =
          effect.target === "self" ? playerID : enemyPlayerId;
        // check if the board can fit the summoned card
        G.players[playerTarget].armor += resolveDynamicValue(
          effect.value,
          context,
        );

        break;
      case "equip": {
        const enemyPlayerId = playerID === "0" ? "1" : "0";
        const playerTarget =
          effect.target === "self" ? playerID : enemyPlayerId;
        const weaponCard = createCardFromID(effect.cardID as CardTemplateKey);
        if (weaponCard) {
          equipWeapon(G, ctx, playerTarget, weaponCard, sourceEventIndex);
        } else {
          console.warn(`Card with ID ${effect.cardID} not found.`);
        }
        break;
      }
      case "draw": {
        const drawPlayerId =
          effect.target === "enemy" ? (playerID === "0" ? "1" : "0") : playerID;
        for (let i = 0; i < resolveDynamicValue(effect.value, context); i++) {
          handleDrawCard(G, ctx, drawPlayerId, sourceEventIndex);
        }
        break;
      }
      case "destroy": {
        const targets = resolveTargets(effect, context);
        targets.forEach((t) => {
          if (t.type === "card") {
            const targetCard = G.board[t.ownerId].find((c) => c.id === t.id);
            if (targetCard) {
              targetCard.damageTaken = getMaxHealth(targetCard);
            }
          }
        });

        break;
      }
      case "addToHand": {
        const count = resolveDynamicValue(effect.value, context);

        // Find cards from the specified source
        const cardsToAdd = findCardsInPool(G, playerID, effect, context);

        // 1. Process the main cards up to the resolved count
        const cardsToProcess = cardsToAdd.slice(0, count);
        cardsToProcess.forEach((cardToAdd: Card) => {
          addCardToHand(
            G,
            playerID,
            cardToAdd,
            effect.modifiers,
            effect.source,
            sourceEventIndex,
          );
        });

        // 2. Calculate how many cards are still needed to reach 'count'
        const remainingNeeded = count - cardsToProcess.length;

        // 3. If we are short and a fallback exists, fill the gap
        if (remainingNeeded > 0 && effect.fallback) {
          for (let i = 0; i < remainingNeeded; i++) {
            const fallbackCard = createCardFromID(
              effect.fallback.cardID as CardTemplateKey,
            );
            if (fallbackCard) {
              addCardToHand(
                G,
                playerID,
                fallbackCard,
                effect.modifiers,
                "global",
                sourceEventIndex,
              );
            }
          }
        }

        break;
      }
      case "returnToHand": {
        // Build target pool based on effect.target
        let targetPool: Card[] = [];
        const enemyId = playerID === "0" ? "1" : "0";

        if (effect.target === "user-select" && target?.type === "card") {
          const card = G.board[target.player].find((c) => c.id === target.id);
          if (card) targetPool.push(card);
        } else if (effect.target === "friendly-board") {
          targetPool = [...G.board[playerID]];
        } else if (effect.target === "enemy-board") {
          targetPool = [...G.board[enemyId]];
        } else if (effect.target === "board") {
          targetPool = [...G.board[playerID], ...G.board[enemyId]];
        }

        // Filter by conditions
        if (effect.conditions && effect.conditions.length > 0) {
          targetPool = targetPool.filter((card) =>
            effect.conditions!.every((cond) =>
              checkSingleTargetCondition(card, cond, context),
            ),
          );
        }

        // Apply randomization
        if (effect.rand && effect.rand.n > 0) {
          const shuffled = [...targetPool].sort(() => Math.random() - 0.5);
          targetPool = shuffled.slice(
            0,
            Math.min(effect.rand.n, targetPool.length),
          );
        }

        // Return cards to hand
        targetPool.forEach((cardToReturn) => {
          const ownerID = G.board["0"].find((c) => c.id === cardToReturn.id)
            ? "0"
            : "1";
          returnCardToHand(
            G,
            cardToReturn,
            ownerID,
            effect.modifiers,
            sourceEventIndex,
          );
        });

        break;
      }
      case "bounce": {
        // Legacy bounce effect - use returnToHand instead
        if (target && target.type === "card") {
          const targetCard = G.board[target.player].find(
            (c) => c.id === target.id,
          );
          if (targetCard) {
            returnCardToHand(
              G,
              targetCard,
              target.player,
              effect.modifiers,
              sourceEventIndex,
            );
          }
        }
        break;
      }
      case "discard": {
        const targetPlayerId =
          effect.target === "enemy" ? (playerID === "0" ? "1" : "0") : playerID;

        const count = resolveDynamicValue(effect.value, context);

        discardCardsFromHand(
          cardId,
          G,
          targetPlayerId,
          count,
          effect.strategy,
          ctx.turn,
          sourceEventIndex,
        );

        break;
      }
    }
  });

  context.temp = undefined;
};

export const cancelBattlecry = (G: GameState, ctx: GameCtx) => {
  // place minion back on hand and give mana back
  if (G.activeBattlecryMinion) {
    const player = G.players[G.activeBattlecryMinion.playerId];
    const card = G.board[G.activeBattlecryMinion.playerId].find(
      (c) => c.id === G.activeBattlecryMinion?.cardId,
    )!;

    const cardIndex = G.board[G.activeBattlecryMinion.playerId].findIndex(
      (c) => c.id === G.activeBattlecryMinion?.cardId,
    );
    G.board[G.activeBattlecryMinion.playerId].splice(cardIndex, 1); // Remove the card from hand

    player.mana += getManaCost(card);

    card.isPlaced = false;
    player.hand.push(card);
  }
  G.activeBattlecryMinion = null;
  recordEvent(G, {
    type: "debug",
    timestamp: Date.now(),
    playerId: ctx.currentPlayer,
    details: "Cancel Battlecry",
  });
  return G;
};

export const drawCard = (G: GameState, ctx: GameCtx) => {
  handleDrawCard(G, ctx);
};

/**
 * Clears per-move state when a player ends their turn. Turn advancement itself
 * (onEnd effects → switch player → onBegin effects) is orchestrated by the
 * host: advanceTurn() in engine.ts, or boardgame.io's events.endTurn() in the
 * legacy wrapper below.
 */
export const endTurn = (G: GameState, _ctx: GameCtx) => {
  // Clear last move metadata at the end of the turn
  G.gameEvents = [];
  G.activeBattlecryMinion = null;
};

function handleDrawCard(
  G: GameState,
  ctx: Ctx,
  playerID?: PlayerID,
  sourceEventIndex?: number,
) {
  const player = G.players[playerID || ctx.currentPlayer];
  if (player.deck.length > 0) {
    const drawnCard = player.deck.pop();
    if (drawnCard) {
      player.hand.push(drawnCard);
      recordEvent(G, {
        type: "drawCard",
        cardId: drawnCard.id,
        playerId: playerID || ctx.currentPlayer,
        timestamp: Date.now(),
        eventRef: sourceEventIndex,
        snapshot: JSON.parse(JSON.stringify(drawnCard)),
      });
    }
  } else {
    // Handle case when deck is empty, e.g., damage player or reshuffle
    console.warn("Deck is empty, cannot draw a card.");
  }
}

function destroyWeapon(
  G: GameState,
  ctx: Ctx,
  playerId: PlayerID,
  weapon: Card,
  sourceEventIndex?: number,
) {
  if (weapon.deathrattle && weapon.deathrattle.length > 0) {
    executeEffects(weapon.deathrattle, {
      card: weapon,
      G,
      ctx,
      location: "board",
      playerID: playerId,
      type: "minion",
      sourceEventIndex,
    });
  }

  recordEvent(G, {
    type: "death",
    cardId: weapon.id,
    playerId,
    timestamp: Date.now(),
    card: weapon,
    eventRef: sourceEventIndex,
    snapshot: JSON.parse(JSON.stringify(weapon)),
  });

  G.graveyard.push({
    card: JSON.parse(JSON.stringify(weapon)),
    originalOwner: playerId,
    diedOnTurn: ctx.turn,
  });

  const player = G.players[playerId];
  if (player.weapon?.id === weapon.id) {
    player.weapon = null;
  }
}

function equipWeapon(
  G: GameState,
  ctx: Ctx,
  playerId: PlayerID,
  weaponCard: Card,
  sourceEventIndex?: number,
  target?: TargetValue,
) {
  const player = G.players[playerId];
  const oldWeapon = player.weapon;

  // Replacing an equipped weapon destroys it, triggering its deathrattle
  if (oldWeapon) {
    destroyWeapon(G, ctx, playerId, oldWeapon, sourceEventIndex);
  }

  player.weapon = weaponCard;
  player.attacksLeft !== 2 &&
    hasKeyword(weaponCard, "windfury") &&
    player.attacksLeft++;

  recordEvent(G, {
    type: "equip",
    cardId: weaponCard.id,
    playerId,
    timestamp: Date.now(),
    card: weaponCard,
    eventRef: sourceEventIndex,
    snapshot: JSON.parse(JSON.stringify(weaponCard)),
  });

  if (weaponCard.onPlace && weaponCard.onPlace.length > 0) {
    executeEffects(weaponCard.onPlace, {
      card: weaponCard,
      G,
      ctx,
      location: "board",
      playerID: playerId,
      target, // targeted weapon battlecries (e.g. Perdition's Blade)
      type: "minion",
      sourceEventIndex,
    });
  }
}

/** True while a placed minion's automatic battlecry hasn't resolved yet. */
export function hasPendingAutoBattlecry(G: GameState): boolean {
  return !!G.pendingAutoBattlecry;
}

/**
 * Resolves the pending automatic (non-targeted) battlecry set by placeCard.
 * Runs with the minion already ON the board — same as the targeted
 * resolveBattlecry path. Fizzles silently if the minion is gone. Appends to
 * G.gameEvents — never clears it.
 */
export function resolvePendingAutoBattlecry(G: GameState, ctx: Ctx) {
  const pending = G.pendingAutoBattlecry;
  G.pendingAutoBattlecry = null;
  if (!pending) return;

  const card = G.board[pending.playerId]?.find((c) => c.id === pending.cardId);
  if (!card) return; // minion vanished before its battlecry could resolve

  executeEffects(card.onPlace, {
    card,
    G,
    ctx,
    location: "hand",
    playerID: pending.playerId,
    target: pending.target,
    type: "minion",
    sourceEventIndex: pending.sourceEventIndex,
  });

  // Battlecries can summon/buff/damage — keep ongoing effects in sync on the
  // machine path (the engine settle path refreshes in applyMove).
  refreshOngoing(G, ctx);
}

/** True while any board minion is marked for death (health <= 0). */
export function hasPendingDeaths(G: GameState): boolean {
  return (["0", "1"] as const).some((playerId) =>
    G.board[playerId].some((card) => getCurrentHealth(card) <= 0),
  );
}

/**
 * Resolves ONE death wave: triggers deathrattles, records death events and
 * sweeps corpses — but does NOT recurse. If a deathrattle kills another
 * minion, that death stays pending for the next wave, so hosts can surface
 * each wave of a chain reaction as its own state update (the gameMachine's
 * `resolvingDeaths` state re-checks hasPendingDeaths between waves).
 *
 * The eventRef of recorded deaths comes from G.pendingSourceEventIndex, which
 * the triggering move sets; it's cleared once the board is clean.
 * Appends to G.gameEvents — never clears it.
 */
export function resolveDeathWave(G: GameState, ctx: Ctx) {
  const playerIds: ("0" | "1")[] = ["0", "1"];
  const sourceEventIndex = G.pendingSourceEventIndex;

  playerIds.forEach((playerId) => {
    // 1. Find all minions on this board marked for death
    const deadMinions = G.board[playerId].filter(
      (card) => getCurrentHealth(card) <= 0,
    );

    if (deadMinions.length > 0) {
      deadMinions.forEach((deadCard) => {
        // 2. TRIGGER DEATHRATTLES:
        if (deadCard.deathrattle && deadCard.deathrattle.length > 0) {
          executeEffects(deadCard.deathrattle, {
            card: deadCard,
            G,
            ctx,
            location: "board",
            playerID: playerId,
            type: "minion",
            sourceEventIndex,
          });
        }

        // 3. Record death event for frontend UI animations
        recordEvent(G, {
          type: "death",
          cardId: deadCard.id,
          playerId: playerId,
          timestamp: Date.now(),
          card: deadCard,
          eventRef: sourceEventIndex,
          snapshot: JSON.parse(JSON.stringify(deadCard)),
        });

        G.graveyard.push({
          card: JSON.parse(JSON.stringify(deadCard)),
          originalOwner: playerId,
          diedOnTurn: ctx.turn,
        });
      });

      // 4. Clean sweep: remove exactly THIS wave's dead minions. Minions
      // killed by the deathrattles above (e.g. a rattle that AoEs its own
      // fresh summons) stay on board for the NEXT wave so their own death
      // events, graveyard entries and deathrattles trigger properly.
      // (The old health>0 filter silently deleted them — pre-existing bug.)
      const sweptIds = new Set(deadMinions.map((card) => card.id));
      G.board[playerId] = G.board[playerId].filter(
        (card) => !sweptIds.has(card.id),
      );
    }
  });

  // A swept minion may have been an aura provider (or a damaged enrage
  // minion) — refresh before re-checking: minions that die from losing a
  // +health aura become the NEXT wave.
  refreshOngoing(G, ctx);

  // Chain fully resolved → the triggering move's event index is spent
  if (!hasPendingDeaths(G)) {
    G.pendingSourceEventIndex = undefined;
  }
}

/**
 * Drains ALL pending death waves synchronously. Used by the engine's
 * applyMove default path (MCTS simulations, tests, headless hosts); the
 * gameMachine instead steps wave-by-wave via resolveDeathWave.
 */
export function processDeaths(G: GameState, ctx: Ctx) {
  while (hasPendingDeaths(G)) {
    resolveDeathWave(G, ctx);
  }
}

// ---------------------------------------------------------------------------
// ONGOING MECHANICS (auras / in-hand effects / enrage)
//
// Three separate mechanics, each with its own Card template field and its own
// managed CardModifier.type. Every pass is DIFF-BASED: it computes the desired
// modifier set and syncs it via syncManagedModifiers, which records an
// applyModifier event only when something actually changed (value 0 on loss).
// refreshOngoing runs after every state change (applyMove, death waves, auto
// battlecries, turn boundaries), so the passes must be idempotent and silent
// when nothing moved.
// ---------------------------------------------------------------------------

/**
 * True when a board minion is currently radiating an ongoing effect — used by
 * the UI for the "pool of light" indicator. Aura providers glow whenever
 * placed;. `hideAuraGlow` opts a card out
 * (Old Murk-Eye / Prophet Velen style exceptions).
 */
export function providesActiveAura(card: Card): boolean {
  if (card.hideAuraGlow || !card.isPlaced) return false;
  if (card.aura?.length) return true;
  return false;
}

interface ManagedOwnerRef {
  owner: Card | Player;
  ownerType: "card" | "player";
  ownerPlayerId: PlayerID;
}

/** Every object that can carry managed modifiers: board, hands, heroes. */
function listManagedOwners(G: GameState): ManagedOwnerRef[] {
  const owners: ManagedOwnerRef[] = [];
  (["0", "1"] as const).forEach((pId) => {
    G.board[pId].forEach((card) =>
      owners.push({ owner: card, ownerType: "card", ownerPlayerId: pId }),
    );
    G.players[pId].hand.forEach((card) =>
      owners.push({ owner: card, ownerType: "card", ownerPlayerId: pId }),
    );
    owners.push({
      owner: G.players[pId],
      ownerType: "player",
      ownerPlayerId: pId,
    });
  });
  return owners;
}

/**
 * The owner's stat with all managed modifiers of `managedType` removed — the
 * clamp baseline for min/max ("but not less than 1"), so the previous
 * refresh's own entries don't skew this refresh's math. (Excluding whole
 * modifiers of the managed type is exact: the fold only reads this stat.)
 */
function getStatExcludingManaged(
  owner: Card | Player,
  ownerType: "card" | "player",
  stat: ModifierStatKey,
  managedType: CardModifier["type"],
): number {
  const saved = owner.modifiers;
  owner.modifiers = saved?.filter((m) => m.type !== managedType);
  let value = 0;
  if (ownerType === "player") {
    if (stat === "attack") value = getPlayerAttack(owner as Player);
  } else {
    const card = owner as Card;
    if (stat === "attack") value = getAttack(card);
    else if (stat === "health") value = getMaxHealth(card);
    else if (stat === "mana") value = getManaCost(card);
  }
  owner.modifiers = saved;
  return value;
}

/**
 * Clamps an additive delta so `base + delta` respects min/max — without ever
 * moving a stat that's already past the bound (a 0-cost card under a
 * "spells cost 1 less, but not less than 1" aura stays at 0).
 */
function clampDelta(
  base: number,
  delta: number,
  min?: number,
  max?: number,
): number {
  let result = base + delta;
  if (min !== undefined && result < min) result = Math.min(base, min);
  if (max !== undefined && result > max) result = Math.max(base, max);
  return result - base;
}

/**
 * Resolves one provider's ongoing defs into desired managed-modifier specs,
 * accumulating them per target owner. Targets come from the standard
 * resolveTargets (so `adjacent`, `friendly-hand`, conditions etc. all work);
 * values resolve with the provider as context.card.
 */
function collectDesiredModifiers(
  G: GameState,
  ctx: Ctx,
  provider: Card,
  providerOwner: PlayerID,
  location: "board" | "hand",
  defs: EffectTypes[],
  managedType: "aura" | "inHand" | "enrage",
  desired: Map<Card | Player, ManagedModifierSpec[]>,
) {
  const context: EffectContext = {
    G,
    ctx,
    card: provider,
    playerID: providerOwner,
    location,
    type: "minion",
  };

  defs.forEach((effect) => {
    if (effect.type !== "applyModifier") return;
    const mult = resolveDynamicValue(effect.mult ?? 1, context);
    const override = effect.override ?? false;

    resolveTargets(effect, context).forEach((t) => {
      const owner = t.type === "player" ? G.players[t.ownerId] : t.cardRef;
      if (!owner) return;

      let specs = desired.get(owner);
      if (!specs) {
        specs = [];
        desired.set(owner, specs);
      }

      // Resolve each stat, clamping additive deltas against the stat as it
      // stands WITHOUT this pass's previous entries, plus what this pass has
      // already granted the owner — so stacked providers (two Sorcerer's
      // Apprentices) respect the floor.
      const stats: Partial<Record<ModifierStatKey, number>> = {};
      (Object.keys(effect.stats ?? {}) as ModifierStatKey[]).forEach(
        (statKey) => {
          const raw = effect.stats?.[statKey];
          if (raw === undefined) return;
          let value = resolveDynamicValue(raw, context) * mult;
          if (override) {
            if (effect.min !== undefined) value = Math.max(effect.min, value);
            if (effect.max !== undefined) value = Math.min(effect.max, value);
          } else {
            const base =
              getStatExcludingManaged(owner, t.type, statKey, managedType) +
              specs
                .filter((s) => !s.override)
                .reduce((sum, s) => sum + (s.stats?.[statKey] ?? 0), 0);
            value = clampDelta(base, value, effect.min, effect.max);
            if (value === 0) return; // fully clamped — no entry for this stat
          }
          stats[statKey] = value;
        },
      );

      const hasStats = Object.keys(stats).length > 0;
      const keys =
        effect.keys && Object.keys(effect.keys).length
          ? effect.keys
          : undefined;
      if (!hasStats && !keys) return; // nothing survived — no modifier

      specs.push({
        sourceCardId: provider.id,
        name: effect.name ?? provider.title,
        description: effect.description,
        img: provider.imageUrl,
        stats: hasStats ? stats : undefined,
        keys,
        override,
      });
    });
  });
}

/**
 * AURAS: continuous effects granted only while the provider minion is on the
 * board (Stormwind Champion, Dire Wolf Alpha, Sorcerer's Apprentice, ...).
 * IN-HAND: effects active while the card itself sits in a hand (dynamic
 * costs, hand adjacency). ENRAGE: self buffs active only while the minion is
 * damaged — healing to full removes them automatically on the next refresh.
 */
export function refreshOngoing(G: GameState, ctx: Ctx) {
  const owners = listManagedOwners(G);
  const playerIds: ("0" | "1")[] = ["0", "1"];

  // --- AURAS (providers: board minions with `aura` defs) ---
  const auraDesired = new Map<Card | Player, ManagedModifierSpec[]>();
  playerIds.forEach((pId) => {
    G.board[pId].forEach((provider) => {
      if (provider.aura?.length) {
        collectDesiredModifiers(
          G,
          ctx,
          provider,
          pId,
          "board",
          provider.aura,
          "aura",
          auraDesired,
        );
      }
    });
  });
  owners.forEach(({ owner, ownerType, ownerPlayerId }) =>
    syncManagedModifiers(
      G,
      owner,
      ownerType,
      ownerPlayerId,
      "aura",
      auraDesired.get(owner) ?? [],
    ),
  );

  // --- IN-HAND EFFECTS (providers: hand cards with `inHand` defs) ---
  const inHandDesired = new Map<Card | Player, ManagedModifierSpec[]>();
  playerIds.forEach((pId) => {
    G.players[pId].hand.forEach((provider) => {
      if (provider.inHand?.length) {
        collectDesiredModifiers(
          G,
          ctx,
          provider,
          pId,
          "hand",
          provider.inHand,
          "inHand",
          inHandDesired,
        );
      }
    });
  });
  owners.forEach(({ owner, ownerType, ownerPlayerId }) =>
    syncManagedModifiers(
      G,
      owner,
      ownerType,
      ownerPlayerId,
      "inHand",
      inHandDesired.get(owner) ?? [],
    ),
  );

  // --- ENRAGE (providers: DAMAGED board minions with `enrage` defs) ---
  const enrageDesired = new Map<Card | Player, ManagedModifierSpec[]>();
  playerIds.forEach((pId) => {
    G.board[pId].forEach((provider) => {
      if (
        provider.enrage?.length &&
        getCurrentHealth(provider) < getMaxHealth(provider)
      ) {
        collectDesiredModifiers(
          G,
          ctx,
          provider,
          pId,
          "board",
          provider.enrage,
          "enrage",
          enrageDesired,
        );
      }
    });
  });
  owners.forEach(({ owner, ownerType, ownerPlayerId }) =>
    syncManagedModifiers(
      G,
      owner,
      ownerType,
      ownerPlayerId,
      "enrage",
      enrageDesired.get(owner) ?? [],
    ),
  );
}

function processModifierLifecycle(
  G: GameState,
  activePlayerId: string,
  triggerType: "START_OF_TURN" | "END_OF_TURN",
) {
  const allPlayers: ("0" | "1")[] = ["0", "1"];

  allPlayers.forEach((pId) => {
    G.board[pId].forEach((card) => {
      // Filter the card's modifiers, keeping only the ones that haven't expired
      card.modifiers = card.modifiers?.filter((mod) => {
        // Permanent modifications or auras are handled elsewhere and shouldn't be processed here
        if (mod.type !== "temporary" || !mod.lifecycle) return true;

        const lifecycle = mod.lifecycle;

        // 1. Check if the current game loop state matches the expiry trigger phase
        if (lifecycle.expiryTrigger !== triggerType) return true;

        // 2. Identify whose turn boundary we are currently executing
        let isOwnerMatch = false;
        if (lifecycle.expiryOwner === "ANY_PLAYER") isOwnerMatch = true;
        if (
          lifecycle.expiryOwner === "BUFF_CASTER" &&
          lifecycle.sourcePlayerId === activePlayerId
        )
          isOwnerMatch = true;
        if (lifecycle.expiryOwner === "BUFF_RECEIVER" && pId === activePlayerId)
          isOwnerMatch = true;

        // If it's not the right player's turn phase, keep the modifier active
        if (!isOwnerMatch) return true;

        // 3. Handle multi-turn countdown decrements
        if (lifecycle.turnsRemaining !== undefined) {
          lifecycle.turnsRemaining -= 1;
          // If turns are still remaining, keep it alive
          if (lifecycle.turnsRemaining > 0) return true;
        }

        // Return false to cleanly strip out the expired modifier from the array!
        return false;
      });
    });

    // Process player modifiers (for hero powers like Druid's Shapeshift)
    G.players[pId].modifiers = G.players[pId].modifiers?.filter((mod) => {
      // Permanent modifications or auras are handled elsewhere and shouldn't be processed here
      if (mod.type !== "temporary" || !mod.lifecycle) return true;

      const lifecycle = mod.lifecycle;

      // 1. Check if the current game loop state matches the expiry trigger phase
      if (lifecycle.expiryTrigger !== triggerType) return true;

      // 2. Identify whose turn boundary we are currently executing
      let isOwnerMatch = false;
      if (lifecycle.expiryOwner === "ANY_PLAYER") isOwnerMatch = true;
      if (
        lifecycle.expiryOwner === "BUFF_CASTER" &&
        lifecycle.sourcePlayerId === activePlayerId
      )
        isOwnerMatch = true;
      if (lifecycle.expiryOwner === "BUFF_RECEIVER" && pId === activePlayerId)
        isOwnerMatch = true;

      // If it's not the right player's turn phase, keep the modifier active
      if (!isOwnerMatch) return true;

      // 3. Handle multi-turn countdown decrements
      if (lifecycle.turnsRemaining !== undefined) {
        lifecycle.turnsRemaining -= 1;
        // If turns are still remaining, keep it alive
        if (lifecycle.turnsRemaining > 0) return true;
      }

      // Return false to cleanly strip out the expired modifier from the array!
      return false;
    });
  });
}

/**
 * Deals the mulligan hands after the coin toss: the first player draws 3,
 * the second draws 4 and receives The Coin (not replaceable).
 */
export function mulliganDraw(G: GameState, ctx: GameCtx) {
  const firstPlayer = G.mulligan?.firstPlayer ?? ctx.currentPlayer;
  const secondPlayer = firstPlayer === "0" ? "1" : "0";

  for (let i = 0; i < 3; i++) {
    handleDrawCard(G, ctx, firstPlayer);
    handleDrawCard(G, ctx, secondPlayer);
  }
  handleDrawCard(G, ctx, secondPlayer);

  const coin = createCardFromID("the-coin");
  if (coin) {
    G.players[secondPlayer].hand.push(coin);
  }
}

/**
 * Locks in a player's starting hand. Chosen cards are set aside, replacements
 * are drawn FIRST (you can't redraw what you threw back), then the set-aside
 * cards are shuffled into the deck. When both seats have confirmed, the
 * mulligan ends and the first player's turn begins (any resulting deaths stay
 * pending for the host to resolve).
 *
 * Returns false (no-op) for invalid confirmations: mulligan over, seat already
 * confirmed, unknown card ids, or trying to replace The Coin.
 */
export function confirmMulligan(
  G: GameState,
  ctx: GameCtx,
  playerID: PlayerID,
  replaceCardIds: string[],
): boolean {
  const mulligan = G.mulligan;
  if (!mulligan?.active || mulligan.confirmed[playerID]) return false;

  const player = G.players[playerID];
  if (!player) return false;

  const toReplace: Card[] = [];
  for (const cardId of replaceCardIds) {
    const card = player.hand.find((c) => c.id === cardId);
    if (!card || card.originalID === "the-coin") {
      console.warn(`Invalid mulligan replacement: ${cardId}`);
      return false;
    }
    toReplace.push(card);
  }

  // This is a top-level player action — same event convention as moves.
  G.gameEvents = [];

  // 1. Set the chosen cards aside
  player.hand = player.hand.filter((c) => !replaceCardIds.includes(c.id));

  // 2. Draw replacements before the set-aside cards return to the deck
  for (let i = 0; i < toReplace.length; i++) {
    handleDrawCard(G, ctx, playerID);
  }

  // 3. Shuffle the set-aside cards back in
  if (toReplace.length > 0) {
    player.deck.push(...toReplace);
    player.deck = shuffleDeck(player.deck);
  }

  mulligan.confirmed[playerID] = true;
  recordEvent(G, {
    type: "mulligan",
    playerId: playerID,
    replacedCount: toReplace.length,
    timestamp: Date.now(),
  });

  // Both seats locked in → the game proper starts
  if (mulligan.confirmed["0"] && mulligan.confirmed["1"]) {
    mulligan.active = false;
    beginTurn(G, ctx);
  }

  return true;
}

/**
 * Start-of-turn effects for ctx.currentPlayer: expiring buffs, mana crystal
 * gain, card draw, attack/summoning-sickness resets, auras and cascade deaths.
 */
export function beginTurn(G: GameState, ctx: GameCtx) {
  // 1. Process anything that expires at the START of a turn
  processModifierLifecycle(G, ctx.currentPlayer, "START_OF_TURN");

  const p = G.players[ctx.currentPlayer];
  p.manaCrystals = Math.min(p.manaCrystals + 1, p.maxManaCrystals);

  // Overload: promote last turn's pending overload into this turn's active
  // lock. Locked crystals stay owned (manaCrystals untouched) but are removed
  // from the spendable pool for this one turn.
  p.overloadLocked = p.overloadPending ?? 0;
  p.overloadPending = 0;
  p.mana = Math.max(0, p.manaCrystals - p.overloadLocked);

  // Reset hero power usage
  p.heroPowerUsedThisTurn = false;

  // Draw at the start of every turn — including each player's first
  // (Hearthstone standard; mulligan hands are 3/4+Coin) — unless full.
  {
    if (p.hand.length < 10) {
      handleDrawCard(G, ctx);
    }
  }

  // reset
  G.board[ctx.currentPlayer].forEach((card) => {
    card.attacksLeft = hasKeyword(card, "windfury") ? 2 : 1;
    card.summoningSickness = false; // Remove summoning sickness
  });

  p.attacksLeft = p.weapon && hasKeyword(p.weapon, "windfury") ? 2 : 1;

  // 2. Always refresh ongoing effects (auras/in-hand/enrage) and evaluate
  // cascading health drop deaths[cite: 1]
  refreshOngoing(G, ctx);
  // Deaths caused by expiring buffs stay pending; the host resolves them
  // (machine waves / engine drain) right after the turn transition.

  recordEvent(G, {
    type: "beginTurn",
    playerId: ctx.currentPlayer,
    timestamp: Date.now(),
  });
}

/**
 * End-of-turn effects for ctx.currentPlayer: expiring buffs, unfreezing,
 * auras and cascade deaths.
 */
export function endTurnCleanup(G: GameState, ctx: GameCtx) {
  // Clear last move metadata at the end of the turn
  G.gameEvents = [];
  G.activeBattlecryMinion = null;

  // 1. Process anything that expires at the END of a turn (like Abusive Sergeant)
  processModifierLifecycle(G, ctx.currentPlayer, "END_OF_TURN");

  G.board[ctx.currentPlayer].forEach((card) => {
    if (
      hasKeyword(card, "frozen") &&
      shouldMinionUnfreezeAtTurnEnd(G, ctx.currentPlayer, card)
    ) {
      consumeKeyword(G, card, "card", ctx.currentPlayer, "frozen");
    }
  });

  const endingPlayer = G.players[ctx.currentPlayer];
  if (
    hasKeyword(endingPlayer, "frozen") &&
    shouldHeroUnfreezeAtTurnEnd(endingPlayer)
  ) {
    consumeKeyword(G, endingPlayer, "player", ctx.currentPlayer, "frozen");
  }

  // 2. Refresh ongoing effects/deaths again in case losing an attack/health
  // buff altered the board state[cite: 1]
  refreshOngoing(G, ctx);
  // Deaths caused by expiring buffs stay pending; the host resolves them
  // (machine waves / engine drain) right after the turn transition.

  recordEvent(G, {
    type: "endTurn",
    playerId: ctx.currentPlayer,
    timestamp: Date.now(),
  });
}

// Export everything from data
export * from "./data/cards.js";
export * from "./data/heros.js";
export * from "./data/decks.js";

// Export everything from utils
export * from "./utils/index.js";
export * from "./utils/validateMove.js";

// Export individual files in the game root
export * from "./ai.js";
export * from "./utils/index.js"; // Note: Ensure this file name doesn't conflict with the 'utils' folder export!
export * from "./utils/validateMove.js"; // Note: Ensure this file name doesn't conflict with the 'utils' folder export!
export * from "./types.d.js";
