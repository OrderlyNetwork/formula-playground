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
      console.error("Failed to initialize workers:", error);
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
   * Execute a formula (currently only TS, Rust will be added in Phase 2)
   */
  async execute(
    formula: FormulaDefinition,
    inputs: Record<string, any>,
    engine: "ts" | "rust" = "ts"
  ): Promise<FormulaExecutionResult> {
    if (engine === "ts") {
      return this.executeTS(formula, inputs);
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
  }
}
