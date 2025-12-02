/**
 * Error Handling Utilities - Shared utilities for error formatting and processing
 *
 * This module provides shared functionality for:
 * - Formatting esbuild compilation errors
 * - Processing runtime errors
 * - Providing user-friendly error messages
 */

export class ErrorUtils {
  /**
   * Format compilation errors from esbuild into user-friendly messages
   *
   * @param error - Error from esbuild compilation
   * @returns Formatted Error with line numbers and descriptions
   */
  static formatCompilationError(error: any): Error {
    // Handle esbuild-specific error format
    if (error && typeof error === "object" && "errors" in error) {
      const errors = error.errors as any[];
      if (errors && errors.length > 0) {
        const firstError = errors[0];
        const location = firstError.location;
        const text = firstError.text || "Unknown compilation error";

        if (location) {
          const line = location.line;
          const column = location.column;
          const lineText = location.lineText || "";

          return new Error(
            `Compilation error at line ${line}, column ${column}:\n${text}\n${lineText}`
          );
        }

        return new Error(`Compilation error: ${text}`);
      }
    }

    // Handle generic errors
    if (error instanceof Error) {
      return error;
    }

    return new Error(`Compilation failed: ${String(error)}`);
  }

  /**
   * Format execution errors into user-friendly messages
   *
   * @param error - Error from execution
   * @param context - Additional context about where error occurred
   * @returns Formatted error message string
   */
  static formatExecutionError(error: any, context?: string): string {
    const contextPrefix = context ? `[${context}] ` : "";

    // Handle runtime errors
    if (error instanceof Error) {
      return `${contextPrefix}Execution error: ${error.message}`;
    }

    // Handle string errors
    if (typeof error === "string") {
      return `${contextPrefix}Execution error: ${error}`;
    }

    // Handle unknown errors
    return `${contextPrefix}Execution error: ${String(error)}`;
  }

  /**
   * Format function extraction errors
   *
   * @param error - Error from function extraction
   * @param functionName - Name of the function being extracted
   * @returns Formatted error message string
   */
  static formatExtractionError(error: any, functionName?: string): string {
    const funcName = functionName || "unknown";
    const baseMessage = `Failed to extract function '${funcName}'`;

    if (error instanceof Error) {
      return `${baseMessage}: ${error.message}`;
    }

    return `${baseMessage}: ${String(error)}`;
  }

  /**
   * Format module loading errors
   *
   * @param error - Error from module loading
   * @param url - URL of the module that failed to load
   * @returns Formatted error message string
   */
  static formatModuleLoadError(error: any, url?: string): string {
    const urlPart = url ? ` from ${url}` : "";

    if (error instanceof Error) {
      return `Failed to load module${urlPart}: ${error.message}`;
    }

    return `Failed to load module${urlPart}: ${String(error)}`;
  }

  /**
   * Format cache-related errors
   *
   * @param error - Error from cache operation
   * @param operation - Type of cache operation (get, set, clear, etc.)
   * @returns Formatted error message string
   */
  static formatCacheError(error: any, operation?: string): string {
    const op = operation || "operation";

    if (error instanceof Error) {
      return `Cache ${op} failed: ${error.message}`;
    }

    return `Cache ${op} failed: ${String(error)}`;
  }

  /**
   * Format WebAssembly initialization errors
   *
   * @param error - Error from WASM initialization
   * @returns Formatted error message string
   */
  static formatWasmError(error: any): Error {
    const baseMessage = "Failed to initialize WebAssembly module";

    if (error instanceof Error) {
      return new Error(`${baseMessage}: ${error.message}`);
    }

    return new Error(`${baseMessage}: ${String(error)}`);
  }

  /**
   * Create a standardized error with context information
   *
   * @param message - Error message
   * @param context - Context object with additional error details
   * @returns Error with formatted message
   */
  static createContextualError(message: string, context?: Record<string, any>): Error {
    if (!context || Object.keys(context).length === 0) {
      return new Error(message);
    }

    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(", ");

    return new Error(`${message} (Context: ${contextStr})`);
  }

  /**
   * Determine if error is a network-related error
   *
   * @param error - Error to check
   * @returns True if error is network-related
   */
  static isNetworkError(error: any): boolean {
    if (!error) return false;

    const message = error instanceof Error ? error.message : String(error);
    const networkKeywords = [
      "network",
      "fetch",
      "connection",
      "timeout",
      "cors",
      "offline",
      "unreachable",
    ];

    return networkKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  }

  /**
   * Determine if error is a syntax/compilation error
   *
   * @param error - Error to check
   * @returns True if error is syntax-related
   */
  static isSyntaxError(error: any): boolean {
    if (!error) return false;

    const message = error instanceof Error ? error.message : String(error);
    const syntaxKeywords = [
      "syntax",
      "parsing",
      "unexpected token",
      "unexpected identifier",
      "unexpected end of input",
      "invalid or unexpected token",
    ];

    return syntaxKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  }

  /**
   * Determine if error is a runtime error (not compilation)
   *
   * @param error - Error to check
   * @returns True if error is runtime-related
   */
  static isRuntimeError(error: any): boolean {
    if (!error) return false;

    const message = error instanceof Error ? error.message : String(error);
    const runtimeKeywords = [
      "reference",
      "type",
      "range",
      "cannot read",
      "cannot access",
      "not defined",
      "is not a function",
    ];

    return runtimeKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  }
}