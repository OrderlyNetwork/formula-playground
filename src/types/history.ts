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
