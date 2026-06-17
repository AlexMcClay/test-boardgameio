import type { Card, GameState, Player, TargetValue, Hero } from "./types";
import {
  createCardFromID,
  getAttack,
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
} from "./utils";
import type { Ctx, Game, Move, PlayerID } from "boardgame.io";
import { validateMove } from "./utils/validateMove";
import type { CardTemplateKey } from "./data/cards";
import { enumerateAIMoves } from "./ai";

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
    mana: 1,
    hand: [],
    deck: playerDeck,
  };

  const p1: Player = {
    id: "1",
    name: opponentHero?.heroName || "Illidan",
    heroPortrait:
      opponentHero?.portrait || "assets/heros/Illidan_Stormrage.jpg",
    maxHealth: 30,
    health: 30,
    armor: 0,
    mana: 1,
    hand: [],
    deck: opponentDeck,
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
    maxMana: 0,
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
  // console.log(
  //   `Attempting to place card ${cardId} from ${location} (AI Move #${G.aiMoveCount}) with target:`,
  //   target,
  // );
  // Check if this is a battlecry resolution
  const isResolvingBattlecry =
    G.activeBattlecryMinion?.cardId === cardId &&
    location === "board" &&
    target;

  if (isResolvingBattlecry) {
    // console.log("Resolving battlecry for card:", cardId);
    // Execute the battlecry onPlace effects with target
    doEffects(
      { G, ctx },
      cardId,
      "onPlace",
      "board",
      ctx.currentPlayer,
      target,
    );
    // Clear the battlecry state
    G.activeBattlecryMinion = null;
    processDeaths(G, ctx);
    return;
  }

  // Single validation call
  const validation = validateMove(G, ctx, cardId, location, target);

  if (!validation.valid) {
    console.warn(`Invalid move: ${validation.error}`);
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

  const player = G.players[ctx.currentPlayer];
  const card =
    location === "hand"
      ? player.hand.find((c) => c.id === cardId)!
      : G.board[ctx.currentPlayer].find((c) => c.id === cardId)!;

  player.mana -= !card.isPlaced ? getManaCost(card) : 0;

  doEffects({ G, ctx }, cardId, "effects", location, ctx.currentPlayer, target);

  // See if the card can be placed on the board
  if (card.isMinion && !card.isPlaced) {
    // console.log("Placing minion on the board");
    card.isPlaced = true; // Mark the card as placed
    card.summoningSickness = true; // Minion has summoning sickness

    // Check if card needs targeted battlecry (damage or heal)
    const needsTargetedBattlecry =
      card.battlecryQuery &&
      card.onPlace.some(
        (e) =>
          (e.type === "damage" && e.target === "user-select") ||
          (e.type === "heal" && e.target === "user-select") ||
          (e.type === "changeKey" && e.target === "user-select") ||
          (e.type === "divineShield" && e.target === "user-select") ||
          (e.type === "taunt" && e.target === "user-select") ||
          (e.type === "freeze" && e.target === "user-select") ||
          (e.type === "charge" && e.target === "user-select") ||
          (e.type === "rush" && e.target === "user-select") ||
          (e.type === "applyModifier" && e.target === "user-select"),
      );
    if (needsTargetedBattlecry) {
      // console.log("Setting pending battlecry for card:", card.id);
      // Set pending battlecry, DON'T execute onPlace yet
      G.activeBattlecryMinion = {
        cardId: card.id,
        playerId: ctx.currentPlayer,
      };
    } else {
      // Execute onPlace immediately for non-targeted battlecries
      doEffects(
        { G, ctx },
        cardId,
        "onPlace",
        location,
        ctx.currentPlayer,
        target,
      );
    }

    if (boardIndex !== undefined) {
      G.board[ctx.currentPlayer].splice(boardIndex, 0, card);
    } else {
      G.board[ctx.currentPlayer].push(card);
    }
    recordEvent(G, {
      type: "minionPlaced",
      cardId: card.id,
      playerId: ctx.currentPlayer,
      timestamp: Date.now(),
      card, // Include full card data for animation
    });
  }

  if (card.isSpell) {
    recordEvent(G, {
      type: "spell",
      cardId: card.id,
      playerId: ctx.currentPlayer,
      timestamp: Date.now(),
      card,
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

const doEffects = (
  {
    G,
    ctx,
  }: {
    G: GameState;
    ctx: Ctx;
  },
  cardId: string,
  key: "effects" | "onPlace" | "deathrattle" = "effects",
  location: "hand" | "board",
  playerID: PlayerID,
  target?: TargetValue,
) => {
  const player = G.players[playerID];
  const card =
    location === "hand"
      ? player.hand.find((c) => c.id === cardId)
      : G.board[playerID].find((c) => c.id === cardId);
  if (!card) {
    console.warn("Card not found in the specified location");
    return; // Card not found in the specified location
  }

  card[key]?.forEach((effect) => {
    switch (effect.type) {
      case "damage": {
        const damage =
          effect.value === "baseAttack"
            ? getAttack(card)
            : typeof effect.value === "string"
              ? (card[effect.value] as number)
              : effect.value;

        if (target && effect.target === "user-select") {
          if (card.isPlaced && !effect.battlecry && card.isMinion) {
            card.hasAttacked = true; // Mark the card as having attacked
          }

          // Record attack animation event
          if (location === "board" && target.player !== playerID) {
            recordEvent(G, {
              type: "attack",
              attackerId: cardId,
              targetId: target.id,
              targetType: target.type === "player" ? "player" : "card",
              targetPlayerId: target.player,
              attackerPlayerId: playerID,
              sourceId: cardId,
              timestamp: Date.now(),
            });
          }

          // Target: Player
          if (target.type === "player") {
            dealDamageToPlayer(G, cardId, target.player, damage);
          }

          // Target: Minion / Card
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );

            if (targetCard && targetCard.isMinion) {
              // Main attack damage to target
              dealDamageToCard(G, cardId, targetCard, target.player, damage);

              // Check counter-attack damage to self card
              if (!effect.battlecry && targetCard.isMinion) {
                const damageEnemy = getAttack(targetCard);

                dealDamageToCard(G, targetCard.id, card, playerID, damageEnemy);
              }
            }
          }
        } else if (
          effect.target === "friendly-hero" ||
          effect.target === "enemy-hero"
        ) {
          const targetPlayerId =
            effect.target === "friendly-hero"
              ? playerID
              : playerID === "0"
                ? "1"
                : "0";

          dealDamageToPlayer(G, cardId, targetPlayerId, damage);
        } else if (effect.target === "enemy-board") {
          const targetPlayerId = playerID === "0" ? "1" : "0";
          G.board[targetPlayerId].forEach((c) =>
            dealDamageToCard(G, cardId, c, targetPlayerId, damage),
          );
        } else if (effect.target === "enemy-all") {
          const targetPlayerId = playerID === "0" ? "1" : "0";
          dealDamageToPlayer(G, cardId, targetPlayerId, damage);
          G.board[targetPlayerId].forEach((c) =>
            dealDamageToCard(G, cardId, c, targetPlayerId, damage),
          );
        } else if (effect.target === "board") {
          Object.entries(G.board).forEach(([player, lane]) => {
            lane.forEach((c) => {
              dealDamageToCard(G, cardId, c, player, damage);
            });
          });
        }
        break;
      }
      // Add these cases to your main engine effect processor switch block
      case "freeze":
      case "divineShield":
      case "taunt":
      case "stealth":
      case "charge":
      case "rush": {
        // Map the effect type to the exact property name on your Card object
        const keyMap: Record<string, keyof Card> = {
          freeze: "frozen", // your card uses .frozen instead of .freeze
          divineShield: "divineShield",
          taunt: "taunt",
          stealth: "stealth",
          charge: "charge",
          rush: "rush",
        };

        const cardKey = keyMap[effect.type];

        if (target && effect.target === "user-select") {
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            if (targetCard && targetCard.isMinion) {
              applyBoolEffectToCard(
                G,
                cardId,
                targetCard,
                target.player,
                effect.type,
                cardKey,
              );
            }
          }
        } else if (
          effect.target === "friendly-hero" ||
          effect.target === "enemy-hero"
        ) {
          // Hero logic can be placed here if heroes get statuses (like frozen)
        } else if (effect.target === "enemy-board") {
          const targetPlayerId = playerID === "0" ? "1" : "0";
          G.board[targetPlayerId].forEach((c) =>
            applyBoolEffectToCard(
              G,
              cardId,
              c,
              targetPlayerId,
              effect.type,
              cardKey,
            ),
          );
        } else if (effect.target === "enemy-all") {
          const targetPlayerId = playerID === "0" ? "1" : "0";
          G.board[targetPlayerId].forEach((c) =>
            applyBoolEffectToCard(
              G,
              cardId,
              c,
              targetPlayerId,
              effect.type,
              cardKey,
            ),
          );
        } else if (effect.target === "board") {
          Object.entries(G.board).forEach(([player, lane]) => {
            lane.forEach((c) => {
              applyBoolEffectToCard(G, cardId, c, player, effect.type, cardKey);
            });
          });
        }
        break;
      }
      case "heal": {
        const healValue = effect.value;

        // 1. Single Selected Target Logic
        if (effect.target === "user-select" && target) {
          if (target.type === "player") {
            healPlayer(G, cardId, target.player, healValue);
          }

          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            if (targetCard)
              healCard(G, cardId, targetCard, target.player, healValue);
          }

          if (target.type === "lane") {
            G.board[target.player].forEach((c) => {
              healCard(G, cardId, c, target.player, healValue);
            });
          }
        }

        // 2. Global / AoE Effects
        else if (effect.target === "friendly-all") {
          // Heal friendly hero
          healPlayer(G, cardId, playerID, healValue);
          // Heal all friendly minions
          G.board[playerID].forEach((c) =>
            healCard(G, cardId, c, playerID, healValue),
          );
        } else if (effect.target === "friendly-hero") {
          healPlayer(G, cardId, playerID, healValue);
        } else if (effect.target === "friendly-board") {
          G.board[playerID].forEach((c) =>
            healCard(G, cardId, c, playerID, healValue),
          );
        }

        break;
      }
      case "mana":
        // increment current   player's mana
        G.players[playerID].mana += effect.value;
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
        // 1. Cast your generic effect block to our typed structure
        const modEffect = effect;

        // 1. Single Selected Target Logic
        if (effect.target === "user-select" && target) {
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            if (targetCard)
              proccessApplyModifier(G, cardId, targetCard, playerID, modEffect);
          }

          if (target.type === "lane") {
            G.board[target.player].forEach((c) => {
              proccessApplyModifier(G, cardId, c, playerID, modEffect);
            });
          }
        }

        // 2. Global / AoE Effects
        else if (effect.target === "friendly-all") {
          // Heal all friendly minions
          G.board[playerID].forEach((c) =>
            proccessApplyModifier(G, cardId, c, playerID, modEffect),
          );
        } else if (effect.target === "enemy-all") {
          const targetPlayerId = playerID === "0" ? "1" : "0";
          G.board[targetPlayerId].forEach((c) =>
            proccessApplyModifier(G, cardId, c, playerID, modEffect),
          );
        } else if (effect.target === "board") {
          Object.entries(G.board).forEach(([player, lane]) => {
            lane.forEach((c) => {
              proccessApplyModifier(G, cardId, c, playerID, modEffect);
            });
          });
        }

        break;
      }
      case "summon": {
        const enemyPlayerId = playerID === "0" ? "1" : "0";
        const playerTarget =
          effect.target === "self" ? playerID : enemyPlayerId;
        // check if the board can fit the summoned card
        if (G.board[playerTarget].length >= 7) {
          console.warn("Cannot summon more than 7 cards on the board");
          break; // Cannot summon more than 7 cards on the board
        }
        const summonedCard = createCardFromID(effect.cardID as CardTemplateKey);
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
        break;
      }
      case "armor":
        const enemyPlayerId = playerID === "0" ? "1" : "0";
        const playerTarget =
          effect.target === "self" ? playerID : enemyPlayerId;
        // check if the board can fit the summoned card
        G.players[playerTarget].armor += effect.value;

        break;
      case "draw":
        for (let i = 0; i < effect.value; i++) {
          handleDrawCard(G, ctx, playerID);
        }
        break;
      case "destroy": {
        if (effect.target === "user-select" && target) {
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            if (targetCard) {
              targetCard.damageTaken = getMaxHealth(targetCard);
            }
          }
        } else if (effect.target === "enemy-board") {
          // Optional: For random or non-targeted destroy spell variants in the future
          console.warn("Non-targeted destroy effects are not yet implemented.");
        }
        break;
      }
    }
  });
};

const cancelBattlecry: Move<GameState> = ({ G }) => {
  G.activeBattlecryMinion = null;
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
          doEffects(
            {
              G,
              ctx,
            },
            deadCard.id,
            "deathrattle",
            "board",
            playerId,
          );
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
      moves: { drawCard, placeCard, cancelBattlecry, endTurn },
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

          if (ctx.turn % 2) {
            G.maxMana = Math.min(G.maxMana + 1, 10);
          }
          G.players[ctx.currentPlayer].mana = G.maxMana;

          // draw card if the player has less than 10 cards in hand
          if (ctx.turn > 2) {
            const player = G.players[ctx.currentPlayer];
            if (player.hand.length < 10) {
              handleDrawCard(G, ctx);
            }
          }

          // reset
          G.board[ctx.currentPlayer].forEach((card) => {
            card.hasAttacked = false; // Reset attack status for all cards
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
