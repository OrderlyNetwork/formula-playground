import { ParameterDeclaration, TypeNode, Type } from "ts-morph";
import { EnumDetector } from "./enum-detector";
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
    // Skip property extraction for Decimal, other numeric wrapper types, and enums
    if (
      baseType === "object" &&
      !this.isNumericWrapperType(type) &&
      !this.isEnumType(type)
    ) {
      const typeToAnalyze = array ? type.getArrayElementType() : type;
      if (typeToAnalyze) {
        const props = this.extractObjectProperties(typeToAnalyze);
        if (props.length > 0) {
          factor.properties = props;
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

    // Check if it's an enum type first
    if (EnumDetector.isEnumType(tsType)) {
      return EnumDetector.getEnumBaseType(tsType);
    }

    // Map common numeric wrapper types to number
    if (this.isNumericWrapperType(tsType)) {
      return "number";
    }

    // Check primitive types first (most reliable)
    if (tsType.isNumber()) return "number";
    if (tsType.isString()) return "string";
    if (tsType.isBoolean()) return "boolean";

    // Check if it's an object type by checking for properties
    const properties = tsType.getProperties();
    if (properties.length > 0) return "object";

    // Handle union types
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

    // If type text starts with '{', it's an inline object type literal, not a numeric wrapper
    // This prevents object types like { totalCollateral: Decimal; } from being
    // incorrectly identified as numeric wrappers just because they contain "Decimal" in property types
    if (typeText.trim().startsWith("{")) {
      return false;
    }

    // Check for decimal.js-light (Decimal) and other numeric wrapper types
    // The type might appear as an import path or direct type name
    return /decimal\.js-light|\.default|Decimal|BigNumber|Big|BN/.test(
      typeText
    );
  }

  /**
   * Check if the type is an enum type
   */
  private isEnumType(tsType: Type): boolean {
    return EnumDetector.isEnumType(tsType);
  }

  /**
   * Extract object type properties (one-level deep, arrays handled)
   */
  private extractObjectProperties(
    tsType: Type
  ): NonNullable<FactorType["properties"]> {
    const properties: NonNullable<FactorType["properties"]> = [];

    // Get properties, using enum detector for proper filtering
    const symbols = EnumDetector.isEnumType(tsType)
      ? EnumDetector.getEnumProperties(tsType)
      : tsType.getProperties().filter((symbol) => {
          const name = symbol.getName();
          // Filter out basic prototype properties for non-enum types
          const prototypeProperties = [
            "toString",
            "toLocaleString",
            "valueOf",
            "hasOwnProperty",
            "isPrototypeOf",
            "propertyIsEnumerable",
            "constructor",
            "__defineGetter__",
            "__defineSetter__",
            "__lookupGetter__",
            "__lookupSetter__",
            "__proto__",
          ];
          return !prototypeProperties.includes(name);
        });

    // If ts-morph can't find properties, try fallback parsing
    if (symbols.length === 0) {
      const typeText = tsType.getText();
      const fallbackProps = this.parsePropertiesFromTypeText(typeText);
      if (fallbackProps.length > 0) {
        return fallbackProps;
      }
    }

    for (const symbol of symbols) {
      const property = this.extractPropertyInfo(symbol);
      if (property) {
        properties.push(property);
      }
    }

    return properties;
  }

  /**
   * Extract information from a single property symbol
   */
  private extractPropertyInfo(
    symbol: any
  ): NonNullable<FactorType["properties"]>[0] | null {
    const key = symbol.getName();
    const decl = symbol.getValueDeclaration() ?? symbol.getDeclarations()?.[0];
    if (!decl) return null;

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

    // Extract nested properties for object types
    if (baseType === "object") {
      const nested = this.extractObjectProperties(elementType);
      if (nested.length > 0) factorType.properties = nested;
    }

    // Extract JSDoc comments
    const description = this.extractJSDocDescription(decl);

    return { key, type: baseType, factorType, description };
  }

  /**
   * Extract JSDoc description from a declaration
   */
  private extractJSDocDescription(decl: any): string | undefined {
    if (decl && "getJsDocs" in decl && typeof decl.getJsDocs === "function") {
      const jsDocs = (decl as any).getJsDocs();
      if (jsDocs && jsDocs.length > 0) {
        const jsDoc = jsDocs[0];
        return (
          jsDoc.getDescription?.()?.toString() ||
          jsDoc.getComment?.()?.toString().trim() ||
          undefined
        );
      }
    }
    return undefined;
  }

  /**
   * Parse properties from type text as fallback when ts-morph can't resolve types
   * Handles simple cases like: { holding: number; indexPrice: number; }
   */
  private parsePropertiesFromTypeText(
    typeText: string
  ): NonNullable<FactorType["properties"]> {
    const properties: NonNullable<FactorType["properties"]> = [];

    // Match object literal type: { prop1: type1; prop2: type2; }
    const objectMatch = typeText.match(/^\s*\{\s*(.+?)\s*\}\s*$/);
    if (!objectMatch) return properties;

    const content = objectMatch[1];

    // Simple split by semicolons - strip comments first for basic cases
    const cleanContent = content
      .replace(/\/\*\*.*?\*\//gs, "") // Remove multi-line comments
      .replace(/\/\/.*$/gm, ""); // Remove single-line comments

    const propStrings = cleanContent
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Parse each property string
    for (const propString of propStrings) {
      // Match property pattern: propertyName: type
      const propMatch = propString.match(/^(\w+)\s*:\s*(.+)$/);
      if (!propMatch) continue;

      const [, key, propTypeText] = propMatch;
      const isArray = propTypeText.includes("[]");

      // Extract element type for arrays (remove [] suffix)
      const elementTypeText = isArray
        ? propTypeText.replace(/\s*\[\]\s*$/, "").trim()
        : propTypeText;

      const baseType = this.inferTypeFromText(elementTypeText);

      const factorType: FactorType = {
        baseType,
        nullable: false, // Can't determine from text alone
        array: isArray,
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
    const cleanType = typeText.trim().replace("[]", "");

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
    // Skip property extraction for Decimal, other numeric wrapper types, and enums
    // If it's an array of objects, extract properties from the array element type
    if (
      baseType === "object" &&
      !this.isNumericWrapperType(returnType) &&
      !this.isEnumType(returnType)
    ) {
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
