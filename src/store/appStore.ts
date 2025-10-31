import { create } from "zustand";
import { useMatch } from "react-router";
import { useEffect } from "react";

export type AppMode = "normal" | "developer";

export interface AppState {
  // State
  mode: AppMode;
  showCodeInput: boolean;

  // Actions
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  openCodeInput: () => void;
  closeCodeInput: () => void;

  }

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  mode: "normal",
  showCodeInput: false,

  // Actions
  setMode: (mode: AppMode) => set({ mode }),
  toggleMode: () =>
    set((s) => ({ mode: s.mode === "normal" ? "developer" : "normal" })),
  openCodeInput: () => set({ showCodeInput: true }),
  closeCodeInput: () => set({ showCodeInput: false }),
}));

/**
 * Hook to sync app mode with router path
 * This should be used in components that have access to router context
 */
export const useSyncModeWithRouter = () => {
  const devMatch = useMatch("/dev/*");
  const { mode, setMode } = useAppStore();

  // Derive mode from route match
  const newMode: AppMode = devMatch ? "developer" : "normal";

  // Update app store mode when route match changes, but only if different
  useEffect(() => {
    if (newMode !== mode) {
      setMode(newMode);
    }
  }, [newMode, mode, setMode]);

  return mode;
};
