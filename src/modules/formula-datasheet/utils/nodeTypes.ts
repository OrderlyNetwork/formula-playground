import type { FormulaInputType, FactorType } from "@/types/formula";

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  path?: string;
}

/**
 * Regex cache for pattern validation
 */
const regexCache = new Map<string, RegExp>();

/**
 * Get compiled regex pattern from cache
 */
function getCompiledPattern(pattern: string): RegExp {
  if (!regexCache.has(pattern)) {
    regexCache.set(pattern, new RegExp(pattern));
  }
  return regexCache.get(pattern)!;
}

/**
 * Maximum recursion depth for nested validation
 */
const MAX_RECURSION_DEPTH = 20;

/**
 * Type guard for object values
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Connection configuration for a node handle
 */
export interface ConnectionConfig {
  acceptedTypes: FormulaInputType[];
  maxConnections?: number;
  allowArray?: boolean;
  allowObject?: boolean;
  description?: string;
}

/**
 * Node connection configuration
 */
export interface NodeConnectionConfig {
  source?: ConnectionConfig;
  target?: ConnectionConfig;
  properties?: Record<string, ConnectionConfig>; // For object nodes
}

/**
 * Get connection configuration based on factor type
 */
export function getConnectionConfigFromFactorType(
  factorType: FactorType
): ConnectionConfig {
  const acceptedTypes: FormulaInputType[] = [factorType.baseType];

  // Add object support for composite types
  if (factorType.baseType === "object" && factorType.properties) {
    acceptedTypes.push("object");
  }

  // Add array support if array is enabled
  if (factorType.array) {
    acceptedTypes.push("object"); // Arrays are objects in JavaScript
  }

  return {
    acceptedTypes,
    maxConnections: 1, // Default: single connection
    allowArray: factorType.array,
    allowObject: factorType.baseType === "object",
  };
}

/**
 * Check if a value conforms to the factor type constraints
 * @param value - The value to validate
 * @param factorType - The expected factor type
 * @param path - Current path for error reporting (used internally for recursion)
 * @param depth - Current recursion depth (used internally for depth protection)
 */
export function validateValueForFactorType(
  value: unknown,
  factorType: FactorType,
  path = "value",
  depth = 0
): ValidationResult {
  // Recursion depth protection
  if (depth > MAX_RECURSION_DEPTH) {
    return {
      isValid: false,
      error: `Maximum nesting depth (${MAX_RECURSION_DEPTH}) exceeded`,
      path,
    };
  }

  // Handle null/undefined values
  if (value === null || value === undefined) {
    if (factorType.nullable) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: "Value cannot be null or undefined",
      path,
    };
  }

  // Handle arrays
  if (factorType.array) {
    if (!Array.isArray(value)) {
      return {
        isValid: false,
        error: "Value must be an array",
        path,
      };
    }

    // Create element factor type once for efficiency
    const elementFactorType = { ...factorType, array: false };

    // Validate array elements recursively
    for (let i = 0; i < value.length; i++) {
      const elementPath = `${path}[${i}]`;
      const elementValidation = validateValueForFactorType(
        value[i],
        elementFactorType,
        elementPath,
        depth + 1
      );

      if (!elementValidation.isValid) {
        return {
          isValid: false,
          error: elementValidation.error
            ? `Array element at index ${i}: ${elementValidation.error}`
            : undefined,
          path: elementPath,
        };
      }
    }

    return { isValid: true };
  }

  // Handle objects
  if (factorType.baseType === "object") {
    if (!isObject(value)) {
      return {
        isValid: false,
        error: "Value must be an object",
        path,
      };
    }

    if (factorType.properties) {
      for (const prop of factorType.properties) {
        // Prevent prototype pollution
        if (prop.key === "__proto__" || prop.key === "constructor") {
          return {
            isValid: false,
            error: `Reserved property name: '${prop.key}'`,
            path,
          };
        }

        // Skip validation for missing optional properties
        // (undefined values are allowed for object properties to support partial data)
        const propertyValue = value[prop.key];
        if (propertyValue === undefined) {
          continue;
        }

        const propertyPath = `${path}.${prop.key}`;
        const elementValidation = validateValueForFactorType(
          propertyValue,
          prop.factorType,
          propertyPath,
          depth + 1
        );

        if (!elementValidation.isValid) {
          return {
            isValid: false,
            error: elementValidation.error
              ? `Property '${prop.key}': ${elementValidation.error}`
              : undefined,
            path: propertyPath,
          };
        }
      }
    }

    return { isValid: true };
  }

  // Handle primitive types
  switch (factorType.baseType) {
    case "number": {
      // Allow empty strings for number fields (user input clearing)
      // Note: This should be handled at the UI layer, but is kept for backward compatibility
      if (value === "") {
        return { isValid: true };
      }

      let num: number;

      // If value is already a number, use it directly
      if (typeof value === "number") {
        num = value;
      }
      // If value is a string, try to convert to number
      else if (typeof value === "string") {
        num = Number(value);
        if (isNaN(num)) {
          return {
            isValid: false,
            error: "Value must be a valid number",
            path,
          };
        }
      }
      // For other types (boolean, object, etc.), return error
      else {
        return {
          isValid: false,
          error: "Value must be a number or numeric string",
          path,
        };
      }

      // Check constraints with the resolved number
      if (
        factorType.constraints?.min !== undefined &&
        num < factorType.constraints.min
      ) {
        return {
          isValid: false,
          error: `Value must be >= ${factorType.constraints.min}`,
          path,
        };
      }
      if (
        factorType.constraints?.max !== undefined &&
        num > factorType.constraints.max
      ) {
        return {
          isValid: false,
          error: `Value must be <= ${factorType.constraints.max}`,
          path,
        };
      }

      return { isValid: true };
    }

    case "string": {
      if (typeof value !== "string") {
        return {
          isValid: false,
          error: "Value must be a string",
          path,
        };
      }

      // Check pattern constraint (uses cached regex)
      if (factorType.constraints?.pattern) {
        const regex = getCompiledPattern(factorType.constraints.pattern);
        if (!regex.test(value)) {
          return {
            isValid: false,
            error: `Value must match pattern: ${factorType.constraints.pattern}`,
            path,
          };
        }
      }

      // Check enum constraint
      if (factorType.constraints?.enum) {
        if (!factorType.constraints.enum.includes(value)) {
          return {
            isValid: false,
            error: `Value must be one of: ${factorType.constraints.enum.join(
              ", "
            )}`,
            path,
          };
        }
      }

      return { isValid: true };
    }

    case "boolean": {
      if (typeof value !== "boolean") {
        return {
          isValid: false,
          error: "Value must be a boolean",
          path,
        };
      }
      return { isValid: true };
    }

    default:
      return {
        isValid: false,
        error: `Unsupported type: ${factorType.baseType}`,
        path,
      };
  }
}

/**
 * Input display type for form controls
 */
export type InputDisplayType = "text" | "select";

/**
 * Get input display type based on factor type
 *
 * Note: We return "text" for number inputs instead of "number" because:
 * 1. Text inputs provide better UX for decimal number entry
 * 2. We handle number conversion and validation in the onChange handler
 * 3. Number inputs have inconsistent browser behavior for validation
 */
export function getInputDisplayType(
  factorType: FactorType
): InputDisplayType {
  if (factorType.constraints?.enum) {
    return "select";
  }

  // All other types use text input with appropriate validation
  return "text";
}

/**
 * Get enum options for select input
 */
export function getEnumOptions(factorType: FactorType): string[] {
  return factorType.constraints?.enum || [];
}
