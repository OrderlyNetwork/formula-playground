/**
 * Web Worker for executing TypeScript formulas
 * This worker runs in a separate thread to avoid blocking the main UI thread
 */

import { TSAdapter } from "../adapters/ts-adapter";
import type {
  FormulaExecutionRequest,
  FormulaExecutionResult,
} from "../../../types/executor";

// Initialize the TS adapter
const tsAdapter = new TSAdapter();

// Listen for messages from the main thread
self.onmessage = async (event: MessageEvent<FormulaExecutionRequest>) => {
  const { formula, inputs } = event.data;

  try {
    const result: FormulaExecutionResult = await tsAdapter.execute(
      formula,
      inputs
    );
    self.postMessage(result);
  } catch (error) {
    const errorResult: FormulaExecutionResult = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error in worker",
      durationMs: 0,
      engine: "ts",
    };
    self.postMessage(errorResult);
  }
};
