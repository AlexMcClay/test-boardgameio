import Board from "@/components/Board";
import { Client } from "boardgame.io/react";

import type { Card, GameState, Player, TargetValue } from "@/types";
import { createCardFromID, createDeck, shuffleDeck } from "@/utils";
import type { Ctx, Game, Move, PlayerID } from "boardgame.io";
import { druidDeck, warriorDeck } from "@/utils/decks";
import { handleValidTarget } from "./handleValidTarget";

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
    };

    return G;
};

const p0: Player = {
    id: "0",
    name: "Arthas",
    heroPortrait: "src/assets/Arthas.jpg", // Optional, if you want to display a hero portrait
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
    heroPortrait: "src/assets/Illidan_Stormrage.jpg", // Optional, if you want to display a hero portrait
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
    const player = G.players[ctx.currentPlayer];
    const card = location === "hand"
        ? player.hand.find((c) => c.id === cardId)
        : G.board[ctx.currentPlayer].find((c) => c.id === cardId);

    if (!card) {
        console.warn("Card not found in the specified location");
        return; // Card not found in the specified location
    }

    // Minions must be placed on the board and not directly targeted
    if (!card.isPlaced && card.isMinnion && target && target.type !== "lane") {
        console.warn("Minions must be placed on the board");
        return;
    }

    // Board limit for minions
    if (
        !card.isPlaced &&
        card.isMinnion &&
        G.board[ctx.currentPlayer].length >= 7
    ) {
        console.warn("Cannot place more than 7 cards on the board");
        return;
    }

    // Mana check for unplaced cards
    if (!card.isPlaced && player.mana < (card.mana || 0)) {
        console.warn("Not enough mana to play the card");
        return;
    }

    // Spell cards with required targets
    if (card.isSpell && card.targets.length > 0 && !target) {
        console.warn("Spell cards require a target");
        return;
    }

    // check if valid target is provided
    if (target && target.type !== "lane" && card.targets.length > 0) {
        let valid = handleValidTarget(ctx, card, target);

        if (!valid) {
            console.warn("Invalid target for the card");
            return; // Invalid target for the card
        }
    }

    player.mana -= !card.isPlaced ? card.mana || 0 : 0; // Deduct mana cost

    if (card.isPlaced && card.hasAttacked) {
        console.warn("Card has already attacked this turn");
        return; // Card has already attacked this turn
    }

    console.log(target);

    doEffects({ G, ctx }, cardId, "effects", location, target);

    // See if the card can be placed on the board
    if (card.isMinnion && !card.isPlaced) {
        console.log("Placing minion on the board");
        card.isPlaced = true; // Mark the card as placed
        card.hasAttacked = true;
        doEffects({ G, ctx }, cardId, "onPlace", location, target);
        G.board[ctx.currentPlayer].push(card);
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
    const card = location === "hand"
        ? player.hand.find((c) => c.id === cardId)
        : G.board[ctx.currentPlayer].find((c) => c.id === cardId);
    if (!card) {
        console.warn("Card not found in the specified location");
        return; // Card not found in the specified location
    }

    if (card.isPlaced) {
        card.hasAttacked = true; // Mark the card as having attacked
    }

    card[key].forEach((effect) => {
        switch (effect.type) {
            case "damage":
                const damage = typeof effect.value === "string"
                    ? (card[effect.value] as number)
                    : effect.value;
                if (target && effect.target === "user-select") {
                    const targetPlayer = G.players[target.player];
                    if (target.type === "player") {
                        targetPlayer.hp -= damage;
                    }
                    // Minion Attack
                    if (target.type === "card") {
                        const targetCard = G.board[target.player].find(
                            (c) => c.id === target.id,
                        );
                        if (targetCard && targetCard.health) {
                            targetCard.health -= damage;
                            if (targetCard.health <= 0) {
                                // Remove the card from the board if it has no HP left
                                G.board[target.player] = G.board[target.player]
                                    .filter(
                                        (c) => c.id !== targetCard.id,
                                    );
                            }
                            // check damage to self card
                            const damageEnemy = typeof effect.value === "string"
                                ? (card[effect.value] as number)
                                : effect.value;
                            if (card.health) {
                                card.health -= damageEnemy;
                                if (card.health <= 0) {
                                    // Remove the card from the board if it has no HP left
                                    G.board[ctx.currentPlayer] = G.board[
                                        ctx.currentPlayer
                                    ].filter((c) => c.id !== card.id);
                                }
                            }
                        }
                    }
                } else if (effect.target === "self-hero") {
                    const currentPlayer = G.players[ctx.currentPlayer];
                    currentPlayer.hp -= damage;
                } else if (effect.target === "enemy-hero") {
                    const enemyPlayer =
                        G.players[ctx.currentPlayer === "0" ? "1" : "0"];
                    enemyPlayer.hp -= damage;
                }
                break;
            case "incrementValue":
                if (target && effect.target === "other") {
                    if (target.type === "card") {
                        const targetCard = G.board[target.player].find(
                            (c) => c.id === target.id,
                        );
                        if (
                            targetCard && targetCard[effect.key] !== undefined
                        ) {
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
                if (target) {
                    if (target.type === "player") {
                        G.players[target.player].hp += effect.value;
                    }
                    if (target.type === "card") {
                        const targetCard = G.board[target.player].find(
                            (c) => c.id === target.id,
                        );
                        if (targetCard && targetCard.health) {
                            targetCard.health += effect.value;
                        }
                    }
                    if (target.type === "lane") {
                        // all cards in the lane are healed
                        G.board[target.player].forEach((c) => {
                            if (c.health) {
                                c.health += effect.value;
                            }
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
                        if (
                            targetCard && targetCard[effect.key] !== undefined
                        ) {
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
                const summonedCard = createCardFromID(effect.cardID);
                if (summonedCard) {
                    summonedCard.isPlaced = true; // Mark the summoned card as placed
                    summonedCard.hasAttacked = true; // Reset attack status for summoned cards
                    // check if the board can fit the summoned card
                    if (G.board[ctx.currentPlayer].length >= 7) {
                        console.warn(
                            "Cannot summon more than 7 cards on the board",
                        );
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
                setDeck(
                    { G, ctx },
                    playerID: PlayerID,
                    deck: Record<string, number>,
                ) {
                    const player = G.players[playerID];
                    if (player) {
                        const finalDeck: Card[] = [];
                        for (const cardId in deck) {
                            const count = deck[cardId];
                            for (let i = 0; i < count; i++) {
                                const card = createCardFromID(cardId);
                                if (card) {
                                    finalDeck.push(card);
                                } else {
                                    console.warn(
                                        `Card with ID ${cardId} not found.`,
                                    );
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
                return (
                    G.players["0"].deck.length > 0 &&
                    G.players["1"].deck.length > 0
                );
            },
        },
        playGame: {
            moves: { drawCard, placeCard },
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
