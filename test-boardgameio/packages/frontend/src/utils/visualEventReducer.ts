// Applies a slice of the event log to a visual GameState to produce the
// intermediate board the player should see between resolution steps.
//
// This does NOT need to be a perfect rules engine: the final step of every
// move syncs the visual state to the authoritative post-move state, so any
// event this reducer doesn't model simply resolves one step later. Events
// carry `snapshot` clones of affected entities precisely to make this cheap.
import { getManaCost, spendMana } from "@project/shared";
import type { Card, GameEvent, GameState, Player } from "@project/shared";

function findCardOnBoards(
  state: GameState,
  cardId: string,
): { card: Card; owner: string; index: number } | null {
  for (const owner of Object.keys(state.board)) {
    const index = state.board[owner].findIndex((c) => c.id === cardId);
    if (index !== -1) return { card: state.board[owner][index], owner, index };
  }
  return null;
}

function applyPlayerSnapshot(target: Player, snapshot: Player) {
  target.health = snapshot.health;
  target.armor = snapshot.armor;
  target.frozen = snapshot.frozen;
  target.divineShield = snapshot.divineShield;
  target.immune = snapshot.immune;
  target.attacksLeft = snapshot.attacksLeft;
  target.weapon = snapshot.weapon;
  target.modifiers = snapshot.modifiers;
  target.maxMana = snapshot.maxMana;
  target.manaCap = snapshot.manaCap;
  target.availableMana = snapshot.availableMana;
  target.tempMana = snapshot.tempMana;
  target.overloadPending = snapshot.overloadPending;
  target.overloadLocked = snapshot.overloadLocked;
}

function applyEvent(state: GameState, event: GameEvent) {
  switch (event.type) {
    case "cardPlayed": {
      const player = state.players[event.playerId];
      if (!player) break;
      const index = player.hand.findIndex((c) => c.id === event.cardId);
      if (index !== -1) {
        player.hand.splice(index, 1);
        // Shared helper so replay spends temporary crystals first, exactly as
        // the engine did.
        spendMana(player, getManaCost(event.card));
      }
      break;
    }
    case "minionPlaced": {
      const board = state.board[event.playerId];
      if (board && !board.some((c) => c.id === event.cardId)) {
        board.push(structuredClone(event.card));
      }
      break;
    }
    case "summon": {
      const board = state.board[event.playerId];
      if (board && !board.some((c) => c.id === event.cardId)) {
        board.push(structuredClone(event.card));
      }
      break;
    }
    case "equip": {
      const player = state.players[event.playerId];
      if (player) player.weapon = structuredClone(event.snapshot);
      break;
    }
    case "damage":
    case "heal": {
      if (event.targetType === "player") {
        const player = state.players[event.targetId];
        if (player) applyPlayerSnapshot(player, event.snapshot as Player);
      } else {
        const found = findCardOnBoards(state, event.targetId);
        if (found) {
          state.board[found.owner][found.index] = structuredClone(
            event.snapshot as Card,
          );
        }
      }
      break;
    }
    case "death": {
      const found = findCardOnBoards(state, event.cardId);
      if (found) {
        state.board[found.owner].splice(found.index, 1);
      }
      const player = state.players[event.playerId];
      if (player?.weapon?.id === event.cardId) {
        player.weapon = null; // weapon "death" (broke / was replaced)
      }
      break;
    }
    case "drawCard": {
      const player = state.players[event.playerId];
      if (!player) break;
      const deckIndex = player.deck.findIndex((c) => c.id === event.cardId);
      if (deckIndex !== -1) player.deck.splice(deckIndex, 1);
      else player.deck.pop(); // keep deck count in sync even if id unknown
      if (!player.hand.some((c) => c.id === event.cardId)) {
        player.hand.push(structuredClone(event.snapshot));
      }
      break;
    }
    case "addToHand": {
      const player = state.players[event.playerId];
      if (!player) break;
      if (event.source === "deck") {
        const deckIndex = player.deck.findIndex((c) => c.id === event.cardId);
        if (deckIndex !== -1) player.deck.splice(deckIndex, 1);
      }
      if (!player.hand.some((c) => c.id === event.cardId)) {
        player.hand.push(structuredClone(event.snapshot));
      }
      break;
    }
    case "returnToHand": {
      const found = findCardOnBoards(state, event.cardId);
      if (found) state.board[found.owner].splice(found.index, 1);
      const player = state.players[event.playerId];
      if (player && !player.hand.some((c) => c.id === event.cardId)) {
        player.hand.push(structuredClone(event.snapshot));
      }
      break;
    }
    case "discard": {
      const player = state.players[event.playerId];
      if (!player) break;
      const index = player.hand.findIndex((c) => c.id === event.cardId);
      if (index !== -1) player.hand.splice(index, 1);
      break;
    }
    case "burnCard": {
      const player = state.players[event.playerId];
      if (!player) break;
      player.deck.pop();
      player.burntCards.push(structuredClone(event.card));
      break;
    }
    case "freeze":
    case "divineShield":
    case "taunt":
    case "stealth":
    case "charge":
    case "rush":
    case "windfury":
    case "poisonous":
    case "immune": {
      const key = event.type === "freeze" ? ("frozen" as const) : event.type;
      if (event.targetType === "player") {
        const player = state.players[event.targetId];
        // Only the keywords that mean something on a hero — mirrors
        // PLAYER_BOOL_EFFECTS on the engine side.
        if (
          player &&
          (key === "frozen" || key === "divineShield" || key === "immune")
        ) {
          player[key] = true;
        }
      } else {
        const found = findCardOnBoards(state, event.targetId);
        if (found) found.card[key] = true;
      }
      break;
    }
    case "changeKey": {
      const found = findCardOnBoards(state, event.cardId);
      if (found) {
        (found.card as unknown as Record<string, unknown>)[event.key] =
          event.value;
      }
      break;
    }
    case "durability": {
      const player = state.players[event.playerId];
      if (player?.weapon?.id === event.cardId) {
        player.weapon = structuredClone(event.snapshot);
      }
      break;
    }
    case "mana": {
      // Modeled so The Coin / Innervate light a crystal mid-chain rather than
      // waiting for the end-of-move sync.
      const player = state.players[event.playerId];
      if (player && event.snapshot) applyPlayerSnapshot(player, event.snapshot);
      break;
    }
    // Not modeled: applyModifier, armor, battlecry, heroPower, spell,
    // attack, beginTurn, endTurn, gameEnd, debug. Either purely presentational
    // or too rules-entangled to mirror — the end-of-move sync covers them.
    default:
      break;
  }
}

/** Returns a NEW state: `previous` with `events` applied on top. */
export function applyEventsToVisualState(
  previous: GameState,
  events: GameEvent[],
): GameState {
  const next = structuredClone(previous);
  for (const event of events) {
    applyEvent(next, event);
  }
  return next;
}
