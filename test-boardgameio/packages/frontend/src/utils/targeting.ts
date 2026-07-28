// Pointer hit-testing for the targeting arrow, shared by the per-minion
// targeting in DropDetectCard and the board-level ChoiceTargetingLayer.
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
