import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PinnedState {
  pinnedFormulaIds: Set<string>;

  // Actions
  pinFormula: (id: string) => void;
  unpinFormula: (id: string) => void;
  togglePin: (id: string) => void;
  clearAllPinned: () => void;
}

export const usePinnedStore = create<PinnedState>()(
  persist(
    (set) => ({
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

/**
 * Reactive selector: Check if a formula ID is pinned
 * Usage in component: const isPinned = usePinnedStore(selectIsPinned(formulaId));
 */
export const selectIsPinned = (id: string) => (state: PinnedState) =>
  state.pinnedFormulaIds.has(id);

/**
 * Reactive selector: Get all pinned formula IDs as an array
 * Usage in component: const pinnedIds = usePinnedStore(selectPinnedFormulaIds);
 */
export const selectPinnedFormulaIds = (state: PinnedState) =>
  Array.from(state.pinnedFormulaIds);
