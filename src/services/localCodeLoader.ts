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
 */
export function injectCodeToGlobal(
  code: string,
  namespace: string = "formulas",
  key?: string
): void {
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
    // Wrap code in IIFE that receives the target namespace
    // This allows the code to export to the correct namespace
    const targetPath = key ? `${namespace}.${key}` : namespace;
    const wrappedCode = `
      (function() {
        var target = window.${targetPath};
        ${code}
      })();
    `;

    // Use dynamic script injection for better isolation
    const script = document.createElement("script");
    script.textContent = wrappedCode;

    // Insert before first script or at end of head
    const firstScript = document.head.querySelector("script");
    if (firstScript) {
      document.head.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }

    // Remove script after execution (cleanup)
    setTimeout(() => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }, 0);
  } catch (error) {
    console.error("Failed to inject code to global scope:", error);
    throw new Error(
      `Failed to inject code: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
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

  // Load code
  const code = await loadLocalCode(versionConfig.sourcePath);

  // Inject to global scope
  injectCodeToGlobal(
    code,
    versionConfig.globalNamespace || "formulas",
    versionConfig.globalKey
  );
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
