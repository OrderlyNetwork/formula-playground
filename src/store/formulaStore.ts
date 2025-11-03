import { create } from "zustand";
import type { FormulaDefinition } from "../types/formula";
import type { FormulaExecutionResult } from "../types/executor";
import type { RunRecord } from "../types/history";
import { enrichFormulasWithSource } from "../lib/formula-source-loader";
import { BaseFormulaStore } from "./BaseFormulaStore";
import { db } from "../lib/dexie";

/**
 * Normal mode formula store
 * Manages state for normal mode (built-in formulas)
 */
interface FormulaStore {
  // State
  formulaDefinitions: FormulaDefinition[];
  selectedFormulaId: string | null;
  currentInputs: Record<string, any>;
  tsResult: FormulaExecutionResult | null;
  rustResult: FormulaExecutionResult | null;
  activeEngine: "ts" | "rust" | "local";
  loading: boolean;
  error: string | null;
  runHistory: RunRecord[];

  // Actions
  loadFormulas: (sourceFiles?: string[] | FormulaDefinition[]) => Promise<void>;
  loadFormulasFromAllSources: () => Promise<void>;
  selectFormula: (formulaId: string) => void;
  getFormulaDefinition: (formulaId: string) => FormulaDefinition | undefined;
  updateInput: (key: string, value: any) => void;
  updateInputAt: (path: string, value: any) => void;
  setInputs: (inputs: Record<string, any>) => void;
  executeFormula: () => Promise<void>;
  switchEngine: (engine: "ts" | "rust" | "local") => void;
  loadHistory: (formulaId?: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  replayHistoryRecord: (recordId: string) => Promise<void>;
}

// Create base formula store instance for shared functionality
const baseStore = new BaseFormulaStore();

export const useFormulaStore = create<FormulaStore>((set, get) => ({
  // Initial state
  formulaDefinitions: [],
  selectedFormulaId: null,
  currentInputs: {},
  tsResult: null,
  rustResult: null,
  activeEngine: "ts",
  loading: false,
  error: null,
  runHistory: [],

  // Load formulas from source files or use pre-defined formulas
  loadFormulas: async (sourceFiles?: string[] | FormulaDefinition[]) => {
    set({ loading: true, error: null });

    try {
      let formulas: FormulaDefinition[];

      if (!sourceFiles || sourceFiles.length === 0) {
        // No source files provided, use empty array
        formulas = [];
      } else if (typeof sourceFiles[0] === "string") {
        // Parse from source files using base store
        const result = await baseStore.parseFormulasBase(
          sourceFiles as string[]
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        formulas = result.formulas || [];
      } else {
        // Use pre-defined formulas and enrich with source code
        formulas = enrichFormulasWithSource(sourceFiles as FormulaDefinition[]);
      }

      set({ formulaDefinitions: formulas, loading: false });

      // Auto-select first formula if available
      if (formulas.length > 0 && !get().selectedFormulaId) {
        get().selectFormula(formulas[0].id);
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to load formulas",
        loading: false,
      });
    }
  },

  /**
   * Load formulas from all sources (IndexedDB + config file) and merge them
   * Priority: IndexedDB formulas take precedence over config file formulas (by ID)
   */
  loadFormulasFromAllSources: async () => {
    set({ loading: true, error: null });

    try {
      // Load from IndexedDB
      const dbFormulas = await db.formulas.toArray();

      // Load from config file (formulas.json)
      let configFormulas: FormulaDefinition[] = [];
      try {
        const response = await fetch("/formulas.json");
        if (response.ok) {
          configFormulas = await response.json();
          // Mark config formulas with creationType if not set
          configFormulas = configFormulas.map((formula: FormulaDefinition) => ({
            ...formula,
            creationType: formula.creationType || "builtin",
          }));
        }
      } catch (error) {
        // Config file not found or invalid - that's okay, just use IndexedDB
        console.warn("Could not load formulas.json:", error);
      }

      // Merge formulas: IndexedDB takes precedence, then add config formulas that don't exist in DB
      const formulaMap = new Map<string, FormulaDefinition>();

      // First, add config formulas (lower priority)
      for (const formula of configFormulas) {
        formulaMap.set(formula.id, formula);
      }

      // Then, add/override with IndexedDB formulas (higher priority)
      for (const formula of dbFormulas) {
        formulaMap.set(formula.id, formula);
      }

      // Convert map to array
      const mergedFormulas = Array.from(formulaMap.values());

      // Enrich with source code if available
      const enrichedFormulas = enrichFormulasWithSource(mergedFormulas);

      set({ formulaDefinitions: enrichedFormulas, loading: false });

      // Auto-select first formula if available
      if (enrichedFormulas.length > 0 && !get().selectedFormulaId) {
        get().selectFormula(enrichedFormulas[0].id);
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load formulas from all sources",
        loading: false,
      });
    }
  },

  // Select a formula
  selectFormula: (formulaId: string) => {
    const result = baseStore.findAndInitializeFormula(
      formulaId,
      get().formulaDefinitions
    );
    if (!result) return;

    set({
      selectedFormulaId: formulaId,
      currentInputs: result.inputs,
      tsResult: null,
      rustResult: null,
      error: null,
    });

    // Load history for this formula
    get().loadHistory(formulaId);
  },

  // Get formula definition by ID
  getFormulaDefinition: (formulaId: string) => {
    return get().formulaDefinitions.find((f) => f.id === formulaId);
  },

  // Update a single input value
  updateInput: (key: string, value: any) => {
    if (key.includes(".")) {
      get().updateInputAt(key, value);
    } else {
      set((state) => ({
        currentInputs: { ...state.currentInputs, [key]: value },
      }));
    }
  },

  // Update value by dot-path, e.g., "order.price"
  updateInputAt: (path: string, value: any) => {
    set((state) => ({
      currentInputs: baseStore.updateInputAt(state.currentInputs, path, value),
    }));
  },

  // Set all inputs at once
  setInputs: (inputs: Record<string, any>) => {
    set({ currentInputs: inputs });
  },

  // Execute the current formula
  executeFormula: async () => {
    const {
      selectedFormulaId,
      formulaDefinitions,
      currentInputs,
      activeEngine,
    } = get();

    const formula = formulaDefinitions.find((f) => f.id === selectedFormulaId);
    if (!formula) {
      set({ error: "No formula selected" });
      return;
    }

    set({ loading: true, error: null });

    const result = await baseStore.executeFormulaBase(
      formula,
      currentInputs,
      activeEngine
    );

    if (result.success && result.result) {
      if (activeEngine === "ts") {
        set({ tsResult: result.result, loading: false });
      } else {
        set({ rustResult: result.result, loading: false });
      }

      // Reload history after successful execution
      await get().loadHistory(formula.id);
    } else {
      set({
        error: result.error || "Execution failed",
        loading: false,
      });
    }
  },

  // Switch execution engine
  switchEngine: (engine: "ts" | "rust" | "local") => {
    set({ activeEngine: engine });
  },

  // Load execution history
  loadHistory: async (formulaId?: string) => {
    const records = await baseStore.loadHistoryBase(formulaId);
    set({ runHistory: records });
  },

  // Clear all history
  clearHistory: async () => {
    const result = await baseStore.clearHistoryBase();
    if (result.success) {
      set({ runHistory: [] });
    } else {
      console.error("Failed to clear history:", result.error);
    }
  },

  // Replay a history record
  replayHistoryRecord: async (recordId: string) => {
    const result = await baseStore.replayHistoryRecordBase(recordId);
    if (result.success && result.inputs) {
      // Set the inputs from the record
      set({ currentInputs: result.inputs });

      // Execute the formula
      await get().executeFormula();
    } else {
      console.error("Failed to replay history record:", result.error);
    }
  },
}));
