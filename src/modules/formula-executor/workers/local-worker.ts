/**
 * Web Worker for executing formulas from local npm packages
 * This worker runs in a separate thread to avoid blocking the main UI thread
 */

import { LocalNpmAdapter } from "../adapters/local-npm-adapter";
import type {
  FormulaExecutionRequest,
  FormulaExecutionResult,
} from "../../../types/executor";

// Initialize the Local NPM adapter
const localAdapter = new LocalNpmAdapter();

// Listen for messages from the main thread
self.onmessage = async (event: MessageEvent<FormulaExecutionRequest>) => {
  const { formula, inputs } = event.data;

  try {
    const result: FormulaExecutionResult = await localAdapter.execute(
      formula,
      inputs
    );
    self.postMessage(result);
  } catch (error) {
    const errorResult: FormulaExecutionResult = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error in worker",
      durationMs: 0,
      engine: "local",
    };
    self.postMessage(errorResult);
  }
};

