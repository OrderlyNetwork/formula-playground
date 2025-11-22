/**
 * Default Value Generator Utilities
 * 
 * Centralizes default value generation logic to ensure consistency
 * across ArrayNode operations
 */

import type { FactorType } from "@/types/formula";

/**
 * Property definition for object arrays
 */
export interface PropertyDefinition {
  key: string;
  type: string;
  factorType: FactorType;
  default?: unknown;
}

/**
 * Generate default value for a factorType
 * Uses consistent strategy: constraints?.min for numbers, type-specific defaults otherwise
 * 
 * @param factorType - The factorType definition
 * @param propertyDefault - Optional explicit default value from property definition
 * @returns Default value appropriate for the factorType
 * 
 * @example
 * getDefaultValueForFactorType({ baseType: "number", nullable: false, constraints: { min: 10 } })
 * // Returns: 10
 * 
 * getDefaultValueForFactorType({ baseType: "string", nullable: true })
 * // Returns: null
 */
export function getDefaultValueForFactorType(
  factorType: FactorType,
  propertyDefault?: unknown
): unknown {
  // Use explicit default if provided
  if (propertyDefault !== undefined) {
    return propertyDefault;
  }

  // Generate default based on baseType
  switch (factorType.baseType) {
    case "number":
      // Use constraints.min if available, otherwise 0 (or null if nullable)
      return factorType.constraints?.min ?? (factorType.nullable ? null : 0);
    
    case "boolean":
      return false;
    
    case "string":
      return factorType.nullable ? null : "";
    
    case "object": {
      // For nested objects, create object with default values for properties
      if (factorType.properties && factorType.properties.length > 0) {
        const nestedObj: Record<string, unknown> = {};
        factorType.properties.forEach((prop) => {
          nestedObj[prop.key] = getDefaultValueForFactorType(
            prop.factorType,
            prop.default
          );
        });
        return nestedObj;
      }
      return {};
    }
    
    default:
      return factorType.nullable ? null : undefined;
  }
}

/**
 * Generate default value for a property in an object array
 * 
 * @param property - The property definition
 * @returns Default value for the property
 */
export function getDefaultValueForProperty(
  property: PropertyDefinition
): unknown {
  return getDefaultValueForFactorType(
    property.factorType,
    property.default
  );
}





