export interface CardProps {
    id: string;
    title?: string;
    description?: string;
    mana?: number | null;
    attack?: number;
    health?: number;
    type?: string;
    imageUrl?: string;
    scale?: number;
    back?: boolean;
}
