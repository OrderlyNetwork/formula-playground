import { create } from "zustand";

export interface PreArgsCheckMessage {
  field: string;
  message: string;
  timestamp: number;
  path?: string; // For nested object paths like "user.profile"
}

export interface PreArgsCheckStatus {
  message: PreArgsCheckMessage | null; // Only store the latest message
  lastUpdated?: number;
}

interface PreArgsCheckState {
  // Map of formulaId to preArgsCheck status
  preArgsCheckStatus: Record<string, PreArgsCheckStatus>;

  // Add/update a preArgsCheck message for a formula (replaces previous message)
  addPreArgsCheckMessage: (
    formulaId: string,
    field: string,
    message: string,
    path?: string
  ) => void;

  // Get the latest preArgsCheck message for a formula
  getPreArgsCheckMessage: (formulaId: string) => PreArgsCheckMessage | null;

  // Get preArgsCheck status for a formula
  getPreArgsCheckStatus: (formulaId: string) => PreArgsCheckStatus | undefined;

  // Clear preArgsCheck message for a formula
  clearPreArgsCheckMessages: (formulaId: string) => void;

  // Clear all preArgsCheck messages
  clearAll: () => void;
}

export const usePreArgsCheckStore = create<PreArgsCheckState>((set, get) => ({
  preArgsCheckStatus: {},

  addPreArgsCheckMessage: (
    formulaId: string,
    field: string,
    message: string,
    path?: string
  ) => {
    const newMessage: PreArgsCheckMessage = {
      field,
      message,
      timestamp: Date.now(),
      path,
    };

    set((state) => {
      return {
        preArgsCheckStatus: {
          ...state.preArgsCheckStatus,
          [formulaId]: {
            message: newMessage, // Replace previous message with new one
            lastUpdated: Date.now(),
          },
        },
      };
    });
  },

  getPreArgsCheckMessage: (formulaId: string) => {
    return get().preArgsCheckStatus[formulaId]?.message || null;
  },

  getPreArgsCheckStatus: (formulaId: string) => {
    return get().preArgsCheckStatus[formulaId];
  },

  clearPreArgsCheckMessages: (formulaId: string) => {
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [formulaId]: _, ...rest } = state.preArgsCheckStatus;
      return { preArgsCheckStatus: rest };
    });
  },

  clearAll: () => {
    set({ preArgsCheckStatus: {} });
  },
}));

/**
 * Helper function to create a parameterized selector for a specific formulaId
 * Usage in components:
 *
 * ```tsx
 * const formulaId = activeTab?.id;
 * const latestMessage = usePreArgsCheckStore(
 *   useMemo(
 *     () => createPreArgsCheckMessageSelector(formulaId),
 *     [formulaId]
 *   )
 * );
 * ```
 *
 * This ensures the component only re-renders when the specific formulaId's
 * message changes, not when other formulaIds' messages change.
 */
export function createPreArgsCheckMessageSelector(
  formulaId: string | undefined
) {
  return (state: PreArgsCheckState) => {
    if (!formulaId) return null;
    return state.preArgsCheckStatus[formulaId]?.message || null;
  };
}
