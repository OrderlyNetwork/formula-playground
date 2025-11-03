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
   * Execute a formula using the TS engine
   */
  async executeTS(
    formula: FormulaDefinition,
    inputs: Record<string, any>
  ): Promise<FormulaExecutionResult> {
    if (!this.tsWorker) {
      return {
        success: false,
        error: "TS Worker not initialized",
        durationMs: 0,
        engine: "ts",
      };
    }

    return new Promise((resolve) => {
      const handleMessage = (event: MessageEvent<FormulaExecutionResult>) => {
        if (this.tsWorker) {
          this.tsWorker.removeEventListener("message", handleMessage);
        }
        resolve(event.data);
      };

      if (this.tsWorker) {
        this.tsWorker.addEventListener("message", handleMessage);
      }

      const request: FormulaExecutionRequest = { formula, inputs };
      if (this.tsWorker) {
        this.tsWorker.postMessage(request);
      }
    });
  }

  /**
   * Execute a formula using the Local NPM engine
   */
  async executeLocal(
    formula: FormulaDefinition,
    inputs: Record<string, any>
  ): Promise<FormulaExecutionResult> {
    if (!this.localWorker) {
      return {
        success: false,
        error: "Local Worker not initialized",
        durationMs: 0,
        engine: "local",
      };
    }

    return new Promise((resolve) => {
      const handleMessage = (event: MessageEvent<FormulaExecutionResult>) => {
        if (this.localWorker) {
          this.localWorker.removeEventListener("message", handleMessage);
        }
        resolve(event.data);
      };

      if (this.localWorker) {
        this.localWorker.addEventListener("message", handleMessage);
      }

      const request: FormulaExecutionRequest = { formula, inputs };
      if (this.localWorker) {
        this.localWorker.postMessage(request);
      }
    });
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
