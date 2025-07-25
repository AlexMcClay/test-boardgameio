import Board from "@/components/Board";
import { Client } from "boardgame.io/react";

import type { GameState, Player } from "@/types";
import { createCardFromID, createDeck, shuffleDeck } from "@/utils";
import type { Ctx, Game, Move, PlayerID } from "boardgame.io";
import { warriorDeck } from "@/utils/decks";

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
    name: "Arthas",
    heroPortrait: "src/assets/Arthas.jpg", // Optional, if you want to display a hero portrait
    maxHp: 30,
    hp: 30,
    maxArmor: 0,
    armor: 0,
    mana: 10,
    hand: [],
    deck: shuffleDeck(warriorDeck()),
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

    // Minions must be placed on the board and not directly targeted
    if (!card.isPlaced && card.isMinnion && target) {
        console.warn("Minions must be placed on the board");
        return;
    }

    // Board limit for minions
    if (
        !card.isPlaced && card.isMinnion &&
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
    if (target && card.targets.length > 0) {
        let valid = false;
        for (const t of card.targets) {
            switch (t) {
                case "card":
                    if (target.type === "card") {
                        valid = true;
                        break;
                    }
                    break;
                case "player":
                    if (target.type === "player") {
                        valid = true;
                        break;
                    }
                    break;
                case "card-friendly":
                    if (
                        target.type === "card" &&
                        target.player === ctx.currentPlayer
                    ) {
                        valid = true;
                        break;
                    }
                    break;
                case "card-opponent":
                    if (
                        target.type === "card" &&
                        target.player !== ctx.currentPlayer
                    ) {
                        valid = true;
                        break;
                    }
                    break;
                case "player-friendly":
                    if (
                        target.type === "player" &&
                        target.player === ctx.currentPlayer
                    ) {
                        valid = true;
                        break;
                    }
                    break;
                case "player-opponent":
                    if (
                        target.type === "player" &&
                        target.player !== ctx.currentPlayer
                    ) {
                        valid = true;
                        break;
                    }
                    break;
            }
        }
        if (!valid) {
            console.warn("Invalid target for the card");
            return; // Invalid target for the card
        }
    }

    player.mana -= !card.isPlaced ? card.mana || 0 : 0; // Deduct mana cost

    if (
        card.isPlaced && card.hasAttacked
    ) {
        console.warn("Card has already attacked this turn");
        return; // Card has already attacked this turn
    }

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
    { G, ctx }: {
        G: GameState;
        ctx: Ctx;
    },
    cardId: string,
    key: "effects" | "onPlace" = "effects",
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

    card[key].forEach((effect) => {
        switch (effect.type) {
            case "damage":
                if (target && effect.target === "user-select") {
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
                } else if (effect.target === "self-hero") {
                    const currentPlayer = G.players[ctx.currentPlayer];
                    currentPlayer.hp -= effect.value;
                } else if (effect.target === "enemy-hero") {
                    const enemyPlayer = G.players[
                        ctx.currentPlayer === "0" ? "1" : "0"
                    ];
                    enemyPlayer.hp -= effect.value;
                }
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
    moves: { drawCard, placeCard },
    turn: {
        onBegin: ({ G, ctx }) => {
            // Reset mana at the start of each turn
            // Draw a card at the start of the turn
            if (ctx.turn % 2) {
                G.maxMana = Math.min(G.maxMana + 1, 10);
            }
            G.players[ctx.currentPlayer].mana = G.maxMana;
            if (ctx.turn > 1) {
                handleDrawCard(G, ctx);
            } else {
                // Draw 3 cards for the first turn
                for (let i = 0; i < 5; i++) {
                    handleDrawCard(G, ctx, "0");
                    handleDrawCard(G, ctx, "1");
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
