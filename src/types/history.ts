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
 * @description Datasheet snapshot - manually saved datasheet state
 *
 * IMPORTANT: Snapshots only store pure cell data, NOT structure (rows/columns).
 * When replaying:
 * - Row/column structure comes from current formula definition
 * - Only cell values are restored into the current structure
 * - This ensures formula evolution doesn't break old snapshots
 *
 * Data format: formulaId -> rowId -> columnId -> cellValue
 * Example:
 * {
 *   "funding_rate_calc_v1": {
 *     "row_abc123": {
 *       "symbol": "BTC_USDT",
 *       "price": 50000,
 *       "quantity": 1.5
 *     },
 *     "row_def456": { ... }
 *   }
 * }
 */
export interface DatasheetSnapshot {
  id: string; // UUID
  timestamp: number; // Save timestamp
  name: string; // Display name (formatted timestamp string)
  /**
   * Pure cell data only (no structure)
   * Structure: formulaId -> rowId -> columnId -> cellValue
   * Only contains user input data for editable columns
   */
  data: Record<string, Record<string, Record<string, unknown>>>;
  activeFormulaId?: string; // ID of the formula active when snapshot was taken
}
