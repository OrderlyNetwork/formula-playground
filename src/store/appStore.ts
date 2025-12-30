import { create } from "zustand";
import { useMatch } from "react-router";
import { useEffect } from "react";
import type { VersionConfig, VersionConfigFile } from "../types/version";
import {
  loadVersionConfig,
  getDefaultVersion,
  getVersionById,
} from "../services/versionConfigService";

export type AppMode = "playground" | "development";

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

  // Version configuration management
  versionConfigs: VersionConfigFile | null;
  currentVersionConfig: VersionConfig | null;
  isLoadingVersionConfigs: boolean;

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

  // Version configuration actions
  loadVersionConfigs: () => Promise<void>;
  setCurrentVersion: (versionId: string) => void;
  setVersionConfigs: (configs: VersionConfigFile) => void;
  setCurrentVersionConfig: (config: VersionConfig | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  mode: "playground",
  showCodeInput: false,

  // New initial states
  datasheetSidebarOpen: true,
  playgroundActivePanel: "formulas",
  datasheetActivePanel: "tables",

  // Adapter info initial state
  adapterVersion: null,
  adapterName: null,

  // Version configuration initial state
  versionConfigs: null,
  currentVersionConfig: null,
  isLoadingVersionConfigs: false,

  // Existing actions
  setMode: (mode: AppMode) => set({ mode }),
  toggleMode: () =>
    set((s) => ({
      mode: s.mode === "playground" ? "development" : "playground",
    })),
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

  // Version configuration actions
  loadVersionConfigs: async () => {
    set({ isLoadingVersionConfigs: true });
    try {

      const config = await loadVersionConfig();
      const defaultVersion = getDefaultVersion(config);
      set({
        versionConfigs: config,
        currentVersionConfig: defaultVersion || null,
        isLoadingVersionConfigs: false,
      });
      // Update adapter info based on default version
      if (defaultVersion) {
        const { setAdapterInfo } = useAppStore.getState();
        setAdapterInfo(
          defaultVersion.packageName || "SDK",
          defaultVersion.version
        );
      }
    } catch (error) {
      console.error("Failed to load version configs:", error);
      set({ isLoadingVersionConfigs: false });
    }
  },

  setCurrentVersion: (versionId: string) => {
    const state = useAppStore.getState();
    if (!state.versionConfigs) return;


    const version = getVersionById(state.versionConfigs, versionId);
    if (version) {
      set({ currentVersionConfig: version });
      // Update adapter info
      const { setAdapterInfo } = useAppStore.getState();
      setAdapterInfo(version.packageName || "SDK", version.version);
    }
  },

  setVersionConfigs: (configs: VersionConfigFile) =>
    set({ versionConfigs: configs }),

  setCurrentVersionConfig: (config: VersionConfig | null) =>
    set({ currentVersionConfig: config }),
}));

/**
 * Hook to sync app mode with router path
 * This should be used in components that have access to router context
 */
export const useSyncModeWithRouter = () => {
  const devMatch = useMatch("/dev/*");
  const { mode, setMode } = useAppStore();

  // Derive mode from route match
  const newMode: AppMode = devMatch ? "development" : "playground";

  // Update app store mode when route match changes, but only if different
  useEffect(() => {
    if (newMode !== mode) {
      setMode(newMode);
    }
  }, [newMode, mode, setMode]);

  return mode;
};
