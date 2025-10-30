import { create } from "zustand";
import type { FormulaDefinition } from "../types/formula";
import type { FormulaExecutionResult } from "../types/executor";
import type { RunRecord } from "../types/history";
import { FormulaParser } from "../modules/formula-parser";
import { FormulaExecutor } from "../modules/formula-executor";
import { historyManager } from "../modules/history-manager";
import { enrichFormulasWithSource } from "../lib/formula-source-loader";
import { useUserCodeStore } from "./userCodeStore";

interface FormulaStore {
  // State
  formulaDefinitions: FormulaDefinition[];
  selectedFormulaId: string | null;
  currentInputs: Record<string, any>;
  tsResult: FormulaExecutionResult | null;
  rustResult: FormulaExecutionResult | null;
  activeEngine: "ts" | "rust";
  loading: boolean;
  error: string | null;
  runHistory: RunRecord[];

  // Actions
  loadFormulas: (sourceFiles?: string[] | FormulaDefinition[]) => Promise<void>;
  /**
   * Parse formulas from a single TypeScript source string.
   * - Parses user input via FormulaParser
   * - If parseOnly is true, only returns parsed definitions without adding to store
   * - If parseOnly is false (default), appends created definitions to store and selects the first one
   */
  importFromCode: (
    code: string,
    parseOnly?: boolean
  ) => Promise<
    | { success: true; created: FormulaDefinition[] }
    | { success: false; error: string }
  >;
  selectFormula: (formulaId: string) => void;
  updateInput: (key: string, value: any) => void;
  updateInputAt: (path: string, value: any) => void;
  setInputs: (inputs: Record<string, any>) => void;
  executeFormula: () => Promise<void>;
  switchEngine: (engine: "ts" | "rust") => void;
  loadHistory: (formulaId?: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  replayHistoryRecord: (recordId: string) => Promise<void>;
}

// Create formula parser and executor instances
const formulaParser = new FormulaParser();
const formulaExecutor = new FormulaExecutor();

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
        // Parse from source files
        formulas = await formulaParser.parseFormulas(sourceFiles as string[]);
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
   * Parse and optionally import formulas from a TypeScript code string.
   * - If parseOnly is true, only returns parsed definitions without adding to store
   * - If parseOnly is false (default), appends new definitions to the existing list and selects the first created
   */
  importFromCode: async (code: string, parseOnly = false) => {
    const trimmed = code?.trim();
    if (!trimmed) {
      return {
        success: false,
        error: "请输入包含导出函数和 JSDoc 的 TypeScript 代码",
      } as const;
    }

    try {
      // Persist raw code into user code store before parsing for traceability
      useUserCodeStore.getState().addCode({
        path: "user-input.ts",
        content: trimmed,
        origin: "paste",
      });

      const defs = await formulaParser.parseFormulasFromText([
        { path: "user-input.ts", content: trimmed },
      ]);

      if (!defs || defs.length === 0) {
        return {
          success: false,
          error: "未能识别任何公式函数，请检查代码和 JSDoc 注释",
        } as const;
      }

      // Mark formulas as parsed from developer mode
      const markedDefs = defs.map((def) => ({
        ...def,
        creationType: "parsed" as const,
      }));

      // If parseOnly mode, return without adding to store
      if (parseOnly) {
        return { success: true, created: markedDefs } as const;
      }

      // Otherwise, add to store and select the first formula
      const { formulaDefinitions } = get();
      const next = [...formulaDefinitions, ...markedDefs];
      set({ formulaDefinitions: next });
      get().selectFormula(markedDefs[0].id);

      return { success: true, created: markedDefs } as const;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message } as const;
    }
  },

  // Select a formula
  selectFormula: (formulaId: string) => {
    const formula = get().formulaDefinitions.find((f) => f.id === formulaId);
    if (!formula) return;

    // Initialize inputs with default values
    const inputs: Record<string, any> = {};
    formula.inputs.forEach((input) => {
      if (input.type === "object") {
        const props = input.factorType?.properties ?? [];
        const obj: Record<string, any> = {};
        for (const p of props) {
          obj[p.key] =
            p.default ??
            (p.type === "number" ? 0 : p.type === "boolean" ? false : "");
        }
        inputs[input.key] = obj;
      } else {
        inputs[input.key] = input.default ?? "";
      }
    });

    set({
      selectedFormulaId: formulaId,
      currentInputs: inputs,
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
    const setByPath = (obj: any, p: string, v: any) => {
      const parts = p.split(".");
      const last = parts.pop()!;
      let cur = obj;
      for (const k of parts) {
        if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
        cur = cur[k];
      }
      cur[last] = v;
    };
    set((state) => {
      const next = { ...state.currentInputs };
      setByPath(next, path, value);
      return { currentInputs: next };
    });
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

    try {
      const result = await formulaExecutor.execute(
        formula,
        currentInputs,
        activeEngine
      );

      if (activeEngine === "ts") {
        set({ tsResult: result, loading: false });
      } else {
        set({ rustResult: result, loading: false });
      }

      // Save to history if successful
      if (result.success && result.outputs) {
        await historyManager.addRecord({
          formulaId: formula.id,
          formulaVersion: formula.version,
          engine: activeEngine,
          sdkVersion: "1.0.0",
          inputs: currentInputs,
          outputs: result.outputs,
          durationMs: result.durationMs,
        });

        // Reload history
        await get().loadHistory(formula.id);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Execution failed",
        loading: false,
      });
    }
  },

  // Switch execution engine
  switchEngine: (engine: "ts" | "rust") => {
    set({ activeEngine: engine });
  },

  // Load execution history
  loadHistory: async (formulaId?: string) => {
    try {
      const records = formulaId
        ? await historyManager.getRecordsByFormulaId(formulaId)
        : await historyManager.getAllRecords();
      set({ runHistory: records });
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  },

  // Clear all history
  clearHistory: async () => {
    try {
      await historyManager.clearAllRecords();
      set({ runHistory: [] });
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  },

  // Replay a history record
  replayHistoryRecord: async (recordId: string) => {
    try {
      const record = await historyManager.getRecordById(recordId);
      if (!record) return;

      // Set the inputs from the record
      set({ currentInputs: record.inputs });

      // Execute the formula
      await get().executeFormula();
    } catch (error) {
      console.error("Failed to replay history record:", error);
    }
  },
}));
