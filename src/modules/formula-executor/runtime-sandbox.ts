import { CacheManager } from "./cache-manager";
import type { CompiledFormula } from "../../types/formula";

/**
 * @description Safe runtime sandbox for dynamic formula execution
 * Loads from jsDelivr, restricts global access, and caches compiled functions
 */
export class TypeScriptRuntimeSandbox {
  private memoryCache: Map<string, (...args: unknown[]) => unknown> = new Map();
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
   * @param allowedImports - Optional map of whitelisted modules to inject (for external deps)
   * @returns Compiled function ready for execution
   *
   * @example
   * import * as orderlyUtils from "@orderly.network/utils";
   * import * as orderlyTypes from "@orderly.network/types";
   *
   * const allowed = {
   *   "@orderly.network/utils": orderlyUtils,
   *   "@orderly.network/types": orderlyTypes,
   * };
   *
   * const fn = await sandbox.loadFromJsDelivr(
   *   jsDelivrUrl,
   *   "someExportedFunction",
   *   formulaId,
   *   version,
   *   allowed
   * );
   */
  async loadFromJsDelivr(
    jsdelivrUrl: string,
    functionName: string,
    formulaId: string,
    version: string,
    allowedImports?: Record<string, unknown>
  ): Promise<(...args: unknown[]) => unknown> {
    // Include a fingerprint of allowed imports in the in-memory cache key to avoid collisions
    const memoryCacheKey = `${formulaId}:${version}:${this.allowedImportsFingerprint(
      allowedImports
    )}`;
    if (this.memoryCache.has(memoryCacheKey)) {
      return this.memoryCache.get(memoryCacheKey)!;
    }

    const cached = await this.cacheManager.getCompiled(formulaId, version);
    if (cached) {
      try {
        const func = this.compileFromCached(cached, allowedImports);
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

    const response = await fetch(jsdelivrUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch from jsDelivr: ${response.status} ${response.statusText}`
      );
    }
    const code = await response.text();

    const func = this.compileFromSource(code, functionName, allowedImports);

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
   * @description Convenience loader for npm packages hosted on jsDelivr
   * Builds URL like: https://cdn.jsdelivr.net/npm/<package>@<version>/dist/index.js
   * @param packageName - e.g. "@orderly.network/perp"
   * @param version - e.g. "4.8.1" or "latest"
   * @param functionName - Exported function name to execute
   * @param formulaId - Formula ID for cache keying
   * @param allowedImports - Optional whitelist of injected modules
   */
  async loadFromNpmPackage(
    packageName: string,
    version: string,
    functionName: string,
    formulaId: string,
    allowedImports?: Record<string, unknown>
  ): Promise<(...args: unknown[]) => unknown> {
    const pkg =
      packageName && packageName.trim().length > 0
        ? packageName.trim()
        : "@orderly.network/perp";
    const ver =
      version && version.trim().length > 0 ? version.trim() : "latest";
    const url = this.buildNpmJsDelivrUrl(pkg, ver);
    return this.loadFromJsDelivr(
      url,
      functionName,
      formulaId,
      ver,
      allowedImports
    );
  }

  /**
   * @description Build jsDelivr npm URL for a given package and version
   */
  private buildNpmJsDelivrUrl(packageName: string, version: string): string {
    return `https://cdn.jsdelivr.net/npm/${packageName}@${version}/dist/index.js`;
  }

  /**
   * @description Compile function from cached compiled formula
   */
  /**
   * @description Compile function from cached compiled formula
   * @param cached - Cached compiled formula record
   * @param allowedImports - Optional map of whitelisted modules to inject (for external deps)
   */
  private compileFromCached(
    cached: CompiledFormula,
    allowedImports?: Record<string, unknown>
  ): (...args: unknown[]) => unknown {
    const currentHash = this.hashCode(cached.compiledCode);
    if (currentHash !== cached.hash) {
      throw new Error("Cache integrity check failed");
    }

    return this.compileFromSource(
      cached.compiledCode,
      cached.functionName,
      allowedImports
    );
  }

  /**
   * @description Compile function from source code with sandbox isolation
   */
  /**
   * @description Compile function from source code with sandbox isolation
   * @param code - Source bundle string fetched from CDN or cache
   * @param functionName - Exported function name to return from the sandbox
   * @param allowedImports - Optional map of whitelisted modules to inject (for external deps)
   */
  private compileFromSource(
    code: string,
    functionName: string,
    allowedImports?: Record<string, unknown>
  ): (...args: unknown[]) => unknown {
    const isolatedCode = this.createIsolatedContext(
      code,
      functionName,
      this.filterValidIdentifiers(Object.keys(allowedImports ?? {}))
    );

    try {
      // Use Function constructor (safer than eval)
      // Provide a single "allowed" parameter to inject whitelisted dependencies
      const factory = new Function("allowed", "return " + isolatedCode);
      const frozenAllowed = this.freezeAllowedImports(allowedImports);
      const func = factory(frozenAllowed);

      if (typeof func !== "function") {
        throw new Error(`Expected function but got ${typeof func}`);
      }

      return func;
    } catch (error) {
      throw new Error(
        `Failed to compile function ${functionName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * @description Create isolated execution context with restricted globals
   */
  private createIsolatedContext(
    code: string,
    functionName: string,
    allowedKeys: string[]
  ): string {
    const destructuring = allowedKeys.length
      ? `const { ${allowedKeys.join(", ")} } = allowed;`
      : "";
    return `
      (function(allowed) {
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
   * @description Simple string hash for integrity verification
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
   * @description Freeze the container of allowed imports to prevent reassignment within sandbox
   */
  private freezeAllowedImports(
    allowedImports?: Record<string, unknown>
  ): Record<string, unknown> {
    if (!allowedImports) return Object.freeze({});
    // Freeze only the container; avoid deep-freezing third-party modules to prevent side effects
    return Object.freeze({ ...allowedImports });
  }

  /**
   * @description Create a stable fingerprint for allowed imports for memory cache keying
   */
  private allowedImportsFingerprint(
    allowedImports?: Record<string, unknown>
  ): string {
    if (!allowedImports) return "none";
    try {
      return Object.keys(allowedImports).sort().join("|");
    } catch {
      return "unknown";
    }
  }

  /**
   * @description Filter keys to valid JS identifier names; others must use require('name')
   */
  private filterValidIdentifiers(keys: string[]): string[] {
    const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    return keys.filter((k) => IDENTIFIER_RE.test(k));
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
