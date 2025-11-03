import type {
  SDKAdapter,
  FormulaExecutionResult,
} from "../../../types/executor";
import type { FormulaDefinition } from "../../../types/formula";
import { normalizePrecision } from "../../../lib/math";
import * as perp from "@orderly.network/perp";

/**
 * Local NPM Package Adapter - Executes formulas from locally installed npm packages
 * Uses static imports for pre-imported packages, falls back to dynamic import() for others
 * Packages must be pre-installed via package.json dependencies
 */
export class LocalNpmAdapter implements SDKAdapter {
  id = "local" as const;
  name = "Local NPM SDK";
  version = "1.0.0";

  /**
   * Pre-imported packages mapping
   * Maps package names to their statically imported modules
   * This allows for better tree-shaking and type safety
   */
  private preImportedPackages: Map<string, any> = new Map([
    ["@orderly.network/perp", perp],
  ]);

  /**
   * Cache for loaded npm modules (for dynamically imported packages)
   * Key: package name + importPath (e.g., "@orderly.network/utils/dist/utils")
   * Value: Imported module object
   */
  private moduleCache: Map<string, any> = new Map();

  /**
   * Load a module from npm package with caching
   * Priority: Pre-imported packages -> Cache -> Dynamic import
   * @param packageName - Package name, e.g., "@orderly.network/perp"
   * @param importPath - Optional subpath, e.g., "/dist/utils"
   * @returns Loaded module object
   */
  private async loadModule(
    packageName: string,
    importPath?: string
  ): Promise<any> {
    // Build the full import path
    const fullPath = importPath ? `${packageName}${importPath}` : packageName;

    // Priority 1: Check pre-imported packages (static imports)
    // Only use pre-imported if no importPath is specified (root package)
    if (!importPath && this.preImportedPackages.has(packageName)) {
      const preImported = this.preImportedPackages.get(packageName);
      console.log(`✓ Using pre-imported package: ${packageName}`);
      return preImported;
    }

    // Priority 2: Check cache (for dynamically imported modules)
    if (this.moduleCache.has(fullPath)) {
      return this.moduleCache.get(fullPath);
    }

    // Priority 3: Dynamic import - Vite will resolve from node_modules
    try {
      const module = await import(/* @vite-ignore */ fullPath);
      this.moduleCache.set(fullPath, module);
      console.log(`✓ Dynamically imported package: ${fullPath}`);
      return module;
    } catch (error) {
      throw new Error(
        `Failed to load npm package "${fullPath}": ${
          error instanceof Error ? error.message : String(error)
        }. ` +
          `Please ensure the package is installed via npm/pnpm and listed in package.json dependencies.`
      );
    }
  }

  /**
   * Resolve function from imported module
   * Supports nested paths (e.g., "orderUtils.calculateSomething") and direct exports
   * Supports both named exports and default exports
   * @param module - Imported module object
   * @param functionName - Function name to extract, supports dot notation (e.g., "orderUtils.calculateSomething")
   * @returns Function if found, undefined otherwise
   */
  private resolveFunction(
    module: any,
    functionName: string
  ): Function | undefined {
    // Handle nested paths (e.g., "orderUtils.calculateSomething")
    if (functionName.includes(".")) {
      const parts = functionName.split(".");
      let current: any = module;

      // Navigate through the nested structure
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (current && typeof current === "object" && part in current) {
          current = current[part];
        } else {
          return undefined;
        }
      }

      // Check if the final value is a function
      if (typeof current === "function") {
        return current;
      }
      return undefined;
    }

    // Direct function access (non-nested)
    // Try named export first
    if (typeof module[functionName] === "function") {
      return module[functionName];
    }

    // Try default export
    if (module.default && typeof module.default[functionName] === "function") {
      return module.default[functionName];
    }

    // Try if default is the function itself
    if (module.default && typeof module.default === "function") {
      // If functionName matches the default export name, return it
      // Otherwise, this might be a single default export module
      return module.default;
    }

    return undefined;
  }

  /**
   * Execute a formula with given inputs
   * Loads function from local npm package and executes it
   */
  async execute(
    formula: FormulaDefinition,
    inputs: Record<string, any>
  ): Promise<FormulaExecutionResult> {
    const startTime = performance.now();

    try {
      // Check if localNpmInfo is configured and enabled
      if (!formula.localNpmInfo?.enabled || !formula.localNpmInfo.packageName) {
        throw new Error(
          `Formula ${formula.id} does not have localNpmInfo configured or enabled. ` +
            `Please configure localNpmInfo with packageName and functionName.`
        );
      }

      const { packageName, functionName, importPath } = formula.localNpmInfo;

      // Load the module
      const module = await this.loadModule(packageName, importPath);

      // Resolve the function from the module
      const func = this.resolveFunction(module, functionName);

      if (!func) {
        // Build detailed error message with nested structure info
        const availableExports = Object.keys(module).join(", ");
        const defaultExports = module.default
          ? Object.keys(module.default).join(", ")
          : "none";

        // If functionName contains dots, show nested structure
        let nestedInfo = "";
        if (functionName.includes(".")) {
          const parts = functionName.split(".");
          const firstPart = parts[0];
          if (module[firstPart] && typeof module[firstPart] === "object") {
            const nestedKeys = Object.keys(module[firstPart]).join(", ");
            nestedInfo = ` Nested under "${firstPart}": ${nestedKeys}.`;
          }
        }

        throw new Error(
          `Function "${functionName}" not found in package "${packageName}${
            importPath || ""
          }". ` +
            `Available top-level exports: ${availableExports}.${nestedInfo} ` +
            `Default exports: ${defaultExports}. ` +
            `Please check the function name and package structure. ` +
            `For nested exports, use dot notation (e.g., "orderUtils.calculateSomething").`
        );
      }

      // Convert inputs object to function arguments in the correct order
      const args = formula.inputs.map((input) => inputs[input.key]);

      // Execute the formula
      const result = func(...args);

      // Apply engine hints if present (prefer local, fallback to ts)
      let finalResult = result;
      const hints = formula.engineHints?.local || formula.engineHints?.ts;
      if (hints) {
        const { rounding, scale } = hints;
        if (rounding && scale !== undefined) {
          finalResult = normalizePrecision(result, scale, rounding);
        }
      }

      const durationMs = performance.now() - startTime;

      console.log(
        `✓ Executed from local npm: ${formula.id} using ${packageName}${
          importPath || ""
        }::${functionName}`
      );

      return {
        success: true,
        outputs: { result: finalResult },
        durationMs,
        engine: "local",
      };
    } catch (error) {
      const durationMs = performance.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
        engine: "local",
      };
    }
  }

  /**
   * Register a pre-imported package
   * This allows using static imports for better tree-shaking and type safety
   * @param packageName - Package name, e.g., "@orderly.network/perp"
   * @param module - The statically imported module
   */
  registerPreImportedPackage(packageName: string, module: any): void {
    this.preImportedPackages.set(packageName, module);
  }

  /**
   * Clear the module cache (useful for testing or when packages are updated)
   * Note: This only clears dynamically imported modules, not pre-imported ones
   */
  clearCache(): void {
    this.moduleCache.clear();
  }

  /**
   * Clear all caches including pre-imported packages
   * Useful for testing or when packages are updated
   */
  clearAllCaches(): void {
    this.moduleCache.clear();
    this.preImportedPackages.clear();
    // Re-register default pre-imported packages
    this.preImportedPackages.set("@orderly.network/perp", perp);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      preImportedCount: this.preImportedPackages.size,
      preImportedPackages: Array.from(this.preImportedPackages.keys()),
      dynamicCacheSize: this.moduleCache.size,
      cachedPackages: Array.from(this.moduleCache.keys()),
    };
  }
}
