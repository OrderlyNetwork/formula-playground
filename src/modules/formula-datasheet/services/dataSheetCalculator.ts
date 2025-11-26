import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import type { FormulaExecutionResult } from "@/types/executor";
import { SyncFormulaExecutor } from "../../formula-executor/sync-executor";
import { reconstructFormulaInputs } from "@/utils/formulaTableUtils";
import { useFormulaLogStore } from "@/store/formulaLogStore";

/**
 * Result of calculating a single row
 */
export interface RowCalculationResult {
  success: boolean;
  result?: FormulaScalar;
  executionTime?: number;
  error?: string;
}

/**
 * DataSheet Calculator Service
 * Handles calculation of individual rows in the formula data sheet
 * Uses SyncFormulaExecutor for synchronous execution (no Web Worker)
 */
class DataSheetCalculator {
  private executor: SyncFormulaExecutor;

  constructor() {
    this.executor = new SyncFormulaExecutor();
  }

  /**
   * Calculate formula result for a single row
   * Converts flattened row data to formula input format and executes
   *
   * @param formula - Formula definition to execute
   * @param rowData - Flattened row data (using dot-notation keys)
   * @returns Calculation result with result value, execution time, and error (if any)
   */
  async calculateRow(
    formula: FormulaDefinition,
    rowData: Record<string, FormulaScalar>
  ): Promise<RowCalculationResult> {
    const startTime = Date.now();
    let inputs: Record<string, FormulaScalar> = {};

    try {
      // Convert flattened data back to formula input format
      // Pass formula definition to ensure correct structure reconstruction
      inputs = reconstructFormulaInputs(rowData, formula);

      // Execute formula using sync executor
      const executionResult: FormulaExecutionResult =
        await this.executor.execute(formula, inputs);

      if (executionResult.success) {
        // Extract result from outputs (use first output value for compatibility)
        const resultValue = executionResult.outputs
          ? Object.values(executionResult.outputs)[0]
          : undefined;

        // Log successful execution
        useFormulaLogStore.getState().addLog({
          formulaId: formula.id,
          rowId: rowData.id as string || "unknown",
          inputs,
          result: resultValue,
          executionTime: executionResult.durationMs,
        });

        return {
          success: true,
          result: resultValue,
          executionTime: executionResult.durationMs,
        };
      } else {
        // Log failed execution
        useFormulaLogStore.getState().addLog({
          formulaId: formula.id,
          rowId: rowData.id as string || "unknown",
          inputs,
          error: executionResult.error,
          executionTime: executionResult.durationMs,
        });

        // Execution failed, return error
        return {
          success: false,
          error: executionResult.error,
          executionTime: executionResult.durationMs,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const stack = error instanceof Error ? error.stack : undefined;

      // Log unexpected error
      useFormulaLogStore.getState().addLog({
        formulaId: formula.id,
        rowId: rowData.id as string || "unknown",
        inputs,
        error: errorMessage,
        stack,
        executionTime: Date.now() - startTime,
      });

      // Handle unexpected errors
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

// Export singleton instance
export const dataSheetCalculator = new DataSheetCalculator();
