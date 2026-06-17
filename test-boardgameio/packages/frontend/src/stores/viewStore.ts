import { create } from "zustand";

type View = "main-menu" | "collection" | "play";

// Unified types for multiplayer
export type GameMode = "pvp" | "ai";

export type MultiplayerSession = {
  matchID: string;
  playerID: string;
  playerCredentials: string;
};

interface ViewState {
  // View navigation
  currentView: View;
  setView: (view: View) => void;

  // Game state
  gameMode: GameMode | null;
  selectedGameMode: GameMode | null;
  gameKey: number;
  multiplayerSession: MultiplayerSession | null;

  // Game actions
  setGameMode: (mode: GameMode | null) => void;
  setSelectedGameMode: (mode: GameMode | null) => void;
  incrementGameKey: () => void;
  setMultiplayerSession: (session: MultiplayerSession | null) => void;
  startGame: (mode: GameMode, session?: MultiplayerSession) => void;
  resetGame: () => void;
  disconnectFromGame: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  // View navigation
  currentView: "main-menu",
  setView: (view) => set({ currentView: view }),

  // Game state
  gameMode: null,
  selectedGameMode: null,
  gameKey: 0,
  multiplayerSession: null,

  // Game actions
  setGameMode: (mode) => set({ gameMode: mode }),
  setSelectedGameMode: (mode) => set({ selectedGameMode: mode }),

  incrementGameKey: () => set((state) => ({ gameKey: state.gameKey + 1 })),
  setMultiplayerSession: (session) => set({ multiplayerSession: session }),

  startGame: (mode, session) =>
    set((state) => ({
      gameMode: mode,
      multiplayerSession: session ?? null,
      gameKey: state.gameKey + 1,
    })),

  resetGame: () =>
    set({
      gameMode: null,
      multiplayerSession: null,
    }),

  disconnectFromGame: () =>
    set({
      gameMode: null,
      multiplayerSession: null,
      currentView: "play",
    }),
}));
