import { create } from "zustand";

type View = "main-menu" | "collection" | "play";

interface ViewState {
  currentView: View;
  setView: (view: View) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: "main-menu",
  setView: (view) => set({ currentView: view }),
}));
