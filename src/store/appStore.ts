import { create } from "zustand";
import { useMatch } from "react-router";
import { useEffect } from "react";

export type AppMode = "normal" | "developer";

// Playground Left Panel Categories
export type PlaygroundPanelType =
  | "formulas"
  | "datasource"
  | "history"
  | "settings";

// Datasheet Sidebar Panel Types
export type DatasheetPanelType = "tables" | "favorites" | "history";

export interface AppState {
  // Existing state
  mode: AppMode;
  showCodeInput: boolean;

  // Sidebar state for datasheet
  datasheetSidebarOpen: boolean;

  // Panel state for playground
  playgroundActivePanel: PlaygroundPanelType;

  // Panel state for datasheet
  datasheetActivePanel: DatasheetPanelType;

  // Adapter version for formula execution
  adapterVersion: string | null;
  adapterName: string | null;

  // Existing actions
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  openCodeInput: () => void;
  closeCodeInput: () => void;

  // New sidebar and panel actions
  toggleDatasheetSidebar: () => void;
  setDatasheetSidebarOpen: (open: boolean) => void;

  setPlaygroundActivePanel: (panel: PlaygroundPanelType) => void;

  setDatasheetActivePanel: (panel: DatasheetPanelType) => void;

  // Adapter version actions
  setAdapterInfo: (name: string, version: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  mode: "normal",
  showCodeInput: false,

  // New initial states
  datasheetSidebarOpen: true,
  playgroundActivePanel: "formulas",
  datasheetActivePanel: "tables",

  // Adapter info initial state
  adapterVersion: null,
  adapterName: null,

  // Existing actions
  setMode: (mode: AppMode) => set({ mode }),
  toggleMode: () =>
    set((s) => ({ mode: s.mode === "normal" ? "developer" : "normal" })),
  openCodeInput: () => set({ showCodeInput: true }),
  closeCodeInput: () => set({ showCodeInput: false }),

  // New sidebar and panel actions
  toggleDatasheetSidebar: () =>
    set((s) => ({ datasheetSidebarOpen: !s.datasheetSidebarOpen })),
  setDatasheetSidebarOpen: (open: boolean) =>
    set({ datasheetSidebarOpen: open }),

  setPlaygroundActivePanel: (panel: PlaygroundPanelType) =>
    set({ playgroundActivePanel: panel }),

  setDatasheetActivePanel: (panel: DatasheetPanelType) =>
    set({ datasheetActivePanel: panel }),

  // Adapter version actions
  setAdapterInfo: (name: string, version: string) =>
    set({ adapterName: name, adapterVersion: version }),
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
