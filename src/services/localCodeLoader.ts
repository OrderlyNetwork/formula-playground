/**
 * @description Local code loader service
 * Handles loading and injecting local packaged code into global scope
 */

import type { VersionConfig } from "../types/version";

/**
 * @description Cache entry for loaded local code
 */
interface LocalCodeCache {
  sourcePath: string;
  code: string;
  hash: string;
  timestamp: number;
}

/**
 * @description In-memory cache for loaded local code
 * Key: sourcePath, Value: code content
 */
const codeCache = new Map<string, string>();

/**
 * @description IndexedDB cache key prefix
 */
const CACHE_PREFIX = "local_code:";

/**
 * @description Load local code from static resource path
 * @param sourcePath - Static resource path (e.g., "/dist/formulas-v1.js")
 * @returns Promise resolving to the loaded code string
 */
export async function loadLocalCode(sourcePath: string): Promise<string> {
  // Check in-memory cache first
  if (codeCache.has(sourcePath)) {
    return codeCache.get(sourcePath)!;
  }

  // Build full URL with BASE_URL
  const baseUrl = import.meta.env.BASE_URL;
  const fullUrl = `${baseUrl}${
    sourcePath.startsWith("/") ? sourcePath.slice(1) : sourcePath
  }`;

  try {
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to load local code from ${fullUrl}: ${response.status} ${response.statusText}`
      );
    }
    const code = await response.text();

    // Cache in memory
    codeCache.set(sourcePath, code);

    // Optionally cache to IndexedDB
    try {
      await cacheToIndexedDB(sourcePath, code);
    } catch (error) {
      console.warn("Failed to cache local code to IndexedDB:", error);
    }

    return code;
  } catch (error) {
    console.error(`Failed to load local code from ${sourcePath}:`, error);
    throw error;
  }
}

/**
 * @description Inject code into global scope
 * @param code - JavaScript code to inject
 * @param namespace - Global namespace (e.g., "formulas")
 * @param key - Namespace key (e.g., "v1")
 * @returns Promise that resolves when code injection and execution is complete
 */
export function injectCodeToGlobal(
  code: string,
  namespace: string = "formulas",
  key?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure namespace exists
    const global = window || globalThis;
    if (!(global as any)[namespace]) {
      (global as any)[namespace] = {};
    }

    // If key is provided, ensure the key exists in namespace
    if (key) {
      if (!(global as any)[namespace][key]) {
        (global as any)[namespace][key] = {};
      }
    }

    try {
      // Get target namespace
      const targetNamespace = key
        ? (global as any)[namespace][key]
        : (global as any)[namespace];

      // Create CommonJS-compatible environment
      const module = { exports: {} };
      const exports = module.exports;

      // Mock require() for known dependencies
      const mockRequire = (moduleName: string) => {
        if (moduleName === "@orderly.network/utils") {
          if ((window as any).OrderlyUtils) {
            return (window as any).OrderlyUtils;
          }
          throw new Error(
            "Dependency @orderly.network/utils not found. Please ensure it is loaded first."
          );
        }
        if (moduleName === "@orderly.network/types") {
          if ((window as any).OrderlyTypes) {
            return (window as any).OrderlyTypes;
          }
          return {}; // Safe fallback for types
        }
        throw new Error(
          `Unsupported module: ${moduleName}. Available: @orderly.network/utils, @orderly.network/types`
        );
      };

      // Execute code using Function constructor for better error handling
      // This provides a controlled environment similar to eval but safer
      const executeCode = new Function(
        "require",
        "module",
        "exports",
        "__targetNamespace__",
        `
          'use strict';
          ${code}
          return module.exports;
        `
      );

      // Execute the code
      const result = executeCode(mockRequire, module, exports, targetNamespace);

      // Copy all exported properties to the target namespace
      for (const exportKey in result) {
        if (result.hasOwnProperty(exportKey)) {
          targetNamespace[exportKey] = result[exportKey];
        }
      }

      // Resolve on next tick to ensure all assignments are complete
      setTimeout(() => resolve(), 0);
    } catch (error) {
      console.error("Failed to inject code to global scope:", error);
      reject(
        new Error(
          `Failed to inject code: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  });
}

/**
 * @description Load and inject local code for a version configuration
 * @param versionConfig - Version configuration with local type
 * @returns Promise that resolves when code is loaded and injected
 */
export async function loadAndInjectLocalCode(
  versionConfig: VersionConfig
): Promise<void> {
  if (versionConfig.type !== "local" || !versionConfig.sourcePath) {
    throw new Error("Version config is not a local type or missing sourcePath");
  }

  // Ensure required dependencies are available globally before loading local code
  await ensureDependenciesAvailable();

  // Load code
  const code = await loadLocalCode(versionConfig.sourcePath);

  // Inject to global scope and wait for completion
  await injectCodeToGlobal(
    code,
    versionConfig.globalNamespace || "formulas",
    versionConfig.globalKey
  );
}

/**
 * @description Ensure required dependencies are available in global scope
 * This is needed for CommonJS modules that use require()
 */
async function ensureDependenciesAvailable(): Promise<void> {
  // Check if dependencies are already loaded
  if ((window as any).OrderlyUtils) {
    return; // Already loaded
  }

  try {
    // Dynamically import @orderly.network/utils and expose it globally
    const utils = await import("@orderly.network/utils");
    (window as any).OrderlyUtils = utils;
  } catch (error) {
    console.error("Failed to load required dependencies:", error);
    throw new Error(
      `Failed to load @orderly.network/utils: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * @description Get function from global namespace
 * @param functionName - Function name to retrieve
 * @param namespace - Global namespace (e.g., "formulas")
 * @param key - Namespace key (e.g., "v1")
 * @returns Function or undefined if not found
 */
export function getFunctionFromGlobal(
  functionName: string,
  namespace: string = "formulas",
  key?: string
): ((...args: any[]) => any) | undefined {
  const global = window || globalThis;
  const ns = (global as any)[namespace];
  if (!ns) return undefined;

  const target = key ? ns[key] : ns;
  if (!target) return undefined;

  return typeof target[functionName] === "function"
    ? target[functionName]
    : undefined;
}

/**
 * @description Cache code to IndexedDB
 * @param sourcePath - Source path as cache key
 * @param code - Code content to cache
 */
async function cacheToIndexedDB(
  sourcePath: string,
  code: string
): Promise<void> {
  // Simple hash function
  const hash = await simpleHash(code);
  const cacheKey = `${CACHE_PREFIX}${sourcePath}`;

  // Try to use IndexedDB if available
  // For now, we'll just store in memory cache
  // In the future, this could be extended to use Dexie
  const cacheEntry: LocalCodeCache = {
    sourcePath,
    code,
    hash,
    timestamp: Date.now(),
  };

  // Store in memory for now
  // TODO: Implement IndexedDB caching if needed
  console.debug("Cached local code:", cacheKey, hash);
}

/**
 * @description Simple hash function for code integrity
 * @param str - String to hash
 * @returns Hash string
 */
async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * @description Clear cached code for a source path
 * @param sourcePath - Source path to clear
 */
export function clearCachedCode(sourcePath: string): void {
  codeCache.delete(sourcePath);
}

/**
 * @description Clear all cached local code
 */
export function clearAllCachedCode(): void {
  codeCache.clear();
}
