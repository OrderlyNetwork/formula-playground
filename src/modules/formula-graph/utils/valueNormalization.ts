/**
 * Value Normalization Utilities
 * 
 * Centralizes type normalization logic to eliminate code duplication
 * Used primarily by ArrayNode for consistent value handling
 */

import type { FactorType } from "@/types/formula";

/**
 * Normalize a value according to its factorType
 * Centralizes the type conversion logic used throughout ArrayNode
 * 
 * @param value - The value to normalize
 * @param factorType - The factorType definition that describes the expected type
 * @returns Normalized value of the correct type
 * 
 * @example
 * normalizeValueByFactorType("123", { baseType: "number", nullable: false })
 * // Returns: 123
 * 
 * normalizeValueByFactorType("", { baseType: "number", nullable: true })
 * // Returns: null
 */
export function normalizeValueByFactorType(
  value: unknown,
  factorType: FactorType
): unknown {
  // Handle null/undefined values
  if (value === undefined || value === null) {
    // Return null if nullable, otherwise return type-specific default
    if (!factorType.nullable) {
      switch (factorType.baseType) {
        case "number":
          return 0;
        case "boolean":
          return false;
        case "string":
          return "";
        default:
          return null;
      }
    }
    return null;
  }

  // Convert to proper type based on baseType
  switch (factorType.baseType) {
    case "number": {
      // Handle empty string for number type
      if (typeof value === "string" && value === "") {
        return factorType.nullable ? null : 0;
      }
      
      const num = Number(value);
      return isNaN(num)
        ? factorType.nullable
          ? null
          : 0
        : num;
    }
    
    case "boolean":
      return Boolean(value);
    
    case "string":
      return String(value);
    
    default:
      return value;
  }
}

/**
 * Check if a normalized value should be filtered out
 * Used during array normalization to filter invalid items
 * 
 * @param normalizedValue - The normalized value to check
 * @param factorType - The factorType definition
 * @returns true if the value should be filtered out
 */
export function shouldFilterValue(
  normalizedValue: unknown,
  factorType: FactorType
): boolean {
  // Filter empty strings for non-nullable types (except number during editing)
  if (
    normalizedValue === "" &&
    !factorType.nullable &&
    factorType.baseType !== "number"
  ) {
    return true;
  }
  
  // Filter null values for non-nullable types
  if (normalizedValue === null && !factorType.nullable) {
    return true;
  }
  
  return false;
}





