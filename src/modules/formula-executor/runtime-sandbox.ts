/**
 * Runtime Sandbox for Dynamic Formula Execution
 * Loads pre-built JavaScript from jsDelivr, compiles with restricted globals, and caches
 */

import { CacheManager } from "./cache-manager";
import type { CompiledFormula } from "../../types/formula";

/**
 * @description Safe TypeScript/JavaScript runtime sandbox for dynamic formula execution
 * Loads from jsDelivr, restricts global access, and caches compiled functions
 */
export class TypeScriptRuntimeSandbox {
  /**
   * @description In-memory cache for compiled functions (performance optimization)
   */
  private memoryCache: Map<string, Function> = new Map();

  /**
   * @description Cache manager for IndexedDB persistence
   */
  private cacheManager: CacheManager;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * @description Load function from jsDelivr with multi-level caching
   * @param jsdelivrUrl - Full jsDelivr CDN URL
   * @param functionName - Function name to extract from loaded code
   * @param formulaId - Formula ID for cache key
   * @param version - Version for cache key
   * @returns Compiled function ready for execution
   */
  async loadFromJsDelivr(
    jsdelivrUrl: string,
    functionName: string,
    formulaId: string,
    version: string
  ): Promise<Function> {
    // Check memory cache first (fastest)
    const memoryCacheKey = `${formulaId}:${version}`;
    if (this.memoryCache.has(memoryCacheKey)) {
      return this.memoryCache.get(memoryCacheKey)!;
    }

    // Check IndexedDB cache (fast)
    const cached = await this.cacheManager.getCompiled(formulaId, version);
    if (cached) {
      try {
        const func = this.compileFromCached(cached);
        this.memoryCache.set(memoryCacheKey, func);
        return func;
      } catch (error) {
        console.warn(
          `Failed to compile from cache, re-fetching from jsDelivr:`,
          error
        );
        // Cache corruption, continue to fetch
      }
    }

    // Fetch from jsDelivr (slow, network request)
    const response = await fetch(jsdelivrUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch from jsDelivr: ${response.status} ${response.statusText}`
      );
    }
    const code = await response.text();

    // Compile in sandbox
    const func = this.compileFromSource(code, functionName);

    // Save to caches
    const compiled: CompiledFormula = {
      id: `${formulaId}:${version}`,
      formulaId,
      version,
      jsdelivrUrl,
      compiledCode: code,
      functionName,
      timestamp: Date.now(),
      hash: this.hashCode(code),
    };

    try {
      await this.cacheManager.saveCompiled(compiled);
    } catch (error) {
      console.warn("Failed to save to IndexedDB cache:", error);
      // Non-fatal, continue with memory cache
    }

    this.memoryCache.set(memoryCacheKey, func);

    return func;
  }

  /**
   * @description Compile function from cached compiled formula
   */
  private compileFromCached(cached: CompiledFormula): Function {
    // Verify integrity
    const currentHash = this.hashCode(cached.compiledCode);
    if (currentHash !== cached.hash) {
      throw new Error("Cache integrity check failed");
    }

    return this.compileFromSource(cached.compiledCode, cached.functionName);
  }

  /**
   * @description Compile function from source code with sandbox isolation
   */
  private compileFromSource(code: string, functionName: string): Function {
    // Create isolated execution context
    const isolatedCode = this.createIsolatedContext(code, functionName);

    try {
      // Use Function constructor (safer than eval)
      const factory = new Function("return " + isolatedCode);
      const func = factory();

      if (typeof func !== "function") {
        throw new Error(`Expected function but got ${typeof func}`);
      }

      return func;
    } catch (error) {
      throw new Error(
        `Failed to compile function ${functionName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * @description Create isolated execution context with restricted globals
   * Wraps code in IIFE with whitelisted globals and blocked dangerous operations
   */
  private createIsolatedContext(code: string, functionName: string): string {
    return `
      (function() {
        // Whitelist: Allow access to safe globals
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
        
        // Block: Prevent access to dangerous globals
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
        
        // Execute loaded code
        ${code}
        
        // Extract and return target function
        if (typeof ${functionName} !== 'function') {
          throw new Error('Function ${functionName} not found in loaded code');
        }
        return ${functionName};
      })()
    `;
  }

  /**
   * @description Simple string hash for integrity verification
   * Uses basic hash algorithm for reasonable performance
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * @description Clear memory cache (useful for testing or memory management)
   */
  clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  /**
   * @description Get cache statistics
   */
  getCacheStats() {
    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
    };
  }
}

