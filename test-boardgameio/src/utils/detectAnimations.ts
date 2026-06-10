// Utility to detect animation events by comparing game states
import type { GameState, MoveMetadata } from "@/types";
import type {
  AttackAnimation,
  DeathAnimation,
  AnimationEvent,
} from "@/types/animations";
import type { PlayerID } from "boardgame.io";

/**
 * Compares two game states and detects which cards died
 * @param stateBefore - Game state before the move
 * @param stateAfter - Game state after the move
 * @returns Array of death animations for cards that were removed
 */
export function detectDeaths(
  stateBefore: GameState,
  stateAfter: GameState,
): DeathAnimation[] {
  const deaths: DeathAnimation[] = [];

  // Check both players' boards
  (["0", "1"] as PlayerID[]).forEach((playerId) => {
    const boardBefore = stateBefore.board[playerId];
    const boardAfter = stateAfter.board[playerId];

    // Find cards that existed before but not after OR are marked as dying
    boardBefore.forEach((card) => {
      const stillExists = boardAfter.some((c) => c.id === card.id);
      const isDying = stateAfter.dyingCards.includes(card.id);

      // Card died if it no longer exists OR is marked for death
      if (!stillExists || isDying) {
        // Only add if not already in deaths array
        if (!deaths.some((d) => d.cardId === card.id)) {
          deaths.push({
            type: "death",
            cardId: card.id,
            playerId,
            startTime: 0, // Default, will be overridden by detectAllAnimations
            duration: 300, // Default duration
          });
        }
      }
    });
  });

  return deaths;
}

/**
 * Detects attack animations by analyzing move metadata and state changes
 * @param stateBefore - Game state before the move
 * @param stateAfter - Game state after the move
 * @param lastMove - Metadata about the last move
 * @param currentPlayer - The player who made the move
 * @returns Array of attack animations if an attack occurred
 */
export function detectAttacks(
  stateBefore: GameState,
  stateAfter: GameState,
  lastMove: MoveMetadata | undefined,
  currentPlayer: PlayerID,
): AttackAnimation[] {
  const attacks: AttackAnimation[] = [];

  // Early exit conditions - not an attack if:
  // 1. No move metadata
  // 2. Card played from hand (not already on board)
  // 3. No target specified
  if (!lastMove || lastMove.location !== "board" || !lastMove.target) {
    return attacks;
  }

  const target = lastMove.target;

  // Don't animate attacks on friendly targets (e.g., charge spell, buff spell)
  if (target.player === currentPlayer) {
    return attacks;
  }

  // Verify damage was actually dealt to confirm this was an attack
  let damageDealt = false;

  if (target.type === "player") {
    // Check if player HP decreased
    const hpBefore = stateBefore.players[target.player].hp;
    const hpAfter = stateAfter.players[target.player].hp;
    damageDealt = hpAfter < hpBefore;
  } else if (target.type === "card") {
    // Check if target card's health decreased or was removed
    const cardBefore = stateBefore.board[target.player].find(
      (c) => c.id === target.id,
    );
    const cardAfter = stateAfter.board[target.player].find(
      (c) => c.id === target.id,
    );

    if (cardBefore && cardBefore.health !== undefined) {
      // Card was removed (health reached 0) or health decreased
      damageDealt =
        !cardAfter ||
        (cardAfter.health !== undefined &&
          cardAfter.health < cardBefore.health);
    }
  }

  // Only create attack animation if damage was confirmed
  if (damageDealt) {
    attacks.push({
      type: "attack",
      attackerId: lastMove.cardId,
      targetId: target.id,
      targetType: target.type === "player" ? "player" : "card",
      targetPlayerId: target.player,
      attackerPlayerId: currentPlayer,
      startTime: 0, // Default, will be overridden by detectAllAnimations
      duration: 400, // Default duration
    });
  }

  return attacks;
}

/**
 * Detects all animations by comparing game states
 * @param stateBefore - Game state before the move
 * @param stateAfter - Game state after the move
 * @param currentPlayer - The player who made the move
 * @returns Array of all detected animation events with timeline positions
 */
export function detectAllAnimations(
  stateBefore: GameState,
  stateAfter: GameState,
  currentPlayer: PlayerID,
): AnimationEvent[] {
  const animations: AnimationEvent[] = [];

  // Detect attacks first (they happen before deaths)
  const attacks = detectAttacks(
    stateBefore,
    stateAfter,
    stateAfter.lastMove,
    currentPlayer,
  );

  // Detect deaths
  const deaths = detectDeaths(stateBefore, stateAfter);

  // Timeline-based animation assignment
  if (attacks.length > 0) {
    const attack = attacks[0];

    // Attack starts immediately and lasts 400ms
    attack.startTime = 0;
    attack.duration = 400;
    animations.push(attack);

    deaths.forEach((death) => {
      death.duration = 300; // Death animations last 300ms

      // Target death starts at 200ms (during attack animation, before attacker returns)
      if (death.cardId === attack.targetId) {
        death.startTime = 200;
      }
      // Attacker death (from counterattack) starts at 450ms (after attack fully completes and returns)
      else if (death.cardId === attack.attackerId) {
        death.startTime = 450;
      }
      // Other deaths (e.g., AoE) start immediately
      else {
        death.startTime = 0;
      }
    });

    animations.push(...deaths);
  } else {
    // No attacks, just deaths (e.g., spell damage)
    // All deaths happen immediately
    deaths.forEach((death) => {
      death.startTime = 0;
      death.duration = 300;
    });
    animations.push(...deaths);
  }

  return animations;
}
