import { CacheManager } from "./cache-manager";
import type { CompiledFormula } from "../../types/formula";
import { CodeExecutionUtils } from "./utils/code-execution-utils";
import { ErrorUtils } from "./utils/error-utils";

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
    const memoryCacheKey = `${formulaId}:${version}:${CodeExecutionUtils.createImportsFingerprint(
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
      throw ErrorUtils.createContextualError(
        `Failed to fetch from jsDelivr: ${response.status} ${response.statusText}`,
        { url: jsdelivrUrl, status: response.status, statusText: response.statusText }
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
      console.warn("Failed to save to IndexedDB cache:", ErrorUtils.formatCacheError(error, "save"));
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
   * @param code - Source bundle string fetched from CDN or cache
   * @param functionName - Exported function name to return from the sandbox
   * @param allowedImports - Optional map of whitelisted modules to inject (for external deps)
   */
  private compileFromSource(
    code: string,
    functionName: string,
    allowedImports?: Record<string, unknown>
  ): (...args: unknown[]) => unknown {
    const validKeys = CodeExecutionUtils.filterValidIdentifiers(Object.keys(allowedImports ?? {}));
    const isolatedCode = CodeExecutionUtils.createIsolatedContext(
      code,
      functionName,
      validKeys
    );

    try {
      return CodeExecutionUtils.executeIsolatedCode(isolatedCode, allowedImports);
    } catch (error) {
      throw ErrorUtils.createContextualError(
        `Failed to compile function ${functionName}`,
        { functionName, errorMessage: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  // Replaced by CodeExecutionUtils.createIsolatedContext()

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

  // Replaced by CodeExecutionUtils methods:
// - freezeAllowedImports()
// - createImportsFingerprint()
// - filterValidIdentifiers()

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
