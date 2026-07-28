export const backgroundImage = "assets/collection/collection.jpg";
export const sheet = "assets/collection/sheet.jpg";
export const manaCrystal = "assets/mana.png";

/** 2 rows × 4 columns in the collection grid. */
export const CARDS_PER_PAGE = 8;

/** Mana filter buckets under the collection; 7 means "7+". */
export const MANA_BUCKETS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

/** "viewer" lists the player's decks; "card-select" is the deck editor. */
export type Mode = "viewer" | "card-select";

/** Shared styling for the chunky wooden buttons down the right-hand side. */
export const woodButtonClass =
  "relative bg-[#bda393] rounded-lg border-[0.3vw] border-[#8d7037] shadow-[0_0.4vw_0_rgba(92,64,51,1),0_0.6vw_1.5vw_rgba(0,0,0,0.6),inset_0_0.2vw_0_rgba(255,255,255,0.3)] transition-all duration-200 hover:translate-y-[0.15vw] hover:shadow-[0_0.2vw_0_rgba(92,64,51,1),0_0.4vw_1vw_rgba(0,0,0,0.6)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100";

export const woodButtonLabelClass =
  "font-bold text-stone-800 drop-shadow-[0_0.1vw_0.1vw_rgba(255,255,255,0.3)]";
