/**
 * Code Execution Utilities - Shared utilities for safe code compilation and execution
 *
 * This module provides shared functionality for:
 * - Creating safe execution contexts with controlled globals
 * - Extracting functions from compiled CommonJS modules
 * - Isolated code execution with proper sandboxing
 */

/**
 * Safe global variables that are allowed in the execution context
 */
const SAFE_GLOBALS = `
  const Math = globalThis.Math;
  const Number = globalThis.Number;
  const Date = globalThis.Date;
  const Object = globalThis.Object;
  const Array = globalThis.Array;
  const String = globalThis.String;
  const Boolean = globalThis.Boolean;
  const JSON = globalThis.JSON;
  const parseInt = globalThis.parseInt;
  const parseFloat = globalThis.parseFloat;
  const isNaN = globalThis.isNaN;
  const isFinite = globalThis.isFinite;
`;

/**
 * Dangerous global variables that should be blocked in the execution context
 */
const BLOCKED_GLOBALS = `
  const window = undefined;
  const document = undefined;
  const fetch = undefined;
  const XMLHttpRequest = undefined;
  const WebSocket = undefined;
  const localStorage = undefined;
  const sessionStorage = undefined;
  const indexedDB = undefined;
  const eval = undefined;
  const Function = undefined;
  const setTimeout = undefined;
  const setInterval = undefined;
  const setImmediate = undefined;
  const requestAnimationFrame = undefined;
  const importScripts = undefined;
`;

export class CodeExecutionUtils {
  /**
   * Creates a safe execution context for CommonJS modules
   *
   * @param code - Compiled JavaScript code to execute
   * @returns Wrapped code string with safe globals and CommonJS support
   */
  static createSafeExecutionContext(code: string): string {
    return `
      const exports = {};
      const module = { exports };

      ${SAFE_GLOBALS}

      ${code}

      return module.exports;
    `;
  }

  /**
   * Creates an isolated execution context with additional security measures
   *
   * @param code - Source code to execute
   * @param functionName - Function name to extract
   * @param allowedKeys - Array of allowed global identifiers
   * @returns Isolated code string for Function constructor
   */
  static createIsolatedExecutionContext(
    code: string,
    functionName: string,
    allowedKeys: string[] = []
  ): string {
    const destructuring = allowedKeys.length
      ? `const { ${allowedKeys.join(", ")} } = allowed;`
      : "";

    return `
      (function(allowed) {
        ${SAFE_GLOBALS}

        ${BLOCKED_GLOBALS}

        // Controlled require: only resolve whitelisted modules
        const require = (name) => {
          if (!Object.prototype.hasOwnProperty.call(allowed, name)) {
            throw new Error('Module "' + String(name) + '" is not allowed');
          }
          return allowed[name];
        };

        ${destructuring}

        ${code}

        if (typeof ${functionName} !== 'function') {
          throw new Error('Function ${functionName} not found in loaded code');
        }
        return ${functionName};
      })(allowed)
    `;
  }

  /**
   * Extracts the first function from a CommonJS exports object
   *
   * @param exports - CommonJS exports object
   * @returns The first function found in exports
   * @throws Error if no function is found
   */
  static extractFunction(exports: any): Function {
    let func: Function | undefined;

    // Look for the first exported function
    for (const value of Object.values(exports)) {
      if (typeof value === "function") {
        func = value as Function;
        break;
      }
    }

    if (!func) {
      throw new Error(
        "No function found in compiled code. Make sure your code exports a function."
      );
    }

    return func;
  }

  /**
   * Execute wrapped code safely using Function constructor
   *
   * @param wrappedCode - Code wrapped by createSafeExecutionContext
   * @returns Extracted function from the executed code
   * @throws Error if execution or function extraction fails
   */
  static executeWrappedCode(wrappedCode: string): Function {
    try {
      // Execute the wrapped code using Function constructor
      const factory = new Function(wrappedCode);
      const exports = factory();

      return CodeExecutionUtils.executeInIsolatedContext(exports);
    } catch (error) {
      throw new Error(
        `Failed to execute wrapped code: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Execute isolated code with allowed imports
   *
   * @param isolatedCode - Code wrapped by createIsolatedExecutionContext
   * @param allowedImports - Optional whitelisted modules to inject
   * @returns Extracted function from the isolated execution
   * @throws Error if execution or function extraction fails
   */
  static executeIsolatedCode(
    isolatedCode: string,
    allowedImports?: Record<string, unknown>
  ): Function {
    try {
      // Use Function constructor (safer than eval)
      const factory = new Function("allowed", "return " + isolatedCode);
      const frozenAllowed = CodeExecutionUtils.freezeAllowedImports(allowedImports);
      const func = factory(frozenAllowed);

      if (typeof func !== "function") {
        throw new Error(`Expected function but got ${typeof func}`);
      }

      return func;
    } catch (error) {
      throw new Error(
        `Failed to execute isolated code: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Safely execute exports from isolated context
   *
   * @param exports - CommonJS exports object
   * @returns Extracted function
   * @throws Error if function extraction fails
   */
  private static executeInIsolatedContext(exports: any): Function {
    try {
      return CodeExecutionUtils.extractFunction(exports);
    } catch (error) {
      throw new Error(
        `Failed to extract function from exports: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Freeze the container of allowed imports to prevent reassignment within sandbox
   *
   * @param allowedImports - Object containing allowed imports
   * @returns Frozen copy of allowed imports
   */
  static freezeAllowedImports(
    allowedImports?: Record<string, unknown>
  ): Record<string, unknown> {
    if (!allowedImports) return Object.freeze({});

    // Freeze only the container; avoid deep-freezing third-party modules to prevent side effects
    return Object.freeze({ ...allowedImports });
  }

  /**
   * Filter keys to valid JavaScript identifier names
   * Others must use require('name') syntax
   *
   * @param keys - Array of strings to validate
   * @returns Array of valid identifier names
   */
  static filterValidIdentifiers(keys: string[]): string[] {
    const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    return keys.filter((k) => IDENTIFIER_RE.test(k));
  }

  /**
   * Create a stable fingerprint for allowed imports for memory cache keying
   *
   * @param allowedImports - Object containing allowed imports
   * @returns Fingerprint string
   */
  static createImportsFingerprint(allowedImports?: Record<string, unknown>): string {
    if (!allowedImports) return "none";
    try {
      return Object.keys(allowedImports).sort().join("|");
    } catch {
      return "unknown";
    }
  }
}