import { create } from "zustand";

export type AppMode = "normal" | "developer";

export interface AppState {
  // State
  mode: AppMode;
  showCodeInput: boolean;
  codeInput: string;

  // Actions
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  openCodeInput: () => void;
  closeCodeInput: () => void;
  setCodeInput: (code: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  mode: "normal",
  showCodeInput: false,
  codeInput: "",

  // Actions
  setMode: (mode: AppMode) => set({ mode }),
  toggleMode: () =>
    set((s) => ({ mode: s.mode === "normal" ? "developer" : "normal" })),
  openCodeInput: () => set({ showCodeInput: true }),
  closeCodeInput: () => set({ showCodeInput: false }),
  setCodeInput: (code: string) => set({ codeInput: code }),
}));
