import Board from "@/components/Board";
import { Client } from "boardgame.io/react";

import type { Card, GameState, Player, TargetValue, GameEvent } from "@/types";
import { createCardFromID, createDeck, shuffleDeck } from "@/utils";
import type { Ctx, Game, Move, PlayerID } from "boardgame.io";
import { validateMove } from "@/utils/validateMove";
import type { CardTemplateKey } from "@/utils/cards";

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
  mana: 10,
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
  mana: 10,
  hand: [],
  deck: shuffleDeck(createDeck(20)),
};

const placeCard: Move<GameState> = (
  { G, ctx },
  cardId: string,
  location: "hand" | "board" = "hand",
  target?: TargetValue,
) => {
  // Check if this is a battlecry resolution
  const isResolvingBattlecry =
    G.activeBattlecryMinion?.cardId === cardId &&
    location === "board" &&
    target;

  if (isResolvingBattlecry) {
    console.log("Resolving battlecry for card:", cardId);
    // Execute the battlecry onPlace effects with target
    doEffects({ G, ctx }, cardId, "onPlace", "board", target);
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

  console.log(target);

  doEffects({ G, ctx }, cardId, "effects", location, target);

  // See if the card can be placed on the board
  if (card.isMinnion && !card.isPlaced) {
    console.log("Placing minion on the board");
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
      console.log("Setting pending battlecry for card:", card.id);
      // Set pending battlecry, DON'T execute onPlace yet
      G.activeBattlecryMinion = {
        cardId: card.id,
        playerId: ctx.currentPlayer,
      };
    } else {
      // Execute onPlace immediately for non-targeted battlecries
      doEffects({ G, ctx }, cardId, "onPlace", location, target);
    }

    G.board[ctx.currentPlayer].push(card);
    recordEvent(G, {
      type: "minionPlaced",
      cardId: card.id,
      playerId: ctx.currentPlayer,
      timestamp: Date.now(),
    });
  }

  if (card.isSpell) {
    recordEvent(G, {
      type: "spellCast",
      cardId: card.id,
      playerId: ctx.currentPlayer,
      timestamp: Date.now(),
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
  target?: TargetValue,
) => {
  const player = G.players[ctx.currentPlayer];
  const card =
    location === "hand"
      ? player.hand.find((c) => c.id === cardId)
      : G.board[ctx.currentPlayer].find((c) => c.id === cardId);
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
          if (location === "board" && target.player !== ctx.currentPlayer) {
            recordEvent(G, {
              type: "attack",
              attackerId: cardId,
              targetId: target.id,
              targetType: target.type === "player" ? "player" : "card",
              targetPlayerId: target.player,
              attackerPlayerId: ctx.currentPlayer,
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
                    playerId: ctx.currentPlayer,
                    value: damageEnemy,
                    timestamp: Date.now(),
                  });

                  card.health -= damageEnemy;
                  if (card.health <= 0) {
                    // Record death event
                    recordEvent(G, {
                      type: "death",
                      cardId: card.id,
                      playerId: ctx.currentPlayer,
                      timestamp: Date.now(),
                    });

                    // Remove the card from the board immediately
                    G.board[ctx.currentPlayer] = G.board[
                      ctx.currentPlayer
                    ].filter((c) => c.id !== card.id);
                  }
                }
              }
            }
          }
        } else if (effect.target === "self-hero") {
          const currentPlayer = G.players[ctx.currentPlayer];
          currentPlayer.hp -= damage;

          // Record damage event
          recordEvent(G, {
            type: "damage",
            sourceId: cardId,
            targetId: ctx.currentPlayer,
            targetType: "player",
            playerId: ctx.currentPlayer,
            value: damage,
            timestamp: Date.now(),
          });
        } else if (effect.target === "enemy-hero") {
          const enemyPlayerId = ctx.currentPlayer === "0" ? "1" : "0";
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
          const currentPlayer = G.players[ctx.currentPlayer];

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
              targetId: ctx.currentPlayer,
              targetType: "player",
              playerId: ctx.currentPlayer,
              value: heroActualHeal,
              timestamp: Date.now(),
            });
          }

          // Heal all friendly minions
          G.board[ctx.currentPlayer].forEach((c) => {
            if (c.health !== undefined && c.maxHealth !== undefined) {
              const actualHeal = Math.min(effect.value, c.maxHealth - c.health);
              c.health = Math.min(c.health + effect.value, c.maxHealth);
              if (actualHeal > 0) {
                recordEvent(G, {
                  type: "heal",
                  sourceId: cardId,
                  targetId: c.id,
                  targetType: "card",
                  playerId: ctx.currentPlayer,
                  value: actualHeal,
                  timestamp: Date.now(),
                });
              }
            }
          });
        } else if (effect.target === "friendly-hero") {
          // Heal only friendly hero
          const currentPlayer = G.players[ctx.currentPlayer];
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
              targetId: ctx.currentPlayer,
              targetType: "player",
              playerId: ctx.currentPlayer,
              value: actualHeal,
              timestamp: Date.now(),
            });
          }
        } else if (effect.target === "friendly-board") {
          // Heal only friendly minions
          G.board[ctx.currentPlayer].forEach((c) => {
            if (c.health !== undefined && c.maxHealth !== undefined) {
              const actualHeal = Math.min(effect.value, c.maxHealth - c.health);
              c.health = Math.min(c.health + effect.value, c.maxHealth);
              if (actualHeal > 0) {
                recordEvent(G, {
                  type: "heal",
                  sourceId: cardId,
                  targetId: c.id,
                  targetType: "card",
                  playerId: ctx.currentPlayer,
                  value: actualHeal,
                  timestamp: Date.now(),
                });
              }
            }
          });
        } else if (effect.target === "self-hero") {
          // Heal own hero
          const currentPlayer = G.players[ctx.currentPlayer];
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
              targetId: ctx.currentPlayer,
              targetType: "player",
              playerId: ctx.currentPlayer,
              value: actualHeal,
              timestamp: Date.now(),
            });
          }
        }
        break;
      case "mana":
        // increment current   player's mana
        G.players[ctx.currentPlayer].mana += effect.value;
        break;
      case "changeKey":
        if (target && effect.target == "other") {
          if (target.type === "card") {
            const targetCard = G.board[target.player].find(
              (c) => c.id === target.id,
            );
            console.log(effect.key);
            if (targetCard) {
              // @ts-ignore
              targetCard[effect.key] = effect.value;
            }
          }
        } else if (effect.target == "self") {
          console.log("Changing key on self card:");
          if (card[effect.key] !== undefined) {
            // @ts-ignore
            card[effect.key] = effect.value;
          }
        }
        break;
      case "summon":
        const summonedCard = createCardFromID(effect.cardID as CardTemplateKey);
        if (summonedCard) {
          summonedCard.isPlaced = true; // Mark the summoned card as placed
          summonedCard.hasAttacked = true; // Reset attack status for summoned cards
          summonedCard.summoningSickness = true; // Summoned minions have summoning sickness
          // check if the board can fit the summoned card
          if (G.board[ctx.currentPlayer].length >= 7) {
            console.warn("Cannot summon more than 7 cards on the board");
            break; // Cannot summon more than 7 cards on the board
          }
          G.board[ctx.currentPlayer].push(summonedCard);
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
  console.log("Canceling battlecry");
  G.activeBattlecryMinion = null;
};

const drawCard: Move<GameState> = ({ G, ctx }) => {
  handleDrawCard(G, ctx);
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

export const HeathStoneGame: Game<GameState> = {
  name: "hearthstone",
  setup: setupData,
  phases: {
    setDeck: {
      start: true,
      moves: {
        setDeck({ G, ctx }, playerID: PlayerID, deck: Record<string, number>) {
          const player = G.players[playerID];
          if (player) {
            const finalDeck: Card[] = [];
            for (const cardId in deck) {
              const count = deck[cardId];
              for (let i = 0; i < count; i++) {
                const card = createCardFromID(cardId as CardTemplateKey);
                if (card) {
                  finalDeck.push(card);
                } else {
                  console.warn(`Card with ID ${cardId} not found.`);
                }
              }
            }
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
      moves: { drawCard, placeCard, cancelBattlecry },
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
      console.log("Ending turn, clearing last move metadata");
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
