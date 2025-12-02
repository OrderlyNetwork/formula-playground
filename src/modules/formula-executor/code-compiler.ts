import * as esbuild from "esbuild-wasm";
import { ErrorUtils } from "./utils/error-utils";

/**
 * CodeCompiler - Handles TypeScript to JavaScript compilation using esbuild-wasm
 *
 * This compiler is used to compile user-entered TypeScript code in developer mode
 * before execution. It uses esbuild-wasm for fast, browser-based compilation.
 *
 * Features:
 * - Lazy initialization of esbuild-wasm (only initializes on first use)
 * - Memory caching of compiled results to avoid redundant compilation
 * - Detailed error messages for compilation failures
 * - Supports ES2020 target with ESM format
 */
export class CodeCompiler {
  private static initialized = false;
  private static initPromise: Promise<void> | null = null;
  private compiledCache: Map<string, string> = new Map();

  /**
   * Initialize esbuild-wasm
   * Uses lazy initialization and ensures only one initialization happens
   * Uses CDN WASM URL for reliability across different environments
   */
  private async initialize(): Promise<void> {
    if (CodeCompiler.initialized) {
      return;
    }

    // If initialization is already in progress, wait for it
    if (CodeCompiler.initPromise) {
      return CodeCompiler.initPromise;
    }

    // Start initialization
    CodeCompiler.initPromise = esbuild.initialize({
      wasmURL: "https://unpkg.com/esbuild-wasm@0.24.2/esbuild.wasm",
    });

    try {
      await CodeCompiler.initPromise;
      CodeCompiler.initialized = true;
    } catch (error) {
      CodeCompiler.initPromise = null;
      throw new Error(
        `Failed to initialize esbuild-wasm: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Compile TypeScript code to JavaScript
   *
   * @param code - TypeScript source code to compile
   * @param cacheKey - Optional cache key to avoid recompiling identical code
   * @returns Compiled JavaScript code
   * @throws Error if compilation fails
   */
  async compileTypeScript(code: string, cacheKey?: string): Promise<string> {
    // Check cache first
    if (cacheKey && this.compiledCache.has(cacheKey)) {
      return this.compiledCache.get(cacheKey)!;
    }

    // Ensure esbuild is initialized
    await this.initialize();

    try {
      // Transform TypeScript to JavaScript
      // Use CommonJS format to avoid ESM export statements which can't be executed via Function constructor
      const result = await esbuild.transform(code, {
        loader: "ts",
        target: "es2020",
        format: "cjs",
        tsconfigRaw: {
          compilerOptions: {
            // Enable strict mode for better type checking
            strict: false,
            // Allow JavaScript expressions
            allowJs: true,
            // Preserve JSDoc comments
            removeComments: false,
          },
        },
      });

      // Cache the result if a cache key is provided
      if (cacheKey) {
        this.compiledCache.set(cacheKey, result.code);
      }

      return result.code;
    } catch (error) {
      // Format esbuild errors for better user feedback
      throw this.formatCompilationError(error);
    }
  }

  /**
   * Format compilation errors from esbuild into user-friendly messages
   * Uses shared error utilities for consistent formatting
   *
   * @param error - Error from esbuild compilation
   * @returns Formatted error with line numbers and descriptions
   */
  private formatCompilationError(error: any): Error {
    return ErrorUtils.formatCompilationError(error);
  }

  /**
   * Clear the compilation cache
   * Useful for memory management or when code needs to be recompiled
   */
  clearCache(): void {
    this.compiledCache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return {
      size: this.compiledCache.size,
      keys: Array.from(this.compiledCache.keys()),
    };
  }
}

// Create a singleton instance for shared use
export const codeCompiler = new CodeCompiler();
