import { create } from "zustand";
import type { FormulaDefinition } from "../types/formula";
import type { FormulaExecutionResult } from "../types/executor";
import type { RunRecord } from "../types/history";
import { FormulaParser } from "../modules/formula-parser";
import { FormulaExecutor } from "../modules/formula-executor";
import { historyManager } from "../modules/history-manager";
import { useUserCodeStore } from "./userCodeStore";

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
  activeEngine: "ts" | "rust";
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
  switchEngine: (engine: "ts" | "rust") => void;

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

// Create parser and executor instances for developer mode
const formulaParser = new FormulaParser();
const formulaExecutor = new FormulaExecutor();

export const useDeveloperStore = create<DeveloperStore>((set, get) => ({
  // Initial state
  codeInput: "",
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
        parseError: "请输入包含导出函数和 JSDoc 的 TypeScript 代码",
        parseSuccess: null,
      });
      return {
        success: false,
        error: "请输入包含导出函数和 JSDoc 的 TypeScript 代码",
      } as const;
    }

    set({ loading: true, parseError: null, parseSuccess: null });

    try {
      const defs = await formulaParser.parseFormulasFromText([
        { path: "user-input.ts", content: trimmed },
      ]);

      if (!defs || defs.length === 0) {
        const error = "未能识别任何公式函数，请检查代码和 JSDoc 注释";
        set({ parseError: error, loading: false });
        return { success: false, error } as const;
      }

      // Mark formulas as parsed from developer mode
      const markedDefs = defs.map((def) => ({
        ...def,
        creationType: "parsed" as const,
      }));

      const formulaNames = markedDefs
        .map((f) => `• ${f.name} (${f.id})`)
        .join("\n");
      const successMsg = `✅ 成功解析 ${markedDefs.length} 个公式:\n${formulaNames}`;

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
        parseError: "请输入包含导出函数和 JSDoc 的 TypeScript 代码",
        parseSuccess: null,
      });
      return {
        success: false,
        error: "请输入包含导出函数和 JSDoc 的 TypeScript 代码",
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

      const defs = await formulaParser.parseFormulasFromText([
        { path: "user-input.ts", content: trimmed },
      ]);

      if (!defs || defs.length === 0) {
        const error = "未能识别任何公式函数，请检查代码和 JSDoc 注释";
        set({ parseError: error, loading: false });
        return { success: false, error } as const;
      }

      // Mark formulas as parsed from developer mode
      const markedDefs = defs.map((def) => ({
        ...def,
        creationType: "parsed" as const,
      }));

      // Add to developer mode formula list
      const { parsedFormulas } = get();
      const next = [...parsedFormulas, ...markedDefs];
      set({
        parsedFormulas: next,
        parseSuccess: `✅ 成功创建 ${markedDefs.length} 个公式`,
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

  // Clear code input
  clearCode: () => {
    set({ codeInput: "", parseError: null, parseSuccess: null });
  },

  // Select a formula in developer mode
  selectFormula: (formulaId: string) => {
    const formula = get().parsedFormulas.find((f) => f.id === formulaId);
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
