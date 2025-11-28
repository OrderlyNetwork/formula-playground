import { Type } from "ts-morph";

/**
 * Utility class for detecting enum types
 */
export class EnumDetector {
  /**
   * Check if the type is an enum type by looking at its declaration
   */
  static isEnumType(tsType: Type): boolean {
    const symbol = tsType.getSymbol();
    if (symbol) {
      const declarations = symbol.getDeclarations();
      if (declarations.length > 0) {
        const declaration = declarations[0];
        return declaration.getKind() === 267; // ts.SyntaxKind.EnumDeclaration
      }
    }
    return false;
  }

  /**
   * Get enum properties, filtering out Object.prototype properties
   */
  static getEnumProperties(tsType: Type) {
    const allProperties = tsType.getProperties();
    const prototypeProperties = this.getPrototypeProperties();

    return allProperties.filter(prop => {
      const name = prop.getName();
      const decl = prop.getValueDeclaration() ?? prop.getDeclarations()?.[0];

      return !prototypeProperties.includes(name) && decl !== undefined;
    });
  }

  /**
   * Get base type for enum (string or number)
   */
  static getEnumBaseType(tsType: Type): "string" | "number" {
    const enumMembers = this.getEnumProperties(tsType);
    if (enumMembers.length === 0) return "string";

    const firstMember = enumMembers[0];
    const propType = firstMember.getTypeAtLocation(
      firstMember.getValueDeclaration() || firstMember.getDeclarations()?.[0]
    );
    const typeText = propType.getText();

    return typeText.startsWith('"') || typeText.startsWith("'") ? "string" : "number";
  }

  /**
   * Common Object.prototype and JavaScript properties to filter out
   */
  private static getPrototypeProperties(): string[] {
    return [
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
  }
}