import type { FormulaInputType, FactorType } from "@/types/formula";

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
 */
export function validateValueForFactorType(
  value: unknown,
  factorType: FactorType
): { isValid: boolean; error?: string } {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    if (factorType.nullable) {
      return { isValid: true };
    }
    return { isValid: false, error: "Value cannot be null or undefined" };
  }

  // Handle arrays
  if (factorType.array) {
    if (!Array.isArray(value)) {
      return { isValid: false, error: "Value must be an array" };
    }
    // Validate array elements recursively
    for (let i = 0; i < value.length; i++) {
      const elementValidation = validateValueForFactorType(value[i], {
        ...factorType,
        array: false, // Don't recurse on array property
      });
      if (!elementValidation.isValid) {
        return {
          isValid: false,
          error: `Array element at index ${i}: ${elementValidation.error}`,
        };
      }
    }
    return { isValid: true };
  }

  // Handle objects
  if (factorType.baseType === "object") {
    if (typeof value !== "object" || Array.isArray(value)) {
      return { isValid: false, error: "Value must be an object" };
    }

    if (factorType.properties) {
      const obj = value as Record<string, unknown>;
      for (const prop of factorType.properties) {
        const elementValidation = validateValueForFactorType(
          obj[prop.key],
          prop.factorType
        );
        if (!elementValidation.isValid) {
          return {
            isValid: false,
            error: `Property '${prop.key}': ${elementValidation.error}`,
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
      if (value === "") {
        return { isValid: true };
      }

      const num = Number(value);
      if (isNaN(num)) {
        return { isValid: false, error: "Value must be a valid number" };
      }

      // Check constraints
      if (
        factorType.constraints?.min !== undefined &&
        num < factorType.constraints.min
      ) {
        return {
          isValid: false,
          error: `Value must be >= ${factorType.constraints.min}`,
        };
      }
      if (
        factorType.constraints?.max !== undefined &&
        num > factorType.constraints.max
      ) {
        return {
          isValid: false,
          error: `Value must be <= ${factorType.constraints.max}`,
        };
      }
      return { isValid: true };
    }

    case "string": {
      if (typeof value !== "string") {
        return { isValid: false, error: "Value must be a string" };
      }

      // Check pattern constraint
      if (factorType.constraints?.pattern) {
        const regex = new RegExp(factorType.constraints.pattern);
        if (!regex.test(value)) {
          return {
            isValid: false,
            error: `Value must match pattern: ${factorType.constraints.pattern}`,
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
          };
        }
      }

      return { isValid: true };
    }

    case "boolean": {
      if (typeof value !== "boolean") {
        return { isValid: false, error: "Value must be a boolean" };
      }
      return { isValid: true };
    }

    default:
      return {
        isValid: false,
        error: `Unsupported type: ${factorType.baseType}`,
      };
  }
}

/**
 * Get input display type based on factor type
 */
export function getInputDisplayType(
  factorType: FactorType
): "text" | "number" | "select" | "textarea" {
  if (factorType.constraints?.enum) {
    return "select";
  }

  // number return text
  // if (factorType.baseType === "number") {
  //   return "number";
  // }

  if (factorType.baseType === "string" && factorType.constraints?.pattern) {
    return "text"; // Could be enhanced to support specific patterns
  }

  return "text";
}

/**
 * Get enum options for select input
 */
export function getEnumOptions(factorType: FactorType): string[] {
  return factorType.constraints?.enum || [];
}