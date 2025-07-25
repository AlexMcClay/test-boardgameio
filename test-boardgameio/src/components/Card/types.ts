import type { Card } from "@/types";

export interface CardProps {
    card: Card;
    back?: boolean;
    isDragging?: boolean;
}
