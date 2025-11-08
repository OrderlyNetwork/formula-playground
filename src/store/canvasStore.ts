import { create } from "zustand";

/**
 * Canvas mode type
 * - single: Only one formula can exist on canvas at a time, clicking a formula replaces the current one
 * - multi: Multiple formulas can exist on canvas, clicking a formula appends it to the canvas
 */
export type CanvasMode = "single" | "multi";

/**
 * Canvas store for managing canvas state
 * Handles single formula mode (replace) vs multi formula mode (append)
 */
interface CanvasStore {
  // State
  /** Current canvas mode: single formula or multi formula */
  mode: CanvasMode;
  
  /** List of formula IDs currently on the canvas (for multi mode tracking) */
  canvasFormulaIds: string[];
  
  /** Parameters for each formula on canvas (formulaId -> inputs) */
  formulaParams: Record<string, Record<string, unknown>>;

  // Actions
  /** Set canvas mode */
  setMode: (mode: CanvasMode) => void;
  
  /** Toggle between single and multi mode */
  toggleMode: () => void;
  
  /** Add a formula ID to canvas (for multi mode) */
  addFormulaToCanvas: (formulaId: string) => void;
  
  /** Remove a formula ID from canvas (for multi mode) */
  removeFormulaFromCanvas: (formulaId: string) => void;
  
  /** Replace all formulas on canvas with a single formula (for single mode) */
  replaceCanvasFormula: (formulaId: string) => void;
  
  /** Clear all formulas from canvas */
  clearCanvas: () => void;
  
  /** Check if a formula is already on canvas (for multi mode) */
  isFormulaOnCanvas: (formulaId: string) => boolean;
  
  /** Set parameters for a specific formula */
  setFormulaParams: (formulaId: string, params: Record<string, unknown>) => void;
  
  /** Get parameters for a specific formula */
  getFormulaParams: (formulaId: string) => Record<string, unknown> | undefined;
  
  /** Clear parameters for a specific formula */
  clearFormulaParams: (formulaId: string) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  mode: "single",
  canvasFormulaIds: [],
  formulaParams: {},

  // Set canvas mode
  setMode: (mode: CanvasMode) => {
    set({ mode });
    // When switching to single mode, keep only the first formula if any
    if (mode === "single" && get().canvasFormulaIds.length > 1) {
      const firstFormulaId = get().canvasFormulaIds[0];
      const { formulaParams } = get();
      // Keep only the first formula's params
      const newParams = firstFormulaId && formulaParams[firstFormulaId]
        ? { [firstFormulaId]: formulaParams[firstFormulaId] }
        : {};
      set({ 
        canvasFormulaIds: firstFormulaId ? [firstFormulaId] : [],
        formulaParams: newParams
      });
    }
  },

  // Toggle between single and multi mode
  toggleMode: () => {
    const currentMode = get().mode;
    const newMode: CanvasMode = currentMode === "single" ? "multi" : "single";
    get().setMode(newMode);
  },

  // Add a formula ID to canvas (for multi mode)
  addFormulaToCanvas: (formulaId: string) => {
    const { canvasFormulaIds } = get();
    // Avoid duplicates
    if (!canvasFormulaIds.includes(formulaId)) {
      set({ canvasFormulaIds: [...canvasFormulaIds, formulaId] });
    }
  },

  // Remove a formula ID from canvas (for multi mode)
  removeFormulaFromCanvas: (formulaId: string) => {
    const { canvasFormulaIds, formulaParams } = get();
    const newParams = { ...formulaParams };
    delete newParams[formulaId];
    set({
      canvasFormulaIds: canvasFormulaIds.filter((id) => id !== formulaId),
      formulaParams: newParams,
    });
  },

  // Replace all formulas on canvas with a single formula (for single mode)
  replaceCanvasFormula: (formulaId: string) => {
    const { formulaParams } = get();
    // Keep only the new formula's params if it exists
    const newParams = formulaParams[formulaId]
      ? { [formulaId]: formulaParams[formulaId] }
      : {};
    set({ 
      canvasFormulaIds: [formulaId],
      formulaParams: newParams
    });
  },

  // Clear all formulas from canvas
  clearCanvas: () => {
    set({ 
      canvasFormulaIds: [],
      formulaParams: {}
    });
  },

  // Check if a formula is already on canvas (for multi mode)
  isFormulaOnCanvas: (formulaId: string) => {
    return get().canvasFormulaIds.includes(formulaId);
  },
  
  // Set parameters for a specific formula
  setFormulaParams: (formulaId: string, params: Record<string, unknown>) => {
    set((state) => ({
      formulaParams: {
        ...state.formulaParams,
        [formulaId]: params,
      },
    }));
  },
  
  // Get parameters for a specific formula
  getFormulaParams: (formulaId: string) => {
    return get().formulaParams[formulaId];
  },
  
  // Clear parameters for a specific formula
  clearFormulaParams: (formulaId: string) => {
    const { formulaParams } = get();
    const newParams = { ...formulaParams };
    delete newParams[formulaId];
    set({ formulaParams: newParams });
  },
}));

