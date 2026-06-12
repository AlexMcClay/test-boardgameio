import Board from "@/components/Board";
import { Client } from "boardgame.io/react";

import type { Card, GameState, Player, TargetValue, GameEvent } from "@/types";
import { createCardFromID, createDeck, shuffleDeck } from "@/utils";
import type { Ctx, Game, Move, PlayerID } from "boardgame.io";
import { validateMove } from "@/utils/validateMove";
import type { CardTemplateKey } from "@/utils/cards";
import { enumerateAIMoves } from "./ai";
import { premadeDecks } from "@/utils/decks";

// Helper function to record game events
function recordEvent(G: GameState, event: GameEvent) {
  // Add to current move events
  G.gameEvents.push(event);

  // Also add to persistent history for debugging
  G.eventHistory.push(event);
}

export const isVictory = ({ G, ctx }: { G: GameState; ctx: Ctx }) => {
  if (G.players[0].hp <= 0) {
    return { winner: "1" };
  } else if (G.players[1].hp <= 0) {
    return { winner: "0" };
  }
};

const setupData = (): GameState => {
  const G: GameState = {
    players: {
      "0": p0,
      "1": p1,
    },
    board: {
      "0": [],
      "1": [],
    },
    maxMana: -1,
    gameEvents: [],
    eventHistory: [],
    activeBattlecryMinion: null,
  };

  return G;
};

const p0: Player = {
  id: "0",
  name: "Arthas",
  heroPortrait: "assets/Arthas.jpg", // Optional, if you want to display a hero portrait
  maxHp: 30,
  hp: 30,
  maxArmor: 0,
  armor: 0,
  mana: 1,
  hand: [],
  deck: [],
};

const p1: Player = {
  id: "1",
  name: "Illidan",
  heroPortrait: "assets/Illidan_Stormrage.jpg", // Optional, if you want to display a hero portrait
  maxHp: 30,
  hp: 30,
  maxArmor: 0,
  armor: 0,
  mana: 1,
  hand: [],
  deck: shuffleDeck(randomPremadeDeck()),
};

const placeCard: Move<GameState> = (
  { G, ctx },
  cardId: string,
  location: "hand" | "board" = "hand",
  target?: TargetValue,
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
  if (card.isMinnion && !card.isPlaced) {
    // console.log("Placing minion on the board");
    card.isPlaced = true; // Mark the card as placed
    card.hasAttacked = true;
    card.summoningSickness = true; // Minion has summoning sickness

    // Check if card needs targeted battlecry (damage or heal)
    const needsTargetedBattlecry =
      card.battlecryTargets &&
      card.battlecryTargets.length > 0 &&
      card.onPlace.some(
        (e) =>
          (e.type === "damage" && e.target === "user-select") ||
          (e.type === "heal" && e.target === "user-select"),
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

    G.board[ctx.currentPlayer].push(card);
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
      type: "spellCast",
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
  key: "effects" | "onPlace" = "effects",
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

  card[key].forEach((effect) => {
    switch (effect.type) {
      case "damage":
        const damage =
          typeof effect.value === "string"
            ? (card[effect.value] as number)
            : effect.value;
        if (target && effect.target === "user-select") {
          const targetPlayer = G.players[target.player];

          if (card.isPlaced && effect.type === "damage" && !effect.battlecry) {
            card.hasAttacked = true; // Mark the card as having attacked (only for real attacks)
          }

          // Record attack event (for attack animation)
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

          if (target.type === "player") {
            targetPlayer.hp -= damage;

            // Record damage event
            recordEvent(G, {
              type: "damage",
              sourceId: cardId,
              targetId: target.player,
              targetType: "player",
              playerId: target.player,
              value: damage,
              timestamp: Date.now(),
            });
          }

          // Minion Attack
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            if (targetCard && targetCard.health) {
              // Record damage event BEFORE removing card
              recordEvent(G, {
                type: "damage",
                sourceId: cardId,
                targetId: targetCard.id,
                targetType: "card",
                playerId: target.player,
                value: damage,
                timestamp: Date.now(),
              });

              targetCard.health -= damage;
              if (targetCard.health <= 0) {
                // Record death event
                recordEvent(G, {
                  type: "death",
                  cardId: targetCard.id,
                  playerId: target.player,
                  timestamp: Date.now(),
                });

                // Remove the card from the board immediately
                G.board[target.player] = G.board[target.player].filter(
                  (c) => c.id !== targetCard.id,
                );
              }

              // check damage to self card (counter-attack)
              if (!effect.battlecry) {
                const damageEnemy =
                  typeof effect.value === "string"
                    ? (targetCard[effect.value] as number)
                    : effect.value;
                if (card.health) {
                  // Record counter-attack damage
                  recordEvent(G, {
                    type: "damage",
                    sourceId: targetCard.id,
                    targetId: card.id,
                    targetType: "card",
                    playerId: playerID,
                    value: damageEnemy,
                    timestamp: Date.now(),
                  });

                  card.health -= damageEnemy;
                  if (card.health <= 0) {
                    // Record death event
                    recordEvent(G, {
                      type: "death",
                      cardId: card.id,
                      playerId: playerID,
                      timestamp: Date.now(),
                    });

                    // Remove the card from the board immediately
                    G.board[playerID] = G.board[playerID].filter(
                      (c) => c.id !== card.id,
                    );
                  }
                }
              }
            }
          }
        } else if (effect.target === "self-hero") {
          const currentPlayer = G.players[playerID];
          currentPlayer.hp -= damage;

          // Record damage event
          recordEvent(G, {
            type: "damage",
            sourceId: cardId,
            targetId: playerID,
            targetType: "player",
            playerId: playerID,
            value: damage,
            timestamp: Date.now(),
          });
        } else if (effect.target === "enemy-hero") {
          const enemyPlayerId = playerID === "0" ? "1" : "0";
          const enemyPlayer = G.players[enemyPlayerId];
          enemyPlayer.hp -= damage;

          // Record damage event
          recordEvent(G, {
            type: "damage",
            sourceId: cardId,
            targetId: enemyPlayerId,
            targetType: "player",
            playerId: enemyPlayerId,
            value: damage,
            timestamp: Date.now(),
          });
        }
        break;
      case "incrementValue":
        if (target && effect.target === "other") {
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            if (targetCard && targetCard[effect.key] !== undefined) {
              // @ts-ignore
              targetCard[effect.key] += effect.value;
            }
          }
        } else if (effect.target === "self") {
          if (card[effect.key] !== undefined) {
            // @ts-ignore
            card[effect.key] += effect.value;
          }
        }
        break;
      case "heal":
        // Handle different heal target types
        if (effect.target === "user-select" && target) {
          // Targeted heal (user selects)
          if (target.type === "player") {
            const targetPlayer = G.players[target.player];
            const actualHeal = Math.min(
              effect.value,
              targetPlayer.maxHp - targetPlayer.hp,
            );
            targetPlayer.hp = Math.min(
              targetPlayer.hp + effect.value,
              targetPlayer.maxHp,
            );

            // Record heal event
            recordEvent(G, {
              type: "heal",
              sourceId: cardId,
              targetId: target.player,
              targetType: "player",
              playerId: target.player,
              value: actualHeal,
              timestamp: Date.now(),
            });
          }
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            if (
              targetCard &&
              targetCard.health !== undefined &&
              targetCard.maxHealth !== undefined
            ) {
              const actualHeal = Math.min(
                effect.value,
                targetCard.maxHealth - targetCard.health,
              );
              targetCard.health = Math.min(
                targetCard.health + effect.value,
                targetCard.maxHealth,
              );

              // Record heal event
              recordEvent(G, {
                type: "heal",
                sourceId: cardId,
                targetId: targetCard.id,
                targetType: "card",
                playerId: target.player,
                value: actualHeal,
                timestamp: Date.now(),
              });
            }
          }
          if (target.type === "lane") {
            // all cards in the lane are healed
            G.board[target.player].forEach((c) => {
              if (c.health !== undefined && c.maxHealth !== undefined) {
                const actualHeal = Math.min(
                  effect.value,
                  c.maxHealth - c.health,
                );
                c.health = Math.min(c.health + effect.value, c.maxHealth);

                // Record heal event for each card
                recordEvent(G, {
                  type: "heal",
                  sourceId: cardId,
                  targetId: c.id,
                  targetType: "card",
                  playerId: target.player,
                  value: actualHeal,
                  timestamp: Date.now(),
                });
              }
            });
          }
        } else if (effect.target === "all-friendly") {
          // Heal all friendly minions + hero
          const currentPlayer = G.players[playerID];

          // Heal hero
          const heroActualHeal = Math.min(
            effect.value,
            currentPlayer.maxHp - currentPlayer.hp,
          );
          currentPlayer.hp = Math.min(
            currentPlayer.hp + effect.value,
            currentPlayer.maxHp,
          );
          if (heroActualHeal > 0) {
            recordEvent(G, {
              type: "heal",
              sourceId: cardId,
              targetId: playerID,
              targetType: "player",
              playerId: playerID,
              value: heroActualHeal,
              timestamp: Date.now(),
            });
          }

          // Heal all friendly minions
          G.board[playerID].forEach((c) => {
            if (c.health !== undefined && c.maxHealth !== undefined) {
              const actualHeal = Math.min(effect.value, c.maxHealth - c.health);
              c.health = Math.min(c.health + effect.value, c.maxHealth);
              if (actualHeal > 0) {
                recordEvent(G, {
                  type: "heal",
                  sourceId: cardId,
                  targetId: c.id,
                  targetType: "card",
                  playerId: playerID,
                  value: actualHeal,
                  timestamp: Date.now(),
                });
              }
            }
          });
        } else if (effect.target === "friendly-hero") {
          // Heal only friendly hero
          const currentPlayer = G.players[playerID];
          const actualHeal = Math.min(
            effect.value,
            currentPlayer.maxHp - currentPlayer.hp,
          );
          currentPlayer.hp = Math.min(
            currentPlayer.hp + effect.value,
            currentPlayer.maxHp,
          );
          if (actualHeal > 0) {
            recordEvent(G, {
              type: "heal",
              sourceId: cardId,
              targetId: playerID,
              targetType: "player",
              playerId: playerID,
              value: actualHeal,
              timestamp: Date.now(),
            });
          }
        } else if (effect.target === "friendly-board") {
          // Heal only friendly minions
          G.board[playerID].forEach((c) => {
            if (c.health !== undefined && c.maxHealth !== undefined) {
              const actualHeal = Math.min(effect.value, c.maxHealth - c.health);
              c.health = Math.min(c.health + effect.value, c.maxHealth);
              if (actualHeal > 0) {
                recordEvent(G, {
                  type: "heal",
                  sourceId: cardId,
                  targetId: c.id,
                  targetType: "card",
                  playerId: playerID,
                  value: actualHeal,
                  timestamp: Date.now(),
                });
              }
            }
          });
        } else if (effect.target === "self-hero") {
          // Heal own hero
          const currentPlayer = G.players[playerID];
          const actualHeal = Math.min(
            effect.value,
            currentPlayer.maxHp - currentPlayer.hp,
          );
          currentPlayer.hp = Math.min(
            currentPlayer.hp + effect.value,
            currentPlayer.maxHp,
          );
          if (actualHeal > 0) {
            recordEvent(G, {
              type: "heal",
              sourceId: cardId,
              targetId: playerID,
              targetType: "player",
              playerId: playerID,
              value: actualHeal,
              timestamp: Date.now(),
            });
          }
        }
        break;
      case "mana":
        // increment current   player's mana
        G.players[playerID].mana += effect.value;
        break;
      case "changeKey":
        if (target && effect.target == "other") {
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            if (targetCard) {
              // @ts-ignore
              targetCard[effect.key] = effect.value;
            }
          }
        } else if (effect.target == "self") {
          if (card[effect.key] !== undefined) {
            // @ts-ignore
            card[effect.key] = effect.value;
          }
        }
        break;
      case "summon":
        // check if the board can fit the summoned card
        if (G.board[playerID].length >= 7) {
          console.warn("Cannot summon more than 7 cards on the board");
          break; // Cannot summon more than 7 cards on the board
        }
        const summonedCard = createCardFromID(effect.cardID as CardTemplateKey);
        if (summonedCard) {
          summonedCard.isPlaced = true; // Mark the summoned card as placed
          summonedCard.hasAttacked = true; // Reset attack status for summoned cards
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
          handleDrawCard(G, ctx);
        }
        break;
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
    }
  } else {
    // Handle case when deck is empty, e.g., damage player or reshuffle
    console.warn("Deck is empty, cannot draw a card.");
  }
}

function randomPremadeDeck() {
  return createDeckFromPremadeDeck(
    premadeDecks[Math.floor(Math.random() * premadeDecks.length)].deckString,
  );
}

function createDeckFromPremadeDeck(
  premadeDeck: Record<string, number>,
): Card[] {
  const deck: Card[] = [];
  for (const cardId in premadeDeck) {
    const count = premadeDeck[cardId];
    for (let i = 0; i < count; i++) {
      const card = createCardFromID(cardId as CardTemplateKey);
      if (card) {
        deck.push(card);
      } else {
        console.warn(`Card with ID ${cardId} not found.`);
      }
    }
  }
  return deck;
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
    setDeck: {
      start: true,
      moves: {
        setDeck({ G, ctx }, playerID: PlayerID, deck: Record<string, number>) {
          const player = G.players[playerID];
          if (player) {
            const finalDeck = createDeckFromPremadeDeck(deck);
            player.deck = shuffleDeck(finalDeck);
            ctx.turn = 0; // Reset turn count when decks are set
          } else {
            console.warn(`Player ${playerID} not found.`);
          }
        },
      },
      next: "playGame",
      endIf: ({ G, ctx }) => {
        // Check if both players have set their decks
        return G.players["0"].deck.length > 0 && G.players["1"].deck.length > 0;
      },
    },
    playGame: {
      moves: { drawCard, placeCard, cancelBattlecry, endTurn },
      onBegin: ({ G, ctx }) => {
        // Draw 3 cards for the first turn
        for (let i = 0; i < 5; i++) {
          handleDrawCard(G, ctx, "0");
          handleDrawCard(G, ctx, "1");
        }
      },
    },
  },
  turn: {
    onEnd: ({ G, ctx }) => {
      // Clear last move metadata at the end of the turn
      G.gameEvents = [];
      G.activeBattlecryMinion = null;
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
    },
  },
  endIf: isVictory,
};

export const Hearthstone = Client({
  board: Board,
  game: HeathStoneGame,
  debug: { collapseOnLoad: true, hideToggleButton: true }, // Set to false for enabling debug panel
});
