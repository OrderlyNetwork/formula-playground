import type { FormulaDefinition } from "../../types/formula";
import type {
  FormulaExecutionRequest,
  FormulaExecutionResult,
} from "../../types/executor";

/**
 * FormulaExecutor - Coordinates formula execution via Web Workers
 */
export class FormulaExecutor {
  private tsWorker: Worker | null = null;
  private localWorker: Worker | null = null;

  constructor() {
    this.initializeWorkers();
  }

  /**
   * Initialize Web Workers
   */
  private initializeWorkers() {
    try {
      // Initialize TS Worker
      this.tsWorker = new Worker(
        new URL("./workers/ts-worker.ts", import.meta.url),
        { type: "module" }
      );
    } catch (error) {
      console.error("Failed to initialize TS worker:", error);
    }

    try {
      // Initialize Local NPM Worker
      this.localWorker = new Worker(
        new URL("./workers/local-worker.ts", import.meta.url),
        { type: "module" }
      );
    } catch (error) {
      console.error("Failed to initialize local worker:", error);
    }
  }

  /**
   * Generic method to execute formula via Worker
   * Extracts common Worker communication logic to eliminate code duplication
   * 
   * @param worker - The Worker instance to use for execution
   * @param formula - Formula definition to execute
   * @param inputs - Input values for the formula
   * @param engine - Engine type identifier ("ts" or "local")
   * @returns Promise resolving to execution result
   */
  private async executeWithWorker(
    worker: Worker | null,
    formula: FormulaDefinition,
    inputs: Record<string, any>,
    engine: "ts" | "local"
  ): Promise<FormulaExecutionResult> {
    if (!worker) {
      return {
        success: false,
        error: `${engine.toUpperCase()} Worker not initialized`,
        durationMs: 0,
        engine,
      };
    }

    return new Promise((resolve) => {
      const handleMessage = (event: MessageEvent<FormulaExecutionResult>) => {
        worker.removeEventListener("message", handleMessage);
        resolve(event.data);
      };

      worker.addEventListener("message", handleMessage);
      const request: FormulaExecutionRequest = { formula, inputs };
      worker.postMessage(request);
    });
  }

  /**
   * Execute a formula using the TS engine
   */
  async executeTS(
    formula: FormulaDefinition,
    inputs: Record<string, any>
  ): Promise<FormulaExecutionResult> {
    return this.executeWithWorker(this.tsWorker, formula, inputs, "ts");
  }

  /**
   * Execute a formula using the Local NPM engine
   */
  async executeLocal(
    formula: FormulaDefinition,
    inputs: Record<string, any>
  ): Promise<FormulaExecutionResult> {
    return this.executeWithWorker(this.localWorker, formula, inputs, "local");
  }

  /**
   * Determine the appropriate engine for a formula based on its configuration
   * Priority: localNpmInfo (if enabled) -> jsdelivrInfo (if enabled) -> specified engine -> "ts"
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
   * Execute a formula (TS, Local NPM, or Rust - Rust will be added in Phase 2)
   * Engine can be auto-detected based on formula configuration if not specified
   */
  async execute(
    formula: FormulaDefinition,
    inputs: Record<string, any>,
    engine?: "ts" | "rust" | "local"
  ): Promise<FormulaExecutionResult> {
    // Auto-detect engine if not specified
    const selectedEngine = this.determineEngine(formula, engine);

    if (selectedEngine === "ts") {
      return this.executeTS(formula, inputs);
    } else if (selectedEngine === "local") {
      return this.executeLocal(formula, inputs);
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

  /**
   * Clean up workers
   */
  destroy() {
    if (this.tsWorker) {
      this.tsWorker.terminate();
      this.tsWorker = null;
    }
    if (this.localWorker) {
      this.localWorker.terminate();
      this.localWorker = null;
    }
  }
}
