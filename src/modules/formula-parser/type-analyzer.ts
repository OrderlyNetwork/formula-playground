import { ParameterDeclaration, TypeNode, Type } from "ts-morph";
import type { FactorType, FormulaInputType } from "../../types/formula";

/**
 * TypeAnalyzer - Analyzes TypeScript types to extract factor information
 */
export class TypeAnalyzer {
  /**
   * Analyze parameter type and extract factor information
   */
  analyzeParameterType(param: ParameterDeclaration): FactorType {
    const typeNode = param.getTypeNode();
    const type = param.getType();

    // Base type identification
    const baseType = this.getBaseType(type);

    // Extract constraint information
    const constraints = this.extractConstraints(typeNode);

    // Check nullability
    const nullable = type.isNullable();

    // Check array type
    const array = type.isArray();

    const factor: FactorType = {
      baseType,
      constraints,
      nullable,
      array,
    };

    // For object-like parameters, extract structural properties
    // Skip property extraction for Decimal and other numeric wrapper types
    if (baseType === "object" && !this.isNumericWrapperType(type)) {
      const typeToAnalyze = array ? type.getArrayElementType() : type;
      if (typeToAnalyze) {
        const props = this.extractObjectProperties(typeToAnalyze);
        if (props.length > 0) {
          factor.properties = props;
        } else {
          // Fallback: try to parse from type text if property extraction failed
          // This handles cases where ts-morph can't fully resolve type aliases
          const typeText = typeToAnalyze.getText();
          const fallbackProps = this.parsePropertiesFromTypeText(typeText);
          if (fallbackProps.length > 0) {
            factor.properties = fallbackProps;
          }
        }
      }
    }

    return factor;
  }

  /**
   * Get base type from TypeScript type
   */
  private getBaseType(tsType: Type): FormulaInputType {
    // If it's an array, derive element base type
    if (tsType.isArray()) {
      const elem = tsType.getArrayElementType();
      if (elem) return this.getBaseType(elem);
      return "object";
    }

    const typeText = tsType.getText();

    // Map common numeric wrapper types to number
    // Decimal and other numeric wrapper types should be treated as primitive numbers
    if (/decimal\.js-light|\.default|Decimal|BigNumber|Big|BN/.test(typeText)) {
      return "number";
    }

    // Check primitive types first (more reliable than text matching)
    if (tsType.isNumber()) {
      return "number";
    } else if (tsType.isString()) {
      return "string";
    } else if (tsType.isBoolean()) {
      return "boolean";
    }

    // Check if it's an object type by checking for properties
    // This handles cases where ts-morph can't fully resolve the type
    const properties = tsType.getProperties();
    if (properties.length > 0) {
      return "object";
    }

    // Handle union types like "number | string" - only check text as fallback
    if (typeText.includes("|")) {
      const types = typeText.split("|").map((t) => t.trim());
      if (types.includes("number")) return "number";
      if (types.includes("string")) return "string";
      if (types.includes("boolean")) return "boolean";
    }

    // Fallback to object for complex types
    return "object";
  }

  /**
   * Check if the type is a Decimal or similar numeric wrapper type
   * These should be treated as primitive types without sub-properties
   */
  private isNumericWrapperType(tsType: Type): boolean {
    const typeText = tsType.getText();

    // Check for decimal.js-light (Decimal) and other numeric wrapper types
    // The type might appear as an import path or direct type name
    return /decimal\.js-light|\.default|Decimal|BigNumber|Big|BN/.test(typeText);
  }

  /**
   * Extract object type properties (one-level deep, arrays handled)
   */
  private extractObjectProperties(
    tsType: Type
  ): NonNullable<FactorType["properties"]> {
    const properties: NonNullable<FactorType["properties"]> = [];
    const symbols = tsType.getProperties();

    // If ts-morph can't find properties but type text suggests it's an object
    // Try to parse properties from type text (fallback for limited type resolution)
    if (symbols.length === 0) {
      const typeText = tsType.getText();
      const fallbackProps = this.parsePropertiesFromTypeText(typeText);
      if (fallbackProps.length > 0) {
        return fallbackProps;
      }
    }

    for (const symbol of symbols) {
      const key = symbol.getName();
      const decl =
        symbol.getValueDeclaration() ?? symbol.getDeclarations()?.[0];
      if (!decl) continue;
      const propType = symbol.getTypeAtLocation(decl);

      const isArray = propType.isArray();
      const elementType = isArray
        ? propType.getArrayElementType() ?? propType
        : propType;
      const baseType = this.getBaseType(elementType);

      const factorType: FactorType = {
        baseType,
        nullable: elementType.isNullable(),
        array: isArray,
      };

      if (baseType === "object" && !isArray) {
        const nested = this.extractObjectProperties(elementType);
        if (nested.length > 0) factorType.properties = nested;
      }

      properties.push({
        key,
        type: baseType,
        factorType,
      });
    }

    // Additional fallback: if we have no properties but type text suggests we should
    if (properties.length === 0) {
      const typeText = tsType.getText();
      const fallbackProps = this.parsePropertiesFromTypeText(typeText);
      if (fallbackProps.length > 0) {
        return fallbackProps;
      }
    }

    return properties;
  }

  /**
   * Parse properties from type text as fallback when ts-morph can't resolve types
   * Handles cases like: { holding: number; indexPrice: number; }
   */
  private parsePropertiesFromTypeText(typeText: string): NonNullable<FactorType["properties"]> {
    const properties: NonNullable<FactorType["properties"]> = [];

    // Match object literal type: { prop1: type1; prop2: type2; }
    const objectMatch = typeText.match(/^\s*\{\s*(.+?)\s*\}\s*$/);
    if (!objectMatch) return properties;

    const content = objectMatch[1];

    // Split by semicolons and parse each property
    const propStrings = content.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const propString of propStrings) {
      // Match property pattern: propertyName: type
      const propMatch = propString.match(/^(\w+)\s*:\s*(.+)$/);
      if (!propMatch) continue;

      const [, key, propTypeText] = propMatch;
      const baseType = this.inferTypeFromText(propTypeText);

      const factorType: FactorType = {
        baseType,
        nullable: false, // Can't determine from text alone
        array: propTypeText.includes('[]'),
      };

      properties.push({
        key,
        type: baseType,
        factorType,
      });
    }

    return properties;
  }

  /**
   * Infer base type from type text (simple inference)
   */
  private inferTypeFromText(typeText: string): FormulaInputType {
    const cleanType = typeText.trim().replace('[]', '');

    // Check for common number types
    if (/^(number|decimal|big(int|number)|bn)$/i.test(cleanType)) {
      return "number";
    }

    // Check for string types
    if (/^(string|str)$/i.test(cleanType)) {
      return "string";
    }

    // Check for boolean types
    if (/^(boolean|bool)$/i.test(cleanType)) {
      return "boolean";
    }

    // Default to object for complex types
    return "object";
  }

  /**
   * Extract constraints from type node
   */
  private extractConstraints(
    typeNode: TypeNode | undefined
  ): FactorType["constraints"] {
    const constraints: FactorType["constraints"] = {};

    if (!typeNode) return constraints;

    const typeText = typeNode.getText();

    // Extract numeric range constraints
    const rangeMatch = typeText.match(/(\d+)\s*\.\.\s*(\d+)/);
    if (rangeMatch) {
      constraints.min = parseInt(rangeMatch[1]);
      constraints.max = parseInt(rangeMatch[2]);
    }

    // Extract enum value constraints
    const enumMatch = typeText.match(/\|\s*['"]([^'"]+)['"]/g);
    if (enumMatch) {
      constraints.enum = enumMatch.map((match) =>
        match.replace(/\|\s*['"]|['"]/g, "")
      );
    }

    // Extract regex pattern constraints
    const patternMatch = typeText.match(/pattern:\s*['"]([^'"]+)['"]/);
    if (patternMatch) {
      constraints.pattern = patternMatch[1];
    }

    return constraints;
  }

  /**
   * Analyze return type to determine output factor
   */
  analyzeReturnType(returnTypeNode: TypeNode | undefined): FactorType {
    if (!returnTypeNode) {
      return { baseType: "number" }; // Default return number
    }

    const returnType = returnTypeNode.getType();
    const baseType = this.getBaseType(returnType);
    const array = returnType.isArray();

    const factor: FactorType = {
      baseType,
      nullable: returnType.isNullable(),
      array,
    };

    // For object return types, extract structural properties
    // Skip property extraction for Decimal and other numeric wrapper types
    // If it's an array of objects, extract properties from the array element type
    if (baseType === "object" && !this.isNumericWrapperType(returnType)) {
      const typeToAnalyze = array
        ? returnType.getArrayElementType()
        : returnType;
      if (typeToAnalyze) {
        const props = this.extractObjectProperties(typeToAnalyze);
        if (props.length > 0) factor.properties = props;
      }
    }

    return factor;
  }
}
