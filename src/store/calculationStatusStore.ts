import { create } from "zustand";

/**
 * Formula calculation execution metrics for a single formula
 */
export interface CalculationMetrics {
  formulaId: string;
  totalTime: number; // Total execution time for all calculated rows (ms)
  averageTime: number; // Average execution time per calculated row (ms)
  calculatedRows: number; // Number of rows that have been calculated
  totalRows: number; // Total number of rows in the data sheet
  lastUpdated: number; // Timestamp of last update
}

/**
 * Global calculation status store
 * Manages execution time data across all formula datasheets
 */
interface CalculationStatusStore {
  // State - map of formulaId to calculation metrics
  metrics: Map<string, CalculationMetrics>;

  // Getters
  getMetrics: (formulaId: string) => CalculationMetrics | undefined;
  getAllMetrics: () => Map<string, CalculationMetrics>;

  // Actions
  updateMetrics: (formulaId: string, data: {
    totalTime: number;
    averageTime: number;
    calculatedRows: number;
    totalRows: number;
  }) => void;

  // Remove metrics for a formula (when formula is deleted/removed)
  removeMetrics: (formulaId: string) => void;

  // Clear all metrics
  clearAllMetrics: () => void;
}

export const useCalculationStatusStore = create<CalculationStatusStore>((set, get) => ({
  // Initial state
  metrics: new Map(),

  // Getters
  getMetrics: (formulaId: string) => {
    return get().metrics.get(formulaId);
  },

  getAllMetrics: () => {
    return get().metrics;
  },

  // Actions
  updateMetrics: (formulaId: string, data) => {
    set((state) => {
      const newMetrics = new Map(state.metrics);
      newMetrics.set(formulaId, {
        formulaId,
        ...data,
        lastUpdated: Date.now(),
      });
      return { metrics: newMetrics };
    });
  },

  removeMetrics: (formulaId: string) => {
    set((state) => {
      const newMetrics = new Map(state.metrics);
      newMetrics.delete(formulaId);
      return { metrics: newMetrics };
    });
  },

  clearAllMetrics: () => {
    set({ metrics: new Map() });
  },
}));