import type { FormulaDefinition } from "../types/formula";
import type { FormulaExecutionResult } from "../types/executor";
import type { RunRecord } from "../types/history";
import { setByPath } from "../utils/pathUtils";
import { FormulaServiceFactory } from "../services/FormulaServiceFactory";

/**
 * Base class for formula stores containing common logic
 * Reduces code duplication between FormulaStore and DeveloperStore
 */
export class BaseFormulaStore {
  /**
   * Initialize inputs with default values based on formula definition
   * Common logic used by both stores when selecting a formula
   */
  public initializeInputs(formula: FormulaDefinition): Record<string, any> {
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

    return inputs;
  }

  /**
   * Find formula by ID and return it along with initialized inputs
   * Returns null if formula not found
   */
  public findAndInitializeFormula(
    formulaId: string,
    formulas: FormulaDefinition[]
  ): { formula: FormulaDefinition; inputs: Record<string, any> } | null {
    const formula = formulas.find((f) => f.id === formulaId);
    if (!formula) {
      return null;
    }

    const inputs = this.initializeInputs(formula);
    return { formula, inputs };
  }

  /**
   * Update input value by dot-path (e.g., "order.price")
   * Common logic used by both stores
   */
  public updateInputAt(
    currentInputs: Record<string, any>,
    path: string,
    value: any
  ): Record<string, any> {
    const next = { ...currentInputs };
    setByPath(next, path, value);
    return next;
  }

  /**
   * Execute formula with common error handling and history saving logic
   */
  public async executeFormulaBase(
    formula: FormulaDefinition,
    inputs: Record<string, any>,
    engine: "ts" | "rust" | "local"
  ): Promise<{
    success: boolean;
    result?: FormulaExecutionResult;
    error?: string;
  }> {
    try {
      const executor = FormulaServiceFactory.getExecutor();
      const result = await executor.execute(formula, inputs, engine);

      // Save to history if successful
      if (result.success && result.outputs) {
        const historyManager = FormulaServiceFactory.getHistoryManager();

        await historyManager.addRecord({
          formulaId: formula.id,
          formulaVersion: formula.version,
          engine,
          sdkVersion: "1.0.0",
          inputs,
          outputs: result.outputs,
          durationMs: result.durationMs,
        });
      }

      return {
        success: true,
        result
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Execution failed";
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Load execution history with common error handling
   */
  public async loadHistoryBase(formulaId?: string): Promise<RunRecord[]> {
    try {
      const historyManager = FormulaServiceFactory.getHistoryManager();

      const records = formulaId
        ? await historyManager.getRecordsByFormulaId(formulaId)
        : await historyManager.getAllRecords();

      return records;
    } catch (error) {
      console.error("Failed to load history:", error);
      return [];
    }
  }

  /**
   * Clear all history with common error handling
   */
  public async clearHistoryBase(): Promise<{ success: boolean; error?: string }> {
    try {
      const historyManager = FormulaServiceFactory.getHistoryManager();
      await historyManager.clearAllRecords();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to clear history";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Replay a history record with common logic
   */
  public async replayHistoryRecordBase(
    recordId: string
  ): Promise<{
    success: boolean;
    inputs?: Record<string, any>;
    error?: string;
  }> {
    try {
      const historyManager = FormulaServiceFactory.getHistoryManager();
      const record = await historyManager.getRecordById(recordId);

      if (!record) {
        return {
          success: false,
          error: "History record not found"
        };
      }

      return {
        success: true,
        inputs: record.inputs
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to replay history record";
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Parse formulas from source with common error handling
   */
  public async parseFormulasBase(
    sourceFiles: string[] | { path: string; content: string }[] | FormulaDefinition[]
  ): Promise<{
    success: boolean;
    formulas?: FormulaDefinition[];
    error?: string;
  }> {
    try {
      const parser = FormulaServiceFactory.getParser();
      let formulas: FormulaDefinition[];

      if (!sourceFiles || sourceFiles.length === 0) {
        return { success: true, formulas: [] };
      }

      if (typeof sourceFiles[0] === "string") {
        // Parse from source file paths
        formulas = await parser.parseFormulas(sourceFiles as string[]);
      } else if ("content" in sourceFiles[0]) {
        // Parse from text content
        formulas = await parser.parseFormulasFromText(
          sourceFiles as { path: string; content: string }[]
        );
      } else {
        // Use pre-defined formulas directly
        formulas = sourceFiles as FormulaDefinition[];
      }

      return {
        success: true,
        formulas
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to parse formulas";
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}