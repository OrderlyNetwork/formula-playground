import { create } from "zustand";
import type { FormulaDefinition } from "../types/formula";
import type { FormulaExecutionResult } from "../types/executor";
import type { RunRecord } from "../types/history";
import { useUserCodeStore } from "./userCodeStore";
import { BaseFormulaStore } from "./BaseFormulaStore";

/**
 * Multiline TypeScript sample used as the default content when the
 * current editor value is empty. This provides users with a ready-to-use
 * example of how to structure formula code with proper JSDoc annotations.
 */
const PLACEHOLDER_TS_SAMPLE = `/**
* @formulaId custom_formula
* @name Custom Formula
* @description Example: input and output description
* @version 1.0.0
* @param {number} a - First input @default 1 @unit unitA
* @param {number} b - Second input @default 2 @unit unitB
* @returns {number} Result @unit unitR
*/
export function add(a: number, b: number): number {
  return a + b;
}
`;

/**
 * Developer mode store
 * Manages state for developer mode independently from normal mode
 */
interface DeveloperStore {
  // Code editor state
  codeInput: string;
  setCodeInput: (code: string) => void;

  // Parse and execution state
  parsedFormulas: FormulaDefinition[];
  selectedFormulaId: string | null;
  currentInputs: Record<string, any>;
  tsResult: FormulaExecutionResult | null;
  rustResult: FormulaExecutionResult | null;
  activeEngine: "ts" | "rust" | "local";
  loading: boolean;
  error: string | null;
  parseError: string | null;
  parseSuccess: string | null;
  runHistory: RunRecord[];

  // Actions
  /**
   * Parse formulas from current code input
   * Returns parsed formulas without adding to the list
   */
  parseCode: () => Promise<
    | { success: true; formulas: FormulaDefinition[] }
    | { success: false; error: string }
  >;

  /**
   * Parse and create formulas from current code input
   * Adds parsed formulas to the developer mode formula list
   */
  parseAndCreate: () => Promise<
    | { success: true; formulas: FormulaDefinition[] }
    | { success: false; error: string }
  >;

  /**
   * Clear code input and reset parse state
   */
  clearCode: () => void;

  /**
   * Select a formula in developer mode
   */
  selectFormula: (formulaId: string) => void;

  /**
   * Update input value
   */
  updateInput: (key: string, value: any) => void;

  /**
   * Update input value by dot-path
   */
  updateInputAt: (path: string, value: any) => void;

  /**
   * Set all inputs at once
   */
  setInputs: (inputs: Record<string, any>) => void;

  /**
   * Execute the currently selected formula in developer mode
   */
  executeFormula: () => Promise<void>;

  /**
   * Switch execution engine
   */
  switchEngine: (engine: "ts" | "rust" | "local") => void;

  /**
   * Load execution history
   */
  loadHistory: (formulaId?: string) => Promise<void>;

  /**
   * Clear all history
   */
  clearHistory: () => Promise<void>;

  /**
   * Replay a history record
   */
  replayHistoryRecord: (recordId: string) => Promise<void>;

  /**
   * Remove a formula from developer mode
   */
  removeFormula: (formulaId: string) => void;

  /**
   * Clear all parsed formulas
   */
  clearAllFormulas: () => void;
}

// Create base formula store instance for shared functionality
const baseStore = new BaseFormulaStore();

export const useDeveloperStore = create<DeveloperStore>((set, get) => ({
  // Initial state
  codeInput: PLACEHOLDER_TS_SAMPLE,
  parsedFormulas: [],
  selectedFormulaId: null,
  currentInputs: {},
  tsResult: null,
  rustResult: null,
  activeEngine: "ts",
  loading: false,
  error: null,
  parseError: null,
  parseSuccess: null,
  runHistory: [],

  // Set code input
  setCodeInput: (code: string) => {
    set({ codeInput: code });
  },

  // Parse code without creating formulas
  parseCode: async () => {
    const { codeInput } = get();
    const trimmed = codeInput?.trim();

    if (!trimmed) {
      set({
        parseError:
          "Please enter TypeScript code containing exported functions and JSDoc",
        parseSuccess: null,
      });
      return {
        success: false,
        error:
          "Please enter TypeScript code containing exported functions and JSDoc",
      } as const;
    }

    set({ loading: true, parseError: null, parseSuccess: null });

    try {
      const result = await baseStore.parseFormulasBase([
        { path: "user-input.ts", content: trimmed },
      ]);

      if (!result.success || !result.formulas || result.formulas.length === 0) {
        const error =
          result.error ||
          "No formula functions were recognized, please check your code and JSDoc comments";
        set({ parseError: error, loading: false });
        return { success: false, error } as const;
      }

      // Mark formulas as parsed from developer mode
      const markedDefs = result.formulas.map((def: FormulaDefinition) => ({
        ...def,
        creationType: "parsed" as const,
      }));

      const formulaNames = markedDefs
        .map((f: FormulaDefinition) => `• ${f.name} (${f.id})`)
        .join("\n");
      const successMsg = `✅ Successfully parsed ${markedDefs.length} formula(s):\n${formulaNames}`;

      set({ parseSuccess: successMsg, loading: false });
      return { success: true, formulas: markedDefs } as const;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ parseError: message, loading: false });
      return { success: false, error: message } as const;
    }
  },

  // Parse and create formulas
  parseAndCreate: async () => {
    const { codeInput } = get();
    const trimmed = codeInput?.trim();

    if (!trimmed) {
      set({
        parseError:
          "Please enter TypeScript code containing exported functions and JSDoc",
        parseSuccess: null,
      });
      return {
        success: false,
        error:
          "Please enter TypeScript code containing exported functions and JSDoc",
      } as const;
    }

    set({ loading: true, parseError: null, parseSuccess: null });

    try {
      // Persist raw code into user code store before parsing for traceability
      useUserCodeStore.getState().addCode({
        path: "user-input.ts",
        content: trimmed,
        origin: "paste",
      });

      const result = await baseStore.parseFormulasBase([
        { path: "user-input.ts", content: trimmed },
      ]);

      if (!result.success || !result.formulas || result.formulas.length === 0) {
        const error =
          result.error ||
          "No formula functions were recognized, please check your code and JSDoc comments";
        set({ parseError: error, loading: false });
        return { success: false, error } as const;
      }

      // Mark formulas as parsed from developer mode
      const markedDefs = result.formulas.map((def: FormulaDefinition) => ({
        ...def,
        creationType: "parsed" as const,
      }));

      // Replace all formulas with newly parsed ones (single file editing mode)
      // Each Parse completely replaces the formula list with what's in the current code
      set({
        parsedFormulas: markedDefs,
        parseSuccess: `✅ Successfully parsed ${markedDefs.length} formula(s)`,
        loading: false,
      });

      // Auto-select the first created formula
      if (markedDefs.length > 0) {
        get().selectFormula(markedDefs[0].id);
      }

      // Clear success message after 2 seconds but keep the code
      setTimeout(() => {
        set({ parseSuccess: null });
      }, 2000);

      return { success: true, formulas: markedDefs } as const;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ parseError: message, loading: false });
      return { success: false, error: message } as const;
    }
  },

  /**
   * Clear code input and reset all developer mode state
   * This resets the code editor, parsed formulas, selections, inputs, and results
   */
  clearCode: () => {
    set({
      // Clear code editor state
      codeInput: "",
      parseError: null,
      parseSuccess: null,
      // Reset parsed formulas and selection
      parsedFormulas: [],
      selectedFormulaId: null,
      // Clear inputs and results
      currentInputs: {},
      tsResult: null,
      rustResult: null,
      // Clear error states
      error: null,
      loading: false,
      // Clear history
      runHistory: [],
    });
  },

  // Select a formula in developer mode
  selectFormula: (formulaId: string) => {
    const result = baseStore.findAndInitializeFormula(
      formulaId,
      get().parsedFormulas
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

  // Execute the current formula in developer mode
  executeFormula: async () => {
    const { selectedFormulaId, parsedFormulas, currentInputs, activeEngine } =
      get();

    const formula = parsedFormulas.find((f) => f.id === selectedFormulaId);
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

  // Remove a formula from developer mode
  removeFormula: (formulaId: string) => {
    const { parsedFormulas, selectedFormulaId } = get();
    const next = parsedFormulas.filter((f) => f.id !== formulaId);
    set({ parsedFormulas: next });

    // If the removed formula was selected, clear selection
    if (selectedFormulaId === formulaId) {
      set({
        selectedFormulaId: null,
        currentInputs: {},
        tsResult: null,
        rustResult: null,
      });
    }
  },

  // Clear all parsed formulas
  clearAllFormulas: () => {
    set({
      parsedFormulas: [],
      selectedFormulaId: null,
      currentInputs: {},
      tsResult: null,
      rustResult: null,
      error: null,
    });
  },
}));
