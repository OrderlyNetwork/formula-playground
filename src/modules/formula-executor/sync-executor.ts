import type { FormulaDefinition } from "../../types/formula";
import type { FormulaExecutionResult } from "../../types/executor";
import { TSAdapter } from "./adapters/ts-adapter";
import { LocalNpmAdapter } from "./adapters/local-npm-adapter";
import { useAppStore } from "../../store/appStore";

/**
 * SyncFormulaExecutor - Executes formulas synchronously in the main thread
 * Does not use Web Workers, suitable for single-row calculations in DataSheet
 * Reuses existing TSAdapter and LocalNpmAdapter for consistency
 */
export class SyncFormulaExecutor {
  private tsAdapter: TSAdapter;
  private localAdapter: LocalNpmAdapter;

  constructor() {
    // Initialize adapters directly (no Worker needed)
    this.tsAdapter = new TSAdapter();
    this.localAdapter = new LocalNpmAdapter();

    // Set initial adapter info when first adapter is created
    // Use version config if available, otherwise use default
    const { setAdapterInfo, currentVersionConfig } = useAppStore.getState();
    if (currentVersionConfig) {
      const displayName = currentVersionConfig.packageName || "SDK";
      setAdapterInfo(displayName, currentVersionConfig.version);
    } else {
      setAdapterInfo(this.localAdapter.name, this.localAdapter.version);
    }
  }

  /**
   * Determine the appropriate engine for a formula based on its configuration
   * Priority: localNpmInfo (if enabled) -> jsdelivrInfo (if enabled) -> specified engine -> "ts"
   *
   * @param formula - Formula definition
   * @param specifiedEngine - Optional explicitly specified engine
   * @returns Selected engine type
   */
  private determineEngine(
    formula: FormulaDefinition,
    specifiedEngine?: "ts" | "rust" | "local"
  ): "ts" | "rust" | "local" {
    // If engine is explicitly specified, use it
    if (specifiedEngine) {
      return specifiedEngine;
    }

    // Auto-detect based on formula configuration
    // Priority 1: Check if localNpmInfo is configured and enabled
    if (formula.localNpmInfo?.enabled && formula.localNpmInfo.packageName) {
      return "local";
    }

    // Priority 2: Check if jsdelivrInfo is configured and enabled
    if (formula.jsdelivrInfo?.enabled && formula.jsdelivrInfo.url) {
      return "ts"; // jsDelivr is handled by TSAdapter
    }

    // Default to "ts"
    return "ts";
  }

  /**
   * Execute a formula synchronously (TS, Local NPM, or Rust - Rust will be added in Phase 2)
   * Engine can be auto-detected based on formula configuration if not specified
   * Updates the app store with the current adapter information
   *
   * @param formula - Formula definition to execute
   * @param inputs - Input values for the formula (any type needed for dynamic formula inputs)
   * @param engine - Optional engine type to use
   * @returns Promise resolving to execution result
   */
  async execute(
    formula: FormulaDefinition,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputs: Record<string, any>,
    engine?: "ts" | "rust" | "local"
  ): Promise<FormulaExecutionResult> {
    // Auto-detect engine if not specified
    const selectedEngine = this.determineEngine(formula, engine);

    // Update adapter info in app store when switching engines
    // Use version config if available, otherwise use adapter defaults
    const { setAdapterInfo, currentVersionConfig } = useAppStore.getState();
    if (selectedEngine === "ts") {
      if (currentVersionConfig) {
        const displayName =
          currentVersionConfig.packageName || "TypeScript SDK";
        setAdapterInfo(displayName, currentVersionConfig.version);
      } else {
        setAdapterInfo(this.tsAdapter.name, this.tsAdapter.version);
      }
      return this.tsAdapter.execute(formula, inputs);
    } else if (selectedEngine === "local") {
      if (currentVersionConfig) {
        const displayName = currentVersionConfig.packageName || "Local NPM SDK";
        setAdapterInfo(displayName, currentVersionConfig.version);
      } else {
        setAdapterInfo(this.localAdapter.name, this.localAdapter.version);
      }
      return this.localAdapter.execute(formula, inputs);
    } else {
      // Rust WASM will be implemented in Phase 2
      return {
        success: false,
        error: "Rust engine not yet implemented (Phase 2)",
        durationMs: 0,
        engine: "rust",
      };
    }
  }
}
