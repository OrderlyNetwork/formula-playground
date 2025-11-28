import type {
  FactorType,
  FormulaDefinition,
  FormulaScalar,
  FormulaInputType,
} from "@/types/formula";
import type { FormulaExecutionResult } from "@/types/executor";
import { SyncFormulaExecutor } from "../../formula-executor/sync-executor";
import { useFormulaLogStore, type LogLevel } from "@/store/formulaLogStore";
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
    if (value === null || value === undefined) {
      return false;
    }

    const primitiveTypes = ["number", "string", "boolean"] as const;
    if (
      primitiveTypes.includes(typeof value as (typeof primitiveTypes)[number])
    ) {
      return true;
    }

    if (Array.isArray(value)) {
      return (
        value.length > 0 &&
        value.some((item) => this.hasValidValue(item as FormulaScalar))
      );
    }

    if (typeof value === "object" && value !== null) {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return false;
      }
      return keys.some((key) => this.hasValidValue(obj[key] as FormulaScalar));
    }

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
   * Supports recursive validation for nested objects and arrays
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

    for (const inputDef of formula.inputs) {
      const { key, factorType } = inputDef;

      // Skip validation if field is nullable
      if (factorType.nullable === true) {
        continue;
      }

      const value = inputs[key];

      // Check if required field is missing
      if (value === null || value === undefined) {
        this.addValidationError(
          formula.id,
          key,
          `Missing required field: ${key}`
        );
        return false;
      }

      // Validate based on whether it's an array or single value
      if (!this.validateValue(value, factorType, key, formula.id, key)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate a single value against its factor type
   * Handles arrays, objects, and primitive types
   *
   * @param value - The value to validate
   * @param factorType - Type definition for validation
   * @param field - Field name for error reporting
   * @param formulaId - Formula ID for storing messages
   * @param path - Current path for nested error logging
   * @returns true if validation passes, false otherwise
   */
  private validateValue(
    value: FormulaScalar,
    factorType: FactorType,
    field: string,
    formulaId: string,
    path: string
  ): boolean {
    // Handle array types
    if (factorType.array === true) {
      if (!Array.isArray(value)) {
        this.addValidationError(
          formulaId,
          field,
          `Expected array at path: ${path}, got: ${typeof value}`,
          path
        );
        return false;
      }

      // For non-nullable arrays, check if array is empty
      if (factorType.nullable !== true && value.length === 0) {
        this.addValidationError(
          formulaId,
          field,
          `Array cannot be empty at path: ${path}`,
          path
        );
        return false;
      }

      // Validate each array element
      for (let i = 0; i < value.length; i++) {
        const element = value[i];
        const elementPath = `${path}[${i}]`;

        // Check for null/undefined elements in non-nullable arrays
        if (
          factorType.nullable !== true &&
          (element === null || element === undefined)
        ) {
          this.addValidationError(
            formulaId,
            field,
            `Array element cannot be null/undefined at: ${elementPath}`,
            elementPath
          );
          return false;
        }

        // Skip null elements in nullable arrays
        if (element === null || element === undefined) {
          continue;
        }

        // Validate object array elements
        if (
          factorType.baseType === "object" &&
          Array.isArray(factorType.properties)
        ) {
          if (
            !this.validateNestedObject(
              element,
              factorType.properties,
              elementPath,
              formulaId
            )
          ) {
            return false;
          }
        } else {
          // Validate primitive array elements type
          if (
            !this.validatePrimitiveType(
              element,
              factorType.baseType,
              elementPath,
              field,
              formulaId
            )
          ) {
            return false;
          }
        }
      }

      return true;
    }

    // Handle non-array object types
    if (
      factorType.baseType === "object" &&
      Array.isArray(factorType.properties)
    ) {
      return this.validateNestedObject(
        value,
        factorType.properties,
        path,
        formulaId
      );
    }

    // Handle primitive types (number, string, boolean)
    return this.validatePrimitiveType(
      value,
      factorType.baseType,
      path,
      field,
      formulaId
    );
  }

  /**
   * Validate primitive type values
   *
   * @param value - The value to validate
   * @param expectedType - Expected primitive type
   * @param path - Current path for error logging
   * @param field - Field name for error reporting
   * @param formulaId - Formula ID for storing messages
   * @returns true if type matches, false otherwise
   */
  private validatePrimitiveType(
    value: FormulaScalar,
    expectedType: FormulaInputType,
    path: string,
    field: string,
    formulaId: string
  ): boolean {
    const actualType = typeof value;

    // Special handling for object type (could be plain object, but NOT array)
    if (expectedType === "object") {
      // Arrays should not be validated as primitive objects
      // They should be handled by the array validation logic
      if (Array.isArray(value)) {
        this.addValidationError(
          formulaId,
          field,
          `Expected object at path: ${path}, got: array`,
          path
        );
        return false;
      }

      if (typeof value !== "object" || value === null) {
        this.addValidationError(
          formulaId,
          field,
          `Expected object at path: ${path}, got: ${actualType}`,
          path
        );
        return false;
      }
      return true;
    }

    // Validate number, string, boolean
    if (actualType !== expectedType) {
      this.addValidationError(
        formulaId,
        field,
        `Expected ${expectedType} at path: ${path}, got: ${actualType}`,
        path
      );
      return false;
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

    for (const propDef of properties) {
      const { key, factorType } = propDef;
      const propPath = `${path}.${key}`;

      if (factorType.nullable === true) {
        continue;
      }

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

      // Use validateValue to handle arrays, nested objects, and primitives uniformly
      if (
        !this.validateValue(
          propValue as FormulaScalar,
          factorType,
          key,
          formulaId,
          propPath
        )
      ) {
        return false;
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
    stack?: string,
    level: LogLevel = "info"
  ): void {
    useFormulaLogStore.getState().addLog({
      formulaId,
      rowId: "unknown",
      inputs,
      level,
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
      const cleanedInputs = this.hydration(formula, inputs);

      const executionResult: FormulaExecutionResult =
        await this.executor.execute(formula, cleanedInputs);

      const { success, outputs, error, durationMs } = executionResult;

      if (success) {
        const resultValue = outputs ? Object.values(outputs)[0] : undefined;

        this.logExecution(
          formula.id,
          cleanedInputs,
          resultValue,
          undefined,
          durationMs,
          undefined,
          "info"
        );

        return {
          success: true,
          result: resultValue,
          executionTime: durationMs,
        };
      }

      this.logExecution(
        formula.id,
        cleanedInputs,
        undefined,
        error,
        durationMs
      );

      return {
        success: false,
        error,
        executionTime: durationMs,
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      const stack = error instanceof Error ? error.stack : undefined;
      const executionTime = Date.now() - startTime;

      const cleanedInputs = this.hydration(formula, inputs);

      this.logExecution(
        formula.id,
        cleanedInputs,
        undefined,
        errorMessage,
        executionTime,
        stack
      );

      return {
        success: false,
        error: errorMessage,
        executionTime,
      };
    }
  }

  /**
   * Clean nested object by removing fields not defined in properties
   * Recursively handles nested objects
   *
   * @param obj - The object value to clean
   * @param properties - Property definitions from factorType
   * @returns Cleaned object with only defined fields
   */
  private cleanNestedObject(
    obj: Record<string, unknown>,
    properties: NonNullable<FactorType["properties"]>
  ): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};

    for (const propDef of properties) {
      const { key, factorType } = propDef;
      const value = obj[key];

      if (value === undefined) {
        continue;
      }

      if (value === null) {
        cleaned[key] = value;
        continue;
      }

      if (
        factorType.baseType === "object" &&
        Array.isArray(factorType.properties) &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        cleaned[key] = this.cleanNestedObject(
          value as Record<string, unknown>,
          factorType.properties
        );
        continue;
      }

      if (Array.isArray(value) && factorType.array === true) {
        if (
          factorType.baseType === "object" &&
          Array.isArray(factorType.properties)
        ) {
          cleaned[key] = value.map((item) => {
            if (
              typeof item === "object" &&
              item !== null &&
              !Array.isArray(item)
            ) {
              return this.cleanNestedObject(
                item as Record<string, unknown>,
                factorType.properties!
              );
            }
            return item;
          });
        } else {
          cleaned[key] = value;
        }
        continue;
      }

      cleaned[key] = value;
    }

    return cleaned;
  }

  /**
   * Clean arguments based on formula definition
   * Removes fields that are not defined in the formula inputs
   * Handles nested objects recursively
   *
   * @param formula - Formula definition with input specifications
   * @param inputs - Input data to clean
   * @returns Cleaned input data with only defined fields
   */
  private hydration(
    formula: FormulaDefinition,
    inputs: Record<string, FormulaScalar>
  ): Record<string, FormulaScalar> {
    const cleaned: Record<string, FormulaScalar> = {};

    for (const inputDef of formula.inputs) {
      const { key, factorType } = inputDef;
      const value = inputs[key];

      if (value === undefined) {
        continue;
      }

      if (value === null) {
        cleaned[key] = value;
        continue;
      }

      if (
        factorType.baseType === "object" &&
        Array.isArray(factorType.properties) &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        cleaned[key] = this.cleanNestedObject(
          value as Record<string, unknown>,
          factorType.properties
        ) as FormulaScalar;
        continue;
      }

      if (Array.isArray(value) && factorType.array === true) {
        if (
          factorType.baseType === "object" &&
          Array.isArray(factorType.properties)
        ) {
          cleaned[key] = value.map((item) => {
            if (
              typeof item === "object" &&
              item !== null &&
              !Array.isArray(item)
            ) {
              return this.cleanNestedObject(
                item as Record<string, unknown>,
                factorType.properties!
              );
            }
            return item;
          }) as FormulaScalar;
        } else {
          cleaned[key] = value;
        }
        continue;
      }

      cleaned[key] = value;
    }

    return cleaned;
  }
}

export const dataSheetCalculator = new DataSheetCalculator();
