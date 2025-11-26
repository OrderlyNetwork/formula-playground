import type {
  FactorType,
  FormulaDefinition,
  FormulaScalar,
} from "@/types/formula";
import type { FormulaExecutionResult } from "@/types/executor";
import { SyncFormulaExecutor } from "../../formula-executor/sync-executor";
import { useFormulaLogStore } from "@/store/formulaLogStore";
import { usePreArgsCheckStore } from "@/store/preArgsCheckStore";

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
   * Recursively check if a value is truly valid (not null/undefined/empty)
   * Handles nested objects and arrays
   *
   * @param value - Value to check
   * @returns true if value has actual content
   */
  private hasValidValue(value: FormulaScalar): boolean {
    // Null or undefined values are invalid
    if (value === null || value === undefined) {
      return false;
    }

    // Primitive types (number, string, boolean) are valid if not null/undefined
    const primitiveTypes = ["number", "string", "boolean"] as const;
    if (
      primitiveTypes.includes(typeof value as (typeof primitiveTypes)[number])
    ) {
      return true;
    }

    // Check arrays - must have at least one valid element
    if (Array.isArray(value)) {
      return value.length > 0 && value.some((item) => this.hasValidValue(item));
    }

    // Check objects - must have at least one valid property value
    if (typeof value === "object" && value !== null) {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);
      // Empty object is invalid
      if (keys.length === 0) {
        return false;
      }
      // Check if at least one property has a valid value
      return keys.some((key) => this.hasValidValue(obj[key] as FormulaScalar));
    }

    // For any other type, consider it valid if not null/undefined
    return true;
  }

  /**
   * Check if there's at least one valid (non-null/undefined/empty) input value
   * Recursively checks nested objects and arrays
   *
   * @param inputs - Input data to check
   * @returns true if at least one input has a valid value
   */
  private hasAnyValidInput(inputs: Record<string, FormulaScalar>): boolean {
    return Object.values(inputs).some((value) => this.hasValidValue(value));
  }

  /**
   * Add validation error message to the store
   * Centralized error reporting to avoid code duplication
   *
   * @param formulaId - Formula ID for storing messages
   * @param field - Field name that failed validation
   * @param message - Error message
   * @param path - Optional nested path (e.g., "user.profile")
   */
  private addValidationError(
    formulaId: string,
    field: string,
    message: string,
    path?: string
  ): void {
    console.log(`[preArgsCheck] ${message}`);
    usePreArgsCheckStore
      .getState()
      .addPreArgsCheckMessage(formulaId, field, message, path);
  }

  /**
   * Pre-check arguments before calculation
   * Validates that all required (non-nullable) input fields are present
   * Supports recursive validation for nested objects
   * Only shows validation errors if at least one input field has a value
   *
   * @param formula - Formula definition with input specifications
   * @param inputs - Formatted input data (already converted to proper types)
   * @returns true if all required fields are present, false otherwise
   */
  preArgsCheck(
    formula: FormulaDefinition,
    inputs: Record<string, FormulaScalar>
  ): boolean {
    // Clear previous validation messages for this formula before starting new validation
    // This ensures old error messages don't persist when validation passes
    usePreArgsCheckStore.getState().clearPreArgsCheckMessages(formula.id);

    // Only validate and show errors if at least one input has a value
    // If all inputs are empty, return false (validation fails) but don't show any validation messages
    if (!this.hasAnyValidInput(inputs)) {
      return false;
    }

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
        this.addValidationError(
          formula.id,
          key,
          `Missing required field: ${key}`
        );
        return false;
      }

      // For object types with properties, recursively check nested fields
      if (
        factorType.baseType === "object" &&
        Array.isArray(factorType.properties)
      ) {
        if (
          !this.validateNestedObject(
            value,
            factorType.properties,
            key,
            formula.id
          )
        ) {
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
   * @param properties - Property definitions from factorType (must be non-null array)
   * @param path - Current path for error logging (e.g., "user.profile")
   * @param formulaId - Formula ID for storing messages in the store
   * @returns true if all required nested fields are present, false otherwise
   */
  private validateNestedObject(
    obj: FormulaScalar,
    properties: NonNullable<FactorType["properties"]>,
    path: string,
    formulaId: string
  ): boolean {
    // Ensure obj is actually an object
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      this.addValidationError(
        formulaId,
        path,
        `Expected object at path: ${path}, got: ${typeof obj}`,
        path
      );
      return false;
    }

    const objRecord = obj as Record<string, unknown>;

    // Check each property definition
    for (const propDef of properties) {
      const { key, factorType } = propDef;
      const propPath = `${path}.${key}`;

      // Skip nullable properties
      if (factorType.nullable === true) {
        continue;
      }

      // Check if required property exists
      const propValue = objRecord[key];
      if (propValue === null || propValue === undefined) {
        this.addValidationError(
          formulaId,
          key,
          `Missing required nested field: ${propPath}`,
          propPath
        );
        return false;
      }

      // Recursively validate nested objects
      if (
        factorType.baseType === "object" &&
        Array.isArray(factorType.properties)
      ) {
        if (
          !this.validateNestedObject(
            propValue,
            factorType.properties,
            propPath,
            formulaId
          )
        ) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Extract error message from an unknown error type
   *
   * @param error - Error object of unknown type
   * @returns Error message string
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }

  /**
   * Log formula execution to the log store
   *
   * @param formulaId - Formula identifier
   * @param inputs - Input values used
   * @param result - Optional result value
   * @param error - Optional error message
   * @param executionTime - Execution time in milliseconds
   * @param stack - Optional stack trace
   */
  private logExecution(
    formulaId: string,
    inputs: Record<string, FormulaScalar>,
    result?: FormulaScalar,
    error?: string,
    executionTime?: number,
    stack?: string
  ): void {
    useFormulaLogStore.getState().addLog({
      formulaId,
      rowId: "unknown",
      inputs,
      result,
      error,
      executionTime,
      stack,
    });
  }

  /**
   * Calculate formula result for a single row
   * Converts flattened row data to formula input format and executes
   * Assumes inputs have already been validated
   *
   * @param formula - Formula definition to execute
   * @param inputs - Pre-validated input data (properly structured)
   * @returns Calculation result with result value, execution time, and error (if any)
   */
  async calculateRow(
    formula: FormulaDefinition,
    inputs: Record<string, FormulaScalar>
  ): Promise<RowCalculationResult> {
    const startTime = Date.now();

    try {
      // Execute formula using sync executor (inputs should already be validated)
      const executionResult: FormulaExecutionResult =
        await this.executor.execute(formula, inputs);

      const { success, outputs, error, durationMs } = executionResult;

      if (success) {
        // Extract result from outputs (use first output value for compatibility)
        const resultValue = outputs ? Object.values(outputs)[0] : undefined;

        // Log successful execution
        this.logExecution(
          formula.id,
          inputs,
          resultValue,
          undefined,
          durationMs
        );

        return {
          success: true,
          result: resultValue,
          executionTime: durationMs,
        };
      }

      // Log failed execution
      this.logExecution(formula.id, inputs, undefined, error, durationMs);

      // Execution failed, return error
      return {
        success: false,
        error,
        executionTime: durationMs,
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      const stack = error instanceof Error ? error.stack : undefined;
      const executionTime = Date.now() - startTime;

      // Log unexpected error
      this.logExecution(
        formula.id,
        inputs,
        undefined,
        errorMessage,
        executionTime,
        stack
      );

      // Handle unexpected errors
      return {
        success: false,
        error: errorMessage,
        executionTime,
      };
    }
  }
}

// Export singleton instance
export const dataSheetCalculator = new DataSheetCalculator();
