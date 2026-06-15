import type {
  CollisionDetection,
  DroppableContainer,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { pointerWithin } from "@dnd-kit/core";

/**
 * Custom collision detection that uses pointer position with a small buffer zone
 * instead of the dragged element's bounding box. This solves issues when the
 * dragged element is scaled (e.g., 200% on hover) and causes poor drop detection.
 *
 * @param bufferSize - Size of the buffer zone around the pointer in pixels (default: 30)
 * @returns A collision detection function for DND-Kit
 */
export const createPointerWithBuffer = (
  bufferSize: number = 30,
): CollisionDetection => {
  return (args) => {
    const { pointerCoordinates, droppableContainers } = args;

    // If no pointer coordinates, fall back to standard pointerWithin
    if (!pointerCoordinates) {
      return pointerWithin(args);
    }

    // Create a small rectangular collision area around the pointer
    const { x, y } = pointerCoordinates;
    const halfBuffer = bufferSize / 2;

    const pointerRect = {
      top: y - halfBuffer,
      left: x - halfBuffer,
      right: x + halfBuffer,
      bottom: y + halfBuffer,
      width: bufferSize,
      height: bufferSize,
    };

    // Find all droppable containers that intersect with the pointer buffer zone
    const collisions: Array<{
      id: UniqueIdentifier;
      data: { droppableContainer: DroppableContainer; value: number };
    }> = [];

    for (const droppableContainer of droppableContainers) {
      const { id, rect } = droppableContainer;

      if (!rect.current) {
        continue;
      }

      const droppableRect = rect.current;

      // Check if pointer buffer intersects with droppable element
      const intersects =
        pointerRect.right >= droppableRect.left &&
        pointerRect.left <= droppableRect.right &&
        pointerRect.bottom >= droppableRect.top &&
        pointerRect.top <= droppableRect.bottom;

      if (intersects) {
        // Calculate distance from pointer to droppable center for sorting
        const droppableCenterX = droppableRect.left + droppableRect.width / 2;
        const droppableCenterY = droppableRect.top + droppableRect.height / 2;
        const distance = Math.sqrt(
          Math.pow(x - droppableCenterX, 2) + Math.pow(y - droppableCenterY, 2),
        );

        collisions.push({
          id,
          data: {
            droppableContainer,
            value: distance, // Lower distance = higher priority
          },
        });
      }
    }

    // Sort by distance (closest first) and return the best match
    collisions.sort((a, b) => a.data.value - b.data.value);

    // Return the first (closest) collision
    return collisions.length > 0 ? [collisions[0]] : [];
  };
};

/**
 * Default collision detection with a 30px buffer around the pointer
 */
export const pointerWithSmallBuffer = createPointerWithBuffer(30);

/**
 * Collision detection with a larger 50px buffer for easier targeting
 */
export const pointerWithLargeBuffer = createPointerWithBuffer(50);
