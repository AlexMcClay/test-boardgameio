import type { Card, GameState, Player, TargetValue, GameEvent } from "@/types";
import { createCardFromID, shuffleDeck } from "@/utils";
import type { Ctx, Game, Move, PlayerID } from "boardgame.io";
import { validateMove } from "@/utils/validateMove";
import type { CardTemplateKey } from "@/utils/cards";
import { enumerateAIMoves } from "./ai";
import type { Hero } from "@/utils/heros";

// Helper function to record game events
function recordEvent(G: GameState, event: GameEvent) {
  // Add to current move events
  G.gameEvents.push(event);

  // Also add to persistent history for debugging
  G.eventHistory.push(event);
}

export const isVictory = ({ G, ctx }: { G: GameState; ctx: Ctx }) => {
  if (G.players[0].health <= 0) {
    return { winner: "1" };
  } else if (G.players[1].health <= 0) {
    return { winner: "0" };
  }
};

const setupData = (
  { ctx }: { ctx: Ctx },
  setupData?: {
    playerDeck?: Card[];
    playerHero?: Hero;
    opponentDeck?: Card[];
    opponentHero?: Hero;
  },
): GameState => {
  // Initialize player decks from setupData or use empty arrays
  const playerDeck = setupData?.playerDeck
    ? shuffleDeck([...setupData.playerDeck])
    : [];
  const opponentDeck = setupData?.opponentDeck
    ? shuffleDeck([...setupData.opponentDeck])
    : [];

  // Get hero data or use defaults
  const playerHero = setupData?.playerHero;
  const opponentHero = setupData?.opponentHero;

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

  player.mana -= !card.isPlaced ? card.mana || 0 : 0; // Deduct mana cost

  doEffects({ G, ctx }, cardId, "effects", location, ctx.currentPlayer, target);

  // See if the card can be placed on the board
  if (card.isMinion && !card.isPlaced) {
    // console.log("Placing minion on the board");
    card.isPlaced = true; // Mark the card as placed
    card.summoningSickness = true; // Minion has summoning sickness

    // Check if card needs targeted battlecry (damage or heal)
    const needsTargetedBattlecry =
      card.battlecryTargets &&
      card.battlecryTargets.length > 0 &&
      card.onPlace.some(
        (e) =>
          (e.type === "damage" && e.target === "user-select") ||
          (e.type === "heal" && e.target === "user-select") ||
          (e.type === "changeKey" && e.target === "user-select") ||
          (e.type === "incrementValue" && e.target === "user-select") ||
          (e.type === "divineShield" && e.target === "user-select"),
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
          typeof effect.value === "string"
            ? (card[effect.value] as number)
            : effect.value;

        if (target && effect.target === "user-select") {
          if (card.isPlaced && effect.type === "damage" && !effect.battlecry) {
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

            if (targetCard && typeof targetCard.health !== "undefined") {
              // Main attack damage to target
              dealDamageToCard(G, cardId, targetCard, target.player, damage);

              // Check counter-attack damage to self card
              if (!effect.battlecry && typeof card.health !== "undefined") {
                const damageEnemy =
                  typeof effect.value === "string"
                    ? (targetCard[effect.value] as number)
                    : effect.value;

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
        }
        break;
      }
      case "freeze": {
        if (target && effect.target === "user-select") {
          // Record attack animation event

          // Target: Player
          // if (target.type === "player") {
          //   dealDamageToPlayer(G, cardId, target.player, damage);
          // }

          // Target: Minion / Card
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );

            if (targetCard && typeof targetCard.health !== "undefined") {
              // Main attack damage to target
              freezeCard(G, cardId, targetCard, target.player);
            }
          }
        } else if (
          effect.target === "friendly-hero" ||
          effect.target === "enemy-hero"
        ) {
          // const targetPlayerId =
          //   effect.target === "friendly-hero"
          //     ? playerID
          //     : playerID === "0"
          //       ? "1"
          //       : "0";
          // freezeCard(G, cardId, targetPlayerId);
        } else if (effect.target === "enemy-board") {
          const targetPlayerId = playerID === "0" ? "1" : "0";
          G.board[targetPlayerId].forEach((c) =>
            freezeCard(G, cardId, c, targetPlayerId),
          );
        } else if (effect.target === "enemy-all") {
          const targetPlayerId = playerID === "0" ? "1" : "0";
          // freezeCard(G, cardId, targetPlayerId);
          G.board[targetPlayerId].forEach((c) =>
            freezeCard(G, cardId, c, targetPlayerId),
          );
        }
        break;
      }
      case "divineShield": {
        if (target && effect.target === "user-select") {
          // Record attack animation event

          // Target: Player
          // if (target.type === "player") {
          //   dealDamageToPlayer(G, cardId, target.player, damage);
          // }

          // Target: Minion / Card
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );

            if (targetCard && typeof targetCard.health !== "undefined") {
              // Main attack damage to target
              divineShieldCard(G, cardId, targetCard, target.player);
            }
          }
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
      case "incrementValue": {
        let cardToUpdate: typeof card | undefined;

        if (effect.target === "self") {
          cardToUpdate = card;
        } else if (effect.target === "user-select" && target?.type === "card") {
          cardToUpdate = G.board[target.player].find((c) => c.id === target.id);
        }

        if (cardToUpdate && cardToUpdate[effect.key] !== undefined) {
          // @ts-ignore
          cardToUpdate[effect.key] += effect.value;

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
      }
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
      case "summon":
        const enemyPlayerId = playerID === "0" ? "1" : "0";
        // check if the board can fit the summoned card
        if (G.board[playerID].length >= 7) {
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
            playerId: playerID,
            timestamp: Date.now(),
            card: summonedCard,
          });
          G.board[playerID].push(summonedCard);
        } else {
          console.warn(`Card with ID ${effect.cardID} not found.`);
        }
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
              targetCard.health = 0;
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

const endTurn: Move<GameState> = ({ G, ctx, events }) => {
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

function dealDamageToCard(
  G: GameState,
  sourceId: string,
  targetCard: Card, // This is our target minion
  targetPlayerId: string,
  damageAmount: number,
) {
  if (!targetCard || typeof targetCard.health === "undefined") return;

  // 1. DIVINE SHIELD CHECK: Intercept positive damage values
  if (targetCard.divineShield && damageAmount > 0) {
    // Pop the bubble!
    targetCard.divineShield = false;

    recordEvent(G, {
      type: "damage",
      sourceId: sourceId,
      targetId: targetCard.id,
      targetType: "card",
      playerId: targetPlayerId,
      value: 0, // Reduces damage to 0
      timestamp: Date.now(),
    });

    return;
  }

  // 2. STANDARD DAMAGE FALLBACK (If no shield is present or damage is 0)
  recordEvent(G, {
    type: "damage",
    sourceId: sourceId,
    targetId: targetCard.id,
    targetType: "card",
    playerId: targetPlayerId,
    value: damageAmount,
    timestamp: Date.now(),
  });

  targetCard.health -= damageAmount;
}

function freezeCard(
  G: GameState,
  sourceId: string,
  targetCard: Card,
  targetPlayerId: string,
) {
  if (!targetCard) return;

  targetCard.frozen = true;

  recordEvent(G, {
    type: "freeze",
    sourceId: sourceId,
    targetId: targetCard.id,
    targetType: "card",
    playerId: targetPlayerId,
    timestamp: Date.now(),
  });
}

function divineShieldCard(
  G: GameState,
  sourceId: string,
  targetCard: Card,
  targetPlayerId: string,
) {
  if (!targetCard) return;

  targetCard.divineShield = true;

  recordEvent(G, {
    type: "divineShield",
    sourceId: sourceId,
    targetId: targetCard.id,
    targetType: "card",
    playerId: targetPlayerId,
    timestamp: Date.now(),
  });
}

function dealDamageToPlayer(
  G: GameState,
  sourceId: string,
  targetPlayerId: string,
  damageAmount: number,
) {
  const targetPlayer = G.players[targetPlayerId];
  if (!targetPlayer) return;

  const armorDamage = Math.min(targetPlayer.armor, damageAmount);
  targetPlayer.armor -= armorDamage;
  const remainingDamage = damageAmount - armorDamage;
  targetPlayer.health -= remainingDamage;

  recordEvent(G, {
    type: "damage",
    sourceId: sourceId,
    targetId: targetPlayerId,
    targetType: "player",
    playerId: targetPlayerId,
    value: damageAmount,
    timestamp: Date.now(),
  });
}
function healPlayer(
  G: GameState,
  sourceId: string,
  targetPlayerId: string,
  amount: number,
) {
  const player = G.players[targetPlayerId];
  if (!player) return;

  const actualHeal = Math.min(amount, player.maxHealth - player.health);
  if (actualHeal <= 0) return; // No healing needed (already at full health)

  player.health += actualHeal;

  recordEvent(G, {
    type: "heal",
    sourceId,
    targetId: targetPlayerId,
    targetType: "player",
    playerId: targetPlayerId,
    value: actualHeal,
    timestamp: Date.now(),
  });
}

function healCard(
  G: GameState,
  sourceId: string,
  targetCard: any,
  playerId: string,
  amount: number,
) {
  if (
    !targetCard ||
    targetCard.health === undefined ||
    targetCard.maxHealth === undefined
  )
    return;

  const actualHeal = Math.min(amount, targetCard.maxHealth - targetCard.health);
  if (actualHeal <= 0) return; // Already at full health

  targetCard.health += actualHeal;

  recordEvent(G, {
    type: "heal",
    sourceId,
    targetId: targetCard.id,
    targetType: "card",
    playerId,
    value: actualHeal,
    timestamp: Date.now(),
  });
}

function processDeaths(G: GameState, ctx: Ctx) {
  // Pass 'ctx' here so doEffects can access it
  const playerIds: ("0" | "1")[] = ["0", "1"];
  let deathsOccurred = false;

  playerIds.forEach((playerId) => {
    // 1. Find all minions on this board marked for death
    const deadMinions = G.board[playerId].filter(
      (card) => typeof card.health !== "undefined" && card.health <= 0,
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
      });

      // 4. Clean sweep: Remove dead minions from the board simultaneously
      G.board[playerId] = G.board[playerId].filter(
        (card) => typeof card.health === "undefined" || card.health > 0,
      );
    }
  });

  // 5. Recursion for chain reactions!
  // If a deathrattle dealt damage that killed ANOTHER minion, this runs again.
  if (deathsOccurred) {
    processDeaths(G, ctx);
  }
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
        onEnd: ({ G, ctx }) => {
          // Clear last move metadata at the end of the turn
          G.gameEvents = [];
          G.activeBattlecryMinion = null;

          G.board[ctx.currentPlayer].forEach((card) => {
            card.frozen = false; // unfreeze minions
          });
          recordEvent(G, {
            type: "endTurn",
            playerId: ctx.currentPlayer,
            timestamp: Date.now(),
          });
        },
        onBegin: ({ G, ctx }) => {
          // Reset mana at the start of each turn
          // Draw a card at the start of the turn

          if (ctx.turn % 2) {
            G.maxMana = Math.min(G.maxMana + 1, 10);
          }
          G.players[ctx.currentPlayer].mana = G.maxMana;
          if (ctx.turn > 2) {
            // draw card if the player has less than 10 cards in hand
            const player = G.players[ctx.currentPlayer];
            if (player.hand.length < 10) {
              handleDrawCard(G, ctx);
            }
          }

          G.board[ctx.currentPlayer].forEach((card) => {
            card.hasAttacked = false; // Reset attack status for all cards
            card.summoningSickness = false; // Remove summoning sickness
          });
          recordEvent(G, {
            type: "beginTurn",
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
