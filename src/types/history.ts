import type { FormulaNode, FormulaEdge } from "./formula";

/**
 * @description Single formula run record
 */
export interface RunRecord {
  id: string; // UUID
  timestamp: number; // Execution timestamp
  formulaId: string;
  formulaVersion: string;
  engine: "ts" | "rust" | "local"; // Execution engine
  sdkVersion: string; // SDK version
  inputs: Record<string, any>; // Input parameter snapshot
  outputs: Record<string, any>; // Output result snapshot
  durationMs: number; // Execution time
  compare?: {
    // Comparison result with another engine
    otherEngine: "ts" | "rust" | "local";
    absDiff?: Record<string, number>; // Absolute error (key -> absolute value)
    relDiff?: Record<string, number>; // Relative error (key -> relative percentage or decimal)
    // More comparison dimensions, such as precision, rounding differences, etc.
  };
  hash?: string; // Optional, hash of input+formula+engine, used for deduplication or quick lookup
  note?: string; // User note
}

/**
 * @description Canvas snapshot - manually saved canvas state
 * Contains nodes, edges, formula parameters, and canvas mode
 */
export interface CanvasSnapshot {
  id: string; // UUID
  timestamp: number; // Save timestamp
  name: string; // Display name (formatted timestamp string)
  nodes: FormulaNode[]; // Canvas nodes snapshot
  edges: FormulaEdge[]; // Canvas edges snapshot
  formulaParams: Record<string, Record<string, unknown>>; // Formula parameters for each formula
  canvasMode: "single" | "multi"; // Canvas mode at save time
}
