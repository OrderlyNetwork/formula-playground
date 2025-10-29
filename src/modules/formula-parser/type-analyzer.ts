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
    const constraints = this.extractConstraints(typeNode, type);

    // Check nullability
    const nullable = type.isNullable();

    // Check array type
    const array = type.isArray();

    return {
      baseType,
      constraints,
      nullable,
      array,
    };
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

    if (tsType.isNumber() || typeText.includes("number")) {
      return "number";
    } else if (tsType.isString() || typeText.includes("string")) {
      return "string";
    } else if (tsType.isBoolean() || typeText.includes("boolean")) {
      return "boolean";
    }

    // Handle union types like "number | string"
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
   * Extract constraints from type node
   */
  private extractConstraints(
    typeNode: TypeNode | undefined,
    _type: Type
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

    return {
      baseType,
      nullable: returnType.isNullable(),
      array: returnType.isArray(),
    };
  }
}
