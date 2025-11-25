/**
 * Type definitions for FormulaDataSheet module
 */

import type { FormulaScalar } from "@/types/formula";

/**
 * Represents a single row in the data sheet table
 * Data fields are stored directly on the object using dynamic keys
 */
export interface TableRow {
  /** Unique identifier for the row */
  id: string;
  /** Calculation result (if calculated) */
  _result?: FormulaScalar;
  /** Execution time in milliseconds (if calculated) */
  _executionTime?: number;
  /** Error message (if validation or calculation failed) */
  _error?: string;
  /** Validation status */
  _isValid?: boolean;
  /** Dynamic data fields - parameter values stored directly on row */
  [key: string]: FormulaScalar | undefined;
}

/**
 * Metrics data for calculation performance
 */
export interface MetricsData {
  /** Total execution time for all calculated rows */
  totalTime: number;
  /** Average execution time per row */
  averageTime: number;
  /** Number of rows that have been calculated */
  calculatedRows: number;
  /** Total number of rows */
  totalRows: number;
}

/**
 * Calculation result for a single row
 */
export interface RowCalculationResult {
  /** Calculation result value */
  result?: FormulaScalar;
  /** Execution time in milliseconds */
  executionTime?: number;
  /** Error message if calculation failed */
  error?: string;
}
