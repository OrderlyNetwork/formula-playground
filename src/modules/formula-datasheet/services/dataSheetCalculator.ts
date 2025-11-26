import type { FactorType, FormulaDefinition, FormulaScalar } from "@/types/formula";
import type { FormulaExecutionResult } from "@/types/executor";
import { SyncFormulaExecutor } from "../../formula-executor/sync-executor";
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
   * Pre-check arguments before calculation
   * Validates that all required (non-nullable) input fields are present
   * Supports recursive validation for nested objects
   * 
   * @param formula - Formula definition with input specifications
   * @param inputs - Formatted input data (already converted to proper types)
   * @returns true if all required fields are present, false otherwise
   */
  preArgsCheck(formula: FormulaDefinition, inputs: Record<string, FormulaScalar>): boolean {
    // Check each input parameter defined in the formula
    for (const inputDef of formula.inputs) {
      const { key, factorType } = inputDef;

      // Skip nullable fields - they are optional
      if (factorType.nullable === true) {
        continue;
      }

      // Check if the required field exists and is not null/undefined
      const value = inputs[key];
      if (value === null || value === undefined) {
        console.log(`[preArgsCheck] Missing required field: ${key}`);
        return false;
      }

      // For object types with properties, recursively check nested fields
      if (factorType.baseType === "object" && factorType.properties && Array.isArray(factorType.properties)) {
        if (!this.validateNestedObject(value, factorType.properties, key)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Recursively validate nested object properties
   * 
   * @param obj - The object value to validate
   * @param properties - Property definitions from factorType
   * @param path - Current path for error logging (e.g., "user.profile")
   * @returns true if all required nested fields are present, false otherwise
   */
  private validateNestedObject(
    obj: FormulaScalar,
    properties: FactorType["properties"],
    path: string
  ): boolean {
    // Ensure obj is actually an object
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      console.log(`[preArgsCheck] Expected object at path: ${path}, got: ${typeof obj}`);
      return false;
    }

    const objRecord = obj as Record<string, unknown>;

    // Check each property definition
    for (const propDef of properties!) {
      const { key, factorType } = propDef;
      const propPath = `${path}.${key}`;

      // Skip nullable properties
      if (factorType.nullable === true) {
        continue;
      }

      // Check if required property exists
      const propValue = objRecord[key];
      if (propValue === null || propValue === undefined) {
        console.log(`[preArgsCheck] Missing required nested field: ${propPath}`);
        return false;
      }

      // Recursively validate nested objects
      if (factorType.baseType === "object" && factorType.properties && Array.isArray(factorType.properties)) {
        if (!this.validateNestedObject(propValue, factorType.properties, propPath)) {
          return false;
        }
      }
    }

    return true;
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
    inputs: Record<string, FormulaScalar>
  ): Promise<RowCalculationResult> {
    const startTime = Date.now();
    // let inputs: Record<string, FormulaScalar> = {};

    try {
      // Convert flattened data back to formula input format
      // Pass formula definition to ensure correct structure reconstruction
      // inputs = reconstructFormulaInputs(rowData, formula);

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
          rowId: "unknown",
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
          rowId: "unknown",
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
        rowId: "unknown",
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
