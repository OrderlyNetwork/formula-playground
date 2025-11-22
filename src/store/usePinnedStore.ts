import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PinnedState {
  pinnedFormulaIds: Set<string>;

  // Actions
  pinFormula: (id: string) => void;
  unpinFormula: (id: string) => void;
  togglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
  getPinnedFormulaIds: () => string[];
  clearAllPinned: () => void;
}

export const usePinnedStore = create<PinnedState>()(
  persist(
    (set, get) => ({
      // Initial state
      pinnedFormulaIds: new Set(),

      // Actions
      pinFormula: (id: string) =>
        set((state) => {
          const newPinnedIds = new Set(state.pinnedFormulaIds);
          newPinnedIds.add(id);
          return { pinnedFormulaIds: newPinnedIds };
        }),

      unpinFormula: (id: string) =>
        set((state) => {
          const newPinnedIds = new Set(state.pinnedFormulaIds);
          newPinnedIds.delete(id);
          return { pinnedFormulaIds: newPinnedIds };
        }),

      togglePin: (id: string) =>
        set((state) => {
          const newPinnedIds = new Set(state.pinnedFormulaIds);
          if (newPinnedIds.has(id)) {
            newPinnedIds.delete(id);
          } else {
            newPinnedIds.add(id);
          }
          return { pinnedFormulaIds: newPinnedIds };
        }),

      isPinned: (id: string) => {
        const state = get();
        return state.pinnedFormulaIds.has(id);
      },

      getPinnedFormulaIds: () => {
        const state = get();
        return Array.from(state.pinnedFormulaIds);
      },

      clearAllPinned: () => {
        set({ pinnedFormulaIds: new Set() });
      },
    }),
    {
      name: "pinned-formulas-storage", // name of the item in localStorage
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Convert array back to Set
          return {
            ...parsed,
            state: {
              ...parsed.state,
              pinnedFormulaIds: new Set(parsed.state.pinnedFormulaIds || []),
            },
          };
        },
        setItem: (name, value) => {
          // Convert Set to array for storage
          const serializedValue = JSON.stringify({
            ...value,
            state: {
              ...value.state,
              pinnedFormulaIds: Array.from(value.state.pinnedFormulaIds),
            },
          });
          localStorage.setItem(name, serializedValue);
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);