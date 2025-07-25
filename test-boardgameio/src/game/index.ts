import Board from "@/components/Board";
import { Client } from "boardgame.io/react";

import type { GameState, Player } from "@/types";
import { createDeck } from "@/utils";
import type { Ctx, Game, Move, PlayerID } from "boardgame.io";

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
        maxMana: 9,
    };
    return G;
};

const p0: Player = {
    id: "0",
    name: "Player 1",
    maxHp: 30,
    hp: 30,
    maxArmor: 0,
    armor: 0,
    mana: 10,
    hand: createDeck(5),
    deck: createDeck(20),
};

const p1: Player = {
    id: "1",
    name: "Player 2",
    maxHp: 30,
    hp: 30,
    maxArmor: 0,
    armor: 0,
    mana: 10,
    hand: createDeck(5),
    deck: createDeck(20),
};

const placeCard: Move<GameState> = (
    { G, ctx },
    cardId: string,
    location: "hand" | "board" = "hand",
    target?: {
        type: "card" | "player";
        id: string;
        player: PlayerID;
    },
) => {
    const player = G.players[ctx.currentPlayer];
    const card = location === "hand"
        ? player.hand.find((c) => c.id === cardId)
        : G.board[ctx.currentPlayer].find((c) => c.id === cardId);

    if (!card) {
        console.warn("Card not found in the specified location");
        return; // Card not found in the specified location
    }

    if ((player.mana < (card.mana || 0)) && !card.isPlaced) {
        console.warn("Not enough mana to play the card");
        return; // Not enough mana to play the card
    } // Not enough mana to play the card

    if (card.isSpell && !target && card.targets.length > 0) {
        console.warn("Spell cards require a target");
        return; // Spell cards require a target
    }

    player.mana -= !card.isPlaced ? card.mana || 0 : 0; // Deduct mana cost

    if (
        card.isPlaced && card.hasAttacked
    ) {
        console.warn("Card has already attacked this turn");
        return; // Card has already attacked this turn
    }

    // See if the card can be placed on the board
    if (!card.isSpell && !card.isPlaced) {
        card.hasAttacked = false;
        card.isPlaced = true; // Mark the card as placed
        G.board[ctx.currentPlayer].push(card);
    }

    console.log("Game state after placing card:", G);

    doEffects({ G, ctx }, cardId, location, target);

    if (location === "hand") {
        const cardIndex = player.hand.findIndex((c) => c.id === cardId);
        player.hand.splice(cardIndex, 1); // Remove the card from hand
    }
};

const doEffects = (
    { G, ctx }: {
        G: GameState;
        ctx: Ctx;
    },
    cardId: string,
    location: "hand" | "board",
    target?: {
        type: "card" | "player";
        id: string;
        player: PlayerID;
    },
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

    card.effects.forEach((effect) => {
        switch (effect.type) {
            case "damage":
                if (target) {
                    const targetPlayer = G.players[target.player];
                    if (target.type === "player") {
                        targetPlayer.hp -= effect.value;
                    }
                    if (target.type === "card") {
                        const targetCard = G.board[target.player].find(
                            (c) => c.id === target.id,
                        );
                        if (targetCard && targetCard.health) {
                            targetCard.health -= effect.value;
                            if (targetCard.health <= 0) {
                                // Remove the card from the board if it has no HP left
                                G.board[target.player] = G.board[
                                    target.player
                                ].filter((c) => c.id !== targetCard.id);
                            }
                        }
                    }
                }
                break;
            case "changeKey":
                if (target) {
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

function handleDrawCard(G: GameState, ctx: Ctx) {
    const player = G.players[ctx.currentPlayer];
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
    moves: { drawCard, placeCard },
    turn: {
        onBegin: ({ G, ctx }) => {
            // Reset mana at the start of each turn
            // Draw a card at the start of the turn
            if (ctx.turn % 2) {
                G.maxMana = G.maxMana + 1;
            }
            G.players[ctx.currentPlayer].mana = G.maxMana;
            if (ctx.turn > 1) {
                handleDrawCard(G, ctx);
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
});
