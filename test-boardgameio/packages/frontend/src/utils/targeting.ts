// Pointer hit-testing and target geometry for the targeting arrow, shared by
// TargetingLayer (all aiming), the attack-lunge animations, and anything that
// needs the on-screen centre of a card or hero.
//
// Heroes are found by geometry (their bounding box), because the health bar
// and portrait overlap and elementFromPoint returns whichever is on top;
// cards fall back to elementFromPoint + a [data-card-id] ancestor.

/** The hero whose bounds contain this point, if any. */
export function playerAtPoint(clientX: number, clientY: number): string | null {
  const playerElements = document.querySelectorAll(
    '[data-player-bounds="true"]',
  );
  for (const el of playerElements) {
    const rect = el.getBoundingClientRect();
    const isInsideX = clientX >= rect.left && clientX <= rect.right;
    const isInsideY = clientY >= rect.top && clientY <= rect.bottom;
    if (isInsideX && isInsideY) {
      return el.getAttribute("data-player-id");
    }
  }
  return null;
}

/** The character under the pointer — hero first, then card. */
export function targetAtPoint(
  clientX: number,
  clientY: number,
): { targetPlayerId: string | null; targetCardId: string | null } {
  const targetPlayerId = playerAtPoint(clientX, clientY);
  if (targetPlayerId) return { targetPlayerId, targetCardId: null };

  const element = document.elementFromPoint(clientX, clientY);
  const targetCardId =
    element?.closest("[data-card-id]")?.getAttribute("data-card-id") || null;
  return { targetPlayerId: null, targetCardId };
}

/** On-screen centre of an element, or null if there isn't one. */
export function centerOf(
  el: Element | null | undefined,
): { x: number; y: number } | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * The element representing a card or hero.
 *
 * NOTE: deliberately querySelector (FIRST match), not querySelectorAll. Heroes
 * carry data-player-id twice — the outer animated wrapper and the inner
 * transparent hitbox layered over it (see HeroSection) — and every caller
 * wants the outer wrapper, which comes first in document order.
 */
export function targetElement(
  id: string,
  type: "card" | "player",
): HTMLElement | null {
  const selector =
    type === "card" ? `[data-card-id="${id}"]` : `[data-player-id="${id}"]`;
  return document.querySelector<HTMLElement>(selector);
}

/** On-screen centre of a card or hero by id. */
export function centerOfTarget(id: string, type: "card" | "player") {
  return centerOf(targetElement(id, type));
}

/**
 * Attacker -> target offset driving the attack lunge keyframes. Returns
 * {0, 0} if either end can't be measured, so the animation degrades to an
 * in-place bounce rather than flinging the card to the corner.
 */
export function lungeDelta(
  attackerEl: Element | null | undefined,
  targetId: string,
  targetType: "card" | "player",
): { x: number; y: number } {
  const from = centerOf(attackerEl);
  const to = centerOfTarget(targetId, targetType);
  if (!from || !to) return { x: 0, y: 0 };
  return { x: to.x - from.x, y: to.y - from.y };
}
