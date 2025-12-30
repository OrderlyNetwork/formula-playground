import type { FormulaDefinition } from "../types/formula";
import type { FormulaExecutionResult } from "../types/executor";
import type { RunRecord } from "../types/history";
import { setByPath } from "../utils/pathUtils";
import { FormulaServiceFactory } from "../services/FormulaServiceFactory";
import { useAppStore } from "./appStore";

/**
 * Base class for formula stores containing common logic
 * Reduces code duplication between FormulaStore and DeveloperStore
 */
export class BaseFormulaStore {
  /**
   * Wrap async operation with standard error handling
   * Provides consistent error handling pattern across all store methods
   *
   * @param operation - Async operation to execute
   * @param defaultErrorMessage - Default error message if operation fails
   * @returns Result object with success flag and optional data/error
   */
  protected async withErrorHandling<T>(
    operation: () => Promise<T>,
    defaultErrorMessage: string
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : defaultErrorMessage;
      return { success: false, error: errorMessage };
    }
  }
  /**
   * Initialize inputs with default values based on formula definition
   * Common logic used by both stores when selecting a formula
   */
  public initializeInputs(formula: FormulaDefinition): Record<string, any> {
    const inputs: Record<string, any> = {};

    formula.inputs.forEach((input) => {
      // Check if this is an array type input
      if (input.factorType?.array === true) {
        // Array input: initialize as array
        // For array types, only use array defaults, otherwise use empty array
        if (Array.isArray(input.default) && input.default.length > 0) {
          inputs[input.key] = input.default;
        } else {
          // Empty array as default for all array types
          inputs[input.key] = [];
        }
      } else if (input.type === "object") {
        const props = input.factorType?.properties ?? [];
        const obj: Record<string, any> = {};

        for (const p of props) {
          // Check if this property is an array type
          if (p.factorType?.array === true) {
            // Array property: initialize as empty array unless valid array default provided
            if (Array.isArray(p.default) && p.default.length > 0) {
              obj[p.key] = p.default;
            } else {
              obj[p.key] = [];
            }
          } else {
            // Non-array property: use regular default logic
            obj[p.key] =
              p.default ??
              (p.type === "number"
                ? 0
                : p.type === "boolean"
                ? false
                : p.factorType?.nullable
                ? null
                : "");
          }
        }

        inputs[input.key] = obj;
      } else {
        // Non-array input: use default or empty string/null based on nullable
        if (input.default !== undefined) {
          inputs[input.key] = input.default;
        } else {
          inputs[input.key] = input.factorType?.nullable ? null : "";
        }
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
   * Also updates the app store with current adapter information
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
    return this.withErrorHandling(async () => {
      // Update adapter info in app store before execution
      const { setAdapterInfo, currentVersionConfig } = useAppStore.getState();

      if (engine === "ts") {
        // Use current version config if available
        if (currentVersionConfig) {
          const displayName =
            currentVersionConfig.packageName || "TypeScript SDK";
          setAdapterInfo(displayName, currentVersionConfig.version);
        } else {
          setAdapterInfo("TypeScript SDK", "1.0.0");
        }
      } else if (engine === "local") {
        // For local engine, we'll use the perp package version
        // This matches the LocalNpmAdapter's version property
        // But if there's a version config, use that instead
        if (currentVersionConfig) {
          const displayName =
            currentVersionConfig.packageName || "Local NPM SDK";
          setAdapterInfo(displayName, currentVersionConfig.version);
        } else {
          try {
            const perpModule = await import("@orderly.network/perp");
            setAdapterInfo("Local NPM SDK", perpModule.version || "unknown");
          } catch {
            setAdapterInfo("Local NPM SDK", "unknown");
          }
        }
      }

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

      return result;
    }, "Execution failed").then(({ success, data, error }) => ({
      success,
      result: data,
      error,
    }));
  }

  /**
   * Load execution history with common error handling
   */
  public async loadHistoryBase(formulaId?: string): Promise<RunRecord[]> {
    const result = await this.withErrorHandling(async () => {
      const historyManager = FormulaServiceFactory.getHistoryManager();

      const records = formulaId
        ? await historyManager.getRecordsByFormulaId(formulaId)
        : await historyManager.getAllRecords();

      return records;
    }, "Failed to load history");

    if (!result.success) {
      console.error("Failed to load history:", result.error);
      return [];
    }

    return result.data || [];
  }

  /**
   * Clear all history with common error handling
   */
  public async clearHistoryBase(): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.withErrorHandling(async () => {
      const historyManager = FormulaServiceFactory.getHistoryManager();
      await historyManager.clearAllRecords();
      return true;
    }, "Failed to clear history").then(({ success, error }) => ({
      success,
      error,
    }));
  }

  /**
   * Replay a history record with common logic
   */
  public async replayHistoryRecordBase(recordId: string): Promise<{
    success: boolean;
    inputs?: Record<string, any>;
    error?: string;
  }> {
    const result = await this.withErrorHandling(async () => {
      const historyManager = FormulaServiceFactory.getHistoryManager();
      const record = await historyManager.getRecordById(recordId);

      if (!record) {
        throw new Error("History record not found");
      }

      return record.inputs;
    }, "Failed to replay history record");

    return {
      success: result.success,
      inputs: result.data,
      error: result.error,
    };
  }

  /**
   * Parse formulas from source with common error handling
   */
  public async parseFormulasBase(
    sourceFiles:
      | string[]
      | { path: string; content: string }[]
      | FormulaDefinition[]
  ): Promise<{
    success: boolean;
    formulas?: FormulaDefinition[];
    error?: string;
  }> {
    // Handle empty source files early
    if (!sourceFiles || sourceFiles.length === 0) {
      return { success: true, formulas: [] };
    }

    return this.withErrorHandling(async () => {
      const parser = FormulaServiceFactory.getParser();
      let formulas: FormulaDefinition[];

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

      return formulas;
    }, "Failed to parse formulas").then(({ success, data, error }) => ({
      success,
      formulas: data,
      error,
    }));
  }
}
