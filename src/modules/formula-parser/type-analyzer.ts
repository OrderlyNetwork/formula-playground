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
    // Skip property extraction for Decimal, other numeric wrapper types, and enums
    if (baseType === "object" && !this.isNumericWrapperType(type) && !this.isEnumType(type)) {
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

    // Check if it's an enum type first (before primitive type checks and numeric wrapper detection)
    if (this.isEnumType(tsType)) {
      // For enums, check if they are string or number enums
      const properties = tsType.getProperties();
      if (properties.length > 0) {
        // Filter out prototype properties to get actual enum members
        const enumMembers = properties.filter(prop => {
          const name = prop.getName();
          const decl = prop.getValueDeclaration() ?? prop.getDeclarations()?.[0];

          // Only include properties that have declarations (actual enum members)
          if (!decl) return false;

          // Skip common Object.prototype properties and common JavaScript object properties
          const prototypeProperties = [
            'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty',
            'isPrototypeOf', 'propertyIsEnumerable', 'constructor',
            '__defineGetter__', '__defineSetter__', '__lookupGetter__',
            '__lookupSetter__', '__proto__', 'length', 'name', 'prototype',
            'apply', 'call', 'bind', 'arguments', 'caller', 'charAt',
            'charCodeAt', 'concat', 'indexOf', 'lastIndexOf', 'localeCompare',
            'match', 'replace', 'search', 'slice', 'split', 'substring',
            'toLowerCase', 'toLocaleLowerCase', 'toUpperCase', 'toLocaleUpperCase',
            'trim', 'substr', 'codePointAt', 'includes', 'endsWith', 'normalize',
            'repeat', 'startsWith', 'anchor', 'big', 'blink', 'bold', 'fixed',
            'fontcolor', 'fontsize', 'italics', 'link', 'small', 'strike',
            'sub', 'sup', 'padStart', 'padEnd', 'trimEnd', 'trimStart',
            'trimLeft', 'trimRight', 'matchAll'
          ];

          return !prototypeProperties.includes(name) && decl !== undefined;
        });

        if (enumMembers.length > 0) {
          const firstEnumMember = enumMembers[0];
          const propType = firstEnumMember.getTypeAtLocation(
            firstEnumMember.getValueDeclaration() || firstEnumMember.getDeclarations()?.[0]
          );
          const typeText = propType.getText();

          // String enums have quoted values, number enums have numeric values
          if (typeText.startsWith('"') || typeText.startsWith("'")) {
            return "string";
          } else if (/^\d+(\.\d+)?$/.test(typeText)) {
            return "number";
          }
        }
      }
      // Default to string for enums if we can't determine
      return "string";
    }

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
   * Check if the type is an enum type
   * Enum types should have their enum members extracted, not Object.prototype properties
   */
  private isEnumType(tsType: Type): boolean {
    const typeText = tsType.getText();

    // Check if this looks like an enum by its declaration
    const symbol = tsType.getSymbol();
    if (symbol) {
      const declarations = symbol.getDeclarations();
      if (declarations.length > 0) {
        const declaration = declarations[0];
        // Check if the declaration is an enum declaration
        // ts.SyntaxKind.EnumDeclaration = 267
        if (declaration.getKind() === 267) {
          return true;
        }
      }
    }

    // Fallback: check if the properties suggest this is an enum
    // String enums typically have uppercase property names with string values
    const properties = tsType.getProperties();
    if (properties.length > 0) {
      const enumLikeProperties = properties.filter(prop => {
        const name = prop.getName();
        const propType = prop.getTypeAtLocation(prop.getValueDeclaration() || prop.getDeclarations()?.[0]);
        const typeText = propType.getText();

        // Enum members are typically uppercase and have string literal types
        return /^[A-Z][A-Z0-9_]*$/.test(name) &&
               (typeText.startsWith('"') && typeText.endsWith('"') ||
                typeText.startsWith("'") && typeText.endsWith("'"));
      });

      // If we have multiple enum-like properties, this is likely an enum
      return enumLikeProperties.length >= 2;
    }

    // Additional fallback: check if type text suggests an enum pattern
    // e.g., "OrderSide" or "typeof OrderSide"
    return /^[A-Z][a-zA-Z0-9]*$/.test(typeText) ||
           /^typeof\s+[A-Z][a-zA-Z0-9]*$/.test(typeText);
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

    // For enum types, we want to be more selective about which properties we include
    let filteredSymbols = symbols;
    if (this.isEnumType(tsType)) {
      // For enums, only include actual enum members, not Object.prototype properties
      filteredSymbols = symbols.filter(symbol => {
        const name = symbol.getName();
        const decl = symbol.getValueDeclaration() ?? symbol.getDeclarations()?.[0];

        // Only include properties that have declarations (actual enum members)
        if (!decl) return false;

        // Skip all Object.prototype properties and common JavaScript object properties
        const prototypeProperties = [
          'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty',
          'isPrototypeOf', 'propertyIsEnumerable', 'constructor',
          '__defineGetter__', '__defineSetter__', '__lookupGetter__',
          '__lookupSetter__', '__proto__', 'length', 'name', 'prototype',
          'apply', 'call', 'bind', 'arguments', 'caller'
        ];

        // Include if it's not a prototype property and has a proper declaration
        return !prototypeProperties.includes(name) && decl !== undefined;
      });
    } else {
      // For non-enum types, just filter out obvious prototype properties
      filteredSymbols = symbols.filter(symbol => {
        const name = symbol.getName();

        // Skip common Object.prototype properties that might be enumerated
        const prototypeProperties = [
          'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty',
          'isPrototypeOf', 'propertyIsEnumerable', 'constructor',
          '__defineGetter__', '__defineSetter__', '__lookupGetter__',
          '__lookupSetter__', '__proto__'
        ];

        return !prototypeProperties.includes(name);
      });
    }

    for (const symbol of filteredSymbols) {
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

      // Extract properties for object types, including array element types
      // When isArray is true, elementType is the array element type (object)
      // When isArray is false, elementType is the property type itself
      if (baseType === "object") {
        const nested = this.extractObjectProperties(elementType);
        if (nested.length > 0) factorType.properties = nested;
      }

      // Extract JSDoc comments from property declaration
      let description: string | undefined;
      if (decl && 'getJsDocs' in decl && typeof decl.getJsDocs === 'function') {
        const jsDocs = (decl as any).getJsDocs();
        if (jsDocs && jsDocs.length > 0) {
          // Get description from JSDoc comment
          const jsDoc = jsDocs[0];
          description = jsDoc.getDescription?.()?.toString() || undefined;
          // If no description, try to get comment text
          if (!description) {
            const comment = jsDoc.getComment?.();
            if (comment) {
              description = comment.toString().trim() || undefined;
            }
          }
        }
      }

      properties.push({
        key,
        type: baseType,
        factorType,
        description,
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
   * Also extracts JSDoc comments from property definitions
   */
  private parsePropertiesFromTypeText(typeText: string): NonNullable<FactorType["properties"]> {
    const properties: NonNullable<FactorType["properties"]> = [];

    // Match object literal type: { prop1: type1; prop2: type2; }
    const objectMatch = typeText.match(/^\s*\{\s*(.+?)\s*\}\s*$/);
    if (!objectMatch) return properties;

    const content = objectMatch[1];

    // Split by semicolons and parse each property
    // We need to be careful with semicolons inside comments
    const propStrings: string[] = [];
    let currentProp = '';
    let inComment = false;
    let commentType: 'single' | 'multi' | null = null;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];
      const prevChar = i > 0 ? content[i - 1] : '';

      // Check for comment start
      if (!inComment && char === '/' && nextChar === '*') {
        inComment = true;
        commentType = 'multi';
        currentProp += char;
        i++; // Skip next char
        continue;
      } else if (!inComment && char === '/' && nextChar === '/') {
        inComment = true;
        commentType = 'single';
        currentProp += char;
        i++; // Skip next char
        continue;
      }

      // Check for comment end
      if (inComment && commentType === 'multi' && prevChar === '*' && char === '/') {
        inComment = false;
        commentType = null;
        currentProp += char;
        continue;
      } else if (inComment && commentType === 'single' && char === '\n') {
        inComment = false;
        commentType = null;
        currentProp += char;
        continue;
      }

      // Check for property separator (semicolon outside comments)
      if (!inComment && char === ';') {
        const trimmed = currentProp.trim();
        if (trimmed.length > 0) {
          propStrings.push(trimmed);
        }
        currentProp = '';
        continue;
      }

      currentProp += char;
    }

    // Add last property if exists
    const trimmed = currentProp.trim();
    if (trimmed.length > 0) {
      propStrings.push(trimmed);
    }

    // Parse each property string
    for (const propString of propStrings) {
      // Match JSDoc comment pattern: /** comment */ or // comment
      let description: string | undefined;
      let propContent = propString;

      // Match multi-line comment: /** ... */
      const multiCommentMatch = propString.match(/\/\*\*\s*(.+?)\s*\*\//s);
      if (multiCommentMatch) {
        description = multiCommentMatch[1].trim();
        propContent = propString.replace(/\/\*\*\s*.+?\s*\*\//s, '').trim();
      } else {
        // Match single-line comment: // comment
        const singleCommentMatch = propString.match(/\/\/\s*(.+?)(?:\n|$)/);
        if (singleCommentMatch) {
          description = singleCommentMatch[1].trim();
          propContent = propString.replace(/\/\/\s*.+?(?:\n|$)/, '').trim();
        }
      }

      // Match property pattern: propertyName: type
      const propMatch = propContent.match(/^(\w+)\s*:\s*(.+)$/);
      if (!propMatch) continue;

      const [, key, propTypeText] = propMatch;
      const isArray = propTypeText.includes('[]');
      
      // Extract element type for arrays (remove [] suffix)
      const elementTypeText = isArray 
        ? propTypeText.replace(/\s*\[\]\s*$/, '').trim()
        : propTypeText;
      
      const baseType = this.inferTypeFromText(elementTypeText);

      const factorType: FactorType = {
        baseType,
        nullable: false, // Can't determine from text alone
        array: isArray,
      };

      // Extract properties for object types, including array element types
      if (baseType === "object") {
        // Try to parse properties from the element type text
        const nestedProps = this.parsePropertiesFromTypeText(elementTypeText);
        if (nestedProps.length > 0) {
          factorType.properties = nestedProps;
        }
      }

      properties.push({
        key,
        type: baseType,
        factorType,
        description,
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
    // Skip property extraction for Decimal, other numeric wrapper types, and enums
    // If it's an array of objects, extract properties from the array element type
    if (baseType === "object" && !this.isNumericWrapperType(returnType) && !this.isEnumType(returnType)) {
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
