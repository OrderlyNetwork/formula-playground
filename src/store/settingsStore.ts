import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Application settings interface
 */
interface AppSettings {
  apiBaseURL: string;
  webSocketBaseURL: string;
}

interface SettingsStore {
  // State
  settings: AppSettings;

  // Actions
  setApiBaseURL: (url: string) => void;
  setWebSocketBaseURL: (url: string) => void;
  resetSettings: () => void;
}

/**
 * Default settings values
 */
const defaultSettings: AppSettings = {
  apiBaseURL: "https://api.orderly.org",
  webSocketBaseURL: "wss://ws-evm.orderly.org",
};

/**
 * Settings store with persistence using localStorage
 * Manages application-wide environment variables and configuration
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Initial state
      settings: defaultSettings,

      // Set API base URL
      setApiBaseURL: (url: string) => {
        set((state) => ({
          settings: {
            ...state.settings,
            apiBaseURL: url.trim(),
          },
        }));
      },

      // Set WebSocket base URL
      setWebSocketBaseURL: (url: string) => {
        set((state) => ({
          settings: {
            ...state.settings,
            webSocketBaseURL: url.trim(),
          },
        }));
      },

      // Reset all settings to defaults
      resetSettings: () => {
        set({ settings: defaultSettings });
      },
    }),
    {
      name: "formula-playground-settings",
      version: 1,
    }
  )
);

