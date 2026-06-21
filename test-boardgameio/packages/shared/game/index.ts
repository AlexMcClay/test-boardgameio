import type {
  Card,
  GameState,
  Player,
  TargetValue,
  Hero,
  EffectTypes,
  EffectContext,
} from "./types";
import {
  createCardFromID,
  getCurrentHealth,
  getManaCost,
  getMaxHealth,
  shuffleDeck,
  applyBoolEffectToCard,
  proccessApplyModifier,
  dealDamageToCard,
  dealDamageToPlayer,
  healCard,
  healPlayer,
  recordEvent,
  isBaseEffectSelection,
  addCardToHand,
  findCardsInPool,
  returnCardToHand,
} from "./utils";
import type { Ctx, Game, Move, PlayerID } from "boardgame.io";
import { validateMove } from "./utils/validateMove";
import type { CardTemplateKey } from "./data/cards";
import { enumerateAIMoves } from "./ai";
import {
  checkSingleTargetCondition,
  resolveDynamicValue,
  resolveTargets,
} from "./utils/effectEngine.js";

export const isVictory = ({ G }: { G: GameState; ctx: Ctx }) => {
  if (G.players[0].health <= 0) {
    return { winner: "1" };
  } else if (G.players[1].health <= 0) {
    return { winner: "0" };
  }
};

const setupData = (
  { ctx }: { ctx: Ctx },
  setupData?: {
    player0: {
      deck: Card[];
      hero: Hero;
    };
    player1: {
      deck: Card[];
      hero: Hero;
    };
  },
): GameState => {
  // Initialize player decks from setupData or use empty arrays
  console.debug(ctx);
  const playerDeck = setupData?.player0.deck
    ? shuffleDeck([...setupData.player0.deck])
    : [];
  const opponentDeck = setupData?.player1.deck
    ? shuffleDeck([...setupData.player1.deck])
    : [];

  // Get hero data or use defaults
  const playerHero = setupData?.player0.hero;
  const opponentHero = setupData?.player1.hero;

  const p0: Player = {
    id: "0",
    name: playerHero?.heroName || "Arthas",
    heroPortrait: playerHero?.portrait || "assets/heros/Arthas.jpg",
    maxHealth: 30,
    health: 30,
    armor: 0,
    manaCrystals: 0,
    mana: 1,
    hand: [],
    deck: playerDeck,
    burntCards: [],
  };

  const p1: Player = {
    id: "1",
    name: opponentHero?.heroName || "Illidan",
    heroPortrait:
      opponentHero?.portrait || "assets/heros/Illidan_Stormrage.jpg",
    maxHealth: 30,
    health: 30,
    armor: 0,
    manaCrystals: 0,
    mana: 1,
    hand: [],
    deck: opponentDeck,
    burntCards: [],
  };

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
  };

  return G;
};

const placeCard: Move<GameState> = (
  { G, ctx },
  cardId: string,
  location: "hand" | "board" = "hand",
  target?: TargetValue,
  boardIndex?: number, // Insert position on the board
) => {
  const player = G.players[ctx.currentPlayer];
  const card =
    location === "hand"
      ? player.hand.find((c) => c.id === cardId)!
      : G.board[ctx.currentPlayer].find((c) => c.id === cardId)!;

  // Single validation call
  const validation = validateMove(G, ctx, cardId, location, target);

  if (!validation.valid) {
    console.warn(`Invalid move: ${validation.error}`);
    return;
  }

  if (card.isPlaced) {
    console.warn("Minion Already Placed");
    return;
  }

  // Clear current move events (history is kept for debugging)
  G.gameEvents = [];

  // Track move metadata for animation detection
  G.lastMove = {
    cardId,
    location,
    target,
    timestamp: Date.now(),
  };

  player.mana -= !card.isPlaced ? getManaCost(card) : 0;

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
        const test = isSelectValue(e);
        return test;
      });
    if (needsTargetedBattlecry) {
      G.activeBattlecryMinion = {
        cardId: card.id,
        playerId: ctx.currentPlayer,
      };
    } else {
      // Execute onPlace immediately for non-targeted battlecries
      executeEffects(card.onPlace, {
        card: card,
        G,
        ctx,
        location,
        playerID: ctx.currentPlayer,
        target,
      });
    }

    if (boardIndex !== undefined) {
      G.board[ctx.currentPlayer].splice(boardIndex, 0, card);
    } else {
      G.board[ctx.currentPlayer].push(card);
    }
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
      location,
      playerID: ctx.currentPlayer,
      target,
    });
    // ADD THIS: Push the resolved spell into the graveyard
    G.graveyard.push({
      card: JSON.parse(JSON.stringify(card)),
      originalOwner: ctx.currentPlayer,
      diedOnTurn: ctx.turn,
    });
  }

  if (location === "hand") {
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    player.hand.splice(cardIndex, 1); // Remove the card from hand
  }

  processDeaths(G, ctx);
};

const minionAttack: Move<GameState> = (
  { G, ctx },
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

  const context: EffectContext = {
    card: attacker,
    G,
    ctx,
    location: "board",
    playerID: ctx.currentPlayer,
    target,
  };

  G.gameEvents = [];

  executeEffects(attacker.effects, context);

  recordEvent(G, {
    type: "attack",
    attackerId: attacker.id,
    targetId: target.id,
    targetType: target.type === "player" ? "player" : "card",
    targetPlayerId: target.player,
    attackerPlayerId: ctx.currentPlayer,
    sourceId: attackerId,
    timestamp: Date.now(),
  });

  attacker.attacksLeft -= 1;

  if (target.type === "card") {
    const defender = G.board[target.player].find((c) => c.id === target.id);

    if (!defender) return;

    executeEffects(defender.effects, {
      ...context,
      card: defender,
      target: { id: attacker.id, player: ctx.currentPlayer, type: "card" },
    });
  }

  processDeaths(G, ctx);
  return G;
};

const resolveBattlecry: Move<GameState> = (
  { G, ctx },
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

  // Execute battlecry effects
  executeEffects(card.onPlace, {
    card,
    G,
    ctx,
    location: "board",
    playerID: ctx.currentPlayer,
    target,
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
  processDeaths(G, ctx);
};

function isSelectValue(e: EffectTypes): boolean {
  if (isBaseEffectSelection(e) && e.target === "user-select") {
    return true;
  } else if (e.type === "conditional") {
    return !!(
      e.then.some((ex) => isSelectValue(ex)) ||
      e.else?.some((ex) => isSelectValue(ex))
    );
  } else if (e.type === "sequence") {
    return !!e.steps.some((ex) => isSelectValue(ex));
  }
  return false;
}

const executeEffects = (effects: EffectTypes[], context: EffectContext) => {
  const { card, target, location, playerID, G, ctx } = context;
  const cardId = card.id;
  let isUserSelect = false;

  for (const effect of effects) {
    if (isSelectValue(effect)) {
      isUserSelect = true;
      break;
    }
  }

  effects.forEach((effect) => {
    switch (effect.type) {
      case "storeVar": {
        console.log(`RUNNING STORE VAR FOR ${card.title} : 'TARGET"`, target);
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
        const targetCard = target
          ? G.board[target?.player].find((c) => c.id === target?.id)
          : undefined;
        if (
          effect.conditions.every((condition) =>
            checkSingleTargetCondition(
              isUserSelect && targetCard ? targetCard : card,
              condition,
              context,
              card.id,
            ),
          )
        ) {
          executeEffects(effect.then, context);
        } else if (effect.else) {
          executeEffects(effect.else, context);
        }
        break;
      case "damage": {
        const totalDamage = resolveDynamicValue(effect.value, context);

        // --- BRANCH A: RANDOM SPLIT DAMAGE (e.g., Cinderstorm, Mad Bomber) ---
        if (effect.rand?.split) {
          console.log(
            `${card.title}: Launching random split damage sequence for ${totalDamage} missiles.`,
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
              dealDamageToPlayer(G, cardId, randomTarget.ownerId, 1);
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
                );
              }
            }
          }
        }

        // --- BRANCH B: STANDARD / AoE DAMAGE (Your existing perfect pipeline) ---
        else {
          const targets = resolveTargets(effect, context);
          console.log(
            `${card.title} targets: ${targets.map((t) => `${t.type} ${t.cardRef?.title ?? t.ownerId}`)}`,
          );

          targets.forEach((t) => {
            // --- TARGET TYPE: PLAYER / HERO ---
            if (t.type === "player") {
              dealDamageToPlayer(G, cardId, t.ownerId, totalDamage);
            }

            // --- TARGET TYPE: MINION / CARD ---
            if (t.type === "card") {
              const targetCard = G.board[t.ownerId].find((c) => c.id === t.id);

              if (targetCard && targetCard.isMinion) {
                if (effect.target === "user-select") {
                  const currentHealth = getCurrentHealth(targetCard);
                  if (targetCard.divineShield && totalDamage > 0) {
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

                dealDamageToCard(G, cardId, targetCard, t.ownerId, totalDamage);
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
        };
        const cardKey = keyMap[effect.type];

        targets.forEach((t) => {
          // --- TARGET: PLAYER / HERO ---
          if (t.type === "player") {
            // Freezing a hero makes complete sense! Other stats like Taunt/Stealth are skipped for heroes
            if (effect.type === "freeze") {
              // applyBoolEffectToPlayer(G, cardId, t.ownerId, "frozen", true);
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
          `${card.title} healing targets: ${targets.map((t) => `${t.type} ${t.cardRef?.title ?? t.ownerId}`)}`,
        );

        // Iterate over our pre-filtered and pre-selected collection
        targets.forEach((t) => {
          // --- TARGET TYPE: PLAYER / HERO ---
          if (t.type === "player") {
            healPlayer(G, cardId, t.ownerId, healValue);
          }

          // --- TARGET TYPE: MINION / CARD ---
          if (t.type === "card") {
            const targetCard = G.board[t.ownerId].find((c) => c.id === t.id);

            if (targetCard) {
              healCard(G, cardId, targetCard, t.ownerId, healValue);
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
        const value = resolveDynamicValue(effect.value, context);
        const targets = resolveTargets(effect, context); // Unified target array resolution

        console.log(
          `${card.title} applying modifier targets: ${targets.map((t) => `${t.type} ${t.cardRef?.title ?? t.ownerId}`)}`,
        );

        // Iterate over our pre-filtered structural targets collection
        targets.forEach((t) => {
          // --- TARGET TYPE: PLAYER / HERO ---
          if (t.type === "player") {
            // Handle hero modifiers here if your game system supports player attack/armor dynamic buffs
            // e.g., processHeroModifier(G, cardId, t.ownerId, modEffect, value);
          }

          // --- TARGET TYPE: MINION / CARD ---
          if (t.type === "card") {
            const targetCard = G.board[t.ownerId].find((c) => c.id === t.id);

            if (targetCard) {
              proccessApplyModifier(
                G,
                cardId,
                targetCard,
                playerID, // Note: passing playerID as caster/source scope
                modEffect,
                value,
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

        // check if the board can fit the summoned card
        for (let index = 0; index < value; index++) {
          if (G.board[playerTarget].length >= 7) {
            console.warn("Cannot summon more than 7 cards on the board");
            break; // Cannot summon more than 7 cards on the board
          }
          const summonedCard = createCardFromID(
            effect.cardID as CardTemplateKey,
          );
          if (summonedCard) {
            summonedCard.isPlaced = true; // Mark the summoned card as placed
            summonedCard.summoningSickness = true; // Summoned minions have summoning sickness
            recordEvent(G, {
              type: "summon",
              cardId: summonedCard.id,
              playerId: playerTarget,
              timestamp: Date.now(),
              card: summonedCard,
            });
            G.board[playerTarget].push(summonedCard);
          } else {
            console.warn(`Card with ID ${effect.cardID} not found.`);
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
      case "draw":
        for (let i = 0; i < resolveDynamicValue(effect.value, context); i++) {
          handleDrawCard(G, ctx, playerID);
        }
        break;
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

        // Handle fallback if no cards found
        if (cardsToAdd.length === 0 && effect.fallback) {
          for (let i = 0; i < effect.fallback.value; i++) {
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
              );
            }
          }
        } else {
          // Add cards to hand (up to the count specified)
          const cardsToProcess = cardsToAdd.slice(0, count);
          cardsToProcess.forEach((cardToAdd: Card) => {
            addCardToHand(
              G,
              playerID,
              cardToAdd,
              effect.modifiers,
              effect.source,
            );
          });
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
          returnCardToHand(G, cardToReturn, ownerID, effect.modifiers);
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
            returnCardToHand(G, targetCard, target.player, effect.modifiers);
          }
        }
        break;
      }
    }
  });

  context.temp = undefined;
};

const cancelBattlecry: Move<GameState> = ({ G, ctx }) => {
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

const drawCard: Move<GameState> = ({ G, ctx }) => {
  handleDrawCard(G, ctx);
};

const endTurn: Move<GameState> = ({ G, events }) => {
  // Clear last move metadata at the end of the turn
  G.gameEvents = [];
  G.activeBattlecryMinion = null;
  events.endTurn();
};

function handleDrawCard(G: GameState, ctx: Ctx, playerID?: PlayerID) {
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
      });
    }
  } else {
    // Handle case when deck is empty, e.g., damage player or reshuffle
    console.warn("Deck is empty, cannot draw a card.");
  }
}

function processDeaths(G: GameState, ctx: Ctx) {
  // Pass 'ctx' here so doEffects can access it
  const playerIds: ("0" | "1")[] = ["0", "1"];
  let deathsOccurred = false;

  playerIds.forEach((playerId) => {
    // 1. Find all minions on this board marked for death
    const deadMinions = G.board[playerId].filter(
      (card) => getCurrentHealth(card) <= 0,
    );

    if (deadMinions.length > 0) {
      deathsOccurred = true;

      deadMinions.forEach((deadCard) => {
        // 2. TRIGGER DEATHRATTLES:
        if (deadCard.deathrattle && deadCard.deathrattle.length > 0) {
          executeEffects(deadCard.deathrattle, {
            card: deadCard,
            G,
            ctx,
            location: "board",
            playerID: playerId,
          });
        }

        // 3. Record death event for frontend UI animations
        recordEvent(G, {
          type: "death",
          cardId: deadCard.id,
          playerId: playerId,
          timestamp: Date.now(),
        });

        G.graveyard.push({
          card: JSON.parse(JSON.stringify(deadCard)),
          originalOwner: playerId,
          diedOnTurn: ctx.turn,
        });
      });

      // 4. Clean sweep: Remove dead minions from the board simultaneously
      G.board[playerId] = G.board[playerId].filter(
        (card) => getCurrentHealth(card) > 0,
      );
    }
  });

  // 5. Recursion for chain reactions!
  // If a deathrattle dealt damage that killed ANOTHER minion, this runs again.
  if (deathsOccurred) {
    processDeaths(G, ctx);
  }
}

export function refreshAuras(G: GameState) {
  const playerIds: ("0" | "1")[] = ["0", "1"];

  playerIds.forEach((pId) => {
    G.board[pId].forEach((card) => {
      // 1. Clear out historical temporary aura instances, retaining permanent buffs
      card.modifiers = card.modifiers?.filter((m) => m.type !== "aura");
    });
  });

  // 2. Scan the entire board and look for active aura providers
  // playerIds.forEach((pId) => {
  //   G.board[pId].forEach((providerCard) => {
  //     // Add more dynamic data-driven aura checks here...
  //   });
  // });
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
  });
}

export const HeathStoneGame: Game<GameState> = {
  name: "hearthstone",
  setup: setupData,
  minPlayers: 2,
  maxPlayers: 2,
  ai: {
    enumerate: (G, ctx) => {
      const moves = enumerateAIMoves(G, ctx);
      // Convert AIMove format to boardgame.io format and return all moves
      return moves.map((aiMove) => ({
        move: aiMove.move,
        args: aiMove.args,
      }));
    },
  },
  phases: {
    play: {
      start: true,
      moves: {
        drawCard,
        placeCard,
        cancelBattlecry,
        endTurn,
        minionAttack,
        resolveBattlecry,
      },
      onBegin: ({ G, ctx }) => {
        // Draw 5 cards for each player at the start
        for (let i = 0; i < 5; i++) {
          handleDrawCard(G, ctx, "0");
          handleDrawCard(G, ctx, "1");
        }
      },
      turn: {
        onBegin: ({ G, ctx }) => {
          // 1. Process anything that expires at the START of a turn
          processModifierLifecycle(G, ctx.currentPlayer, "START_OF_TURN");

          const manaCrystals = G.players[ctx.currentPlayer].manaCrystals;
          G.players[ctx.currentPlayer].manaCrystals = Math.min(
            manaCrystals + 1,
            10,
          );
          G.players[ctx.currentPlayer].mana =
            G.players[ctx.currentPlayer].manaCrystals;

          // draw card if the player has less than 10 cards in hand
          if (ctx.turn > 2) {
            const player = G.players[ctx.currentPlayer];
            if (player.hand.length < 10) {
              handleDrawCard(G, ctx);
            }
          }

          // reset
          G.board[ctx.currentPlayer].forEach((card) => {
            card.attacksLeft = card.windfury ? 2 : 1;
            card.summoningSickness = false; // Remove summoning sickness
          });

          // 2. Always refresh static auras and evaluate cascading health drop deaths[cite: 1]
          refreshAuras(G);
          processDeaths(G, ctx); //[cite: 1]

          recordEvent(G, {
            type: "beginTurn",
            playerId: ctx.currentPlayer,
            timestamp: Date.now(),
          });
        },
        onEnd: ({ G, ctx }) => {
          // Clear last move metadata at the end of the turn
          G.gameEvents = [];
          G.activeBattlecryMinion = null;

          // 1. Process anything that expires at the END of a turn (like Abusive Sergeant)
          processModifierLifecycle(G, ctx.currentPlayer, "END_OF_TURN");

          G.board[ctx.currentPlayer].forEach((card) => {
            card.frozen = false; // unfreeze minions
          });

          // 2. Refresh auras/deaths again in case losing an attack/health buff altered the board state[cite: 1]
          refreshAuras(G);
          processDeaths(G, ctx); //[cite: 1]

          recordEvent(G, {
            type: "endTurn",
            playerId: ctx.currentPlayer,
            timestamp: Date.now(),
          });
        },
      },
    },
  },
  turn: {},
  endIf: isVictory,
};

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
