import type { FormulaDefinition } from "./formula";

/**
 * @description Formula execution request
 */
export interface FormulaExecutionRequest {
  formula: FormulaDefinition;
  inputs: Record<string, any>;
}

/**
 * @description Formula execution result
 */
export interface FormulaExecutionResult {
  success: boolean;
  outputs?: Record<string, any>;
  error?: string;
  durationMs: number;
  engine: "ts" | "rust" | "local";
}

/**
 * @description SDK Adapter interface for different execution engines
 */
export interface SDKAdapter {
  id: "ts" | "rust" | "local";
  name: string;
  version: string;
  execute(
    formula: FormulaDefinition,
    inputs: Record<string, any>
  ): Promise<FormulaExecutionResult>;
}
