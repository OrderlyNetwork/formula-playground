import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import type { TableRow } from "@/utils/formulaTableUtils";

/**
 * Cell update event for tracking
 */
export interface CellUpdateEvent {
  timestamp: number;
  rowId: string;
  path: string;
  oldValue: FormulaScalar;
  newValue: FormulaScalar;
  isValid: boolean;
  validationErrors?: string[];
}

/**
 * Calculation event for tracking
 */
export interface CalculationEvent {
  timestamp: number;
  rowId: string;
  formulaId: string;
  inputs: Record<string, FormulaScalar>;
  success: boolean;
  result?: FormulaScalar;
  executionTime?: number;
  error?: string;
  trigger: "cell-update" | "manual" | "auto";
}

/**
 * DataSheet State Tracker
 * Tracks all cell updates and calculations for debugging and monitoring
 * Creates a record table for each formula's dataSheet
 */
class DataSheetStateTracker {
  private cellUpdates: Map<string, CellUpdateEvent[]> = new Map();
  private calculations: Map<string, CalculationEvent[]> = new Map();
  private rowStates: Map<string, TableRow[]> = new Map();

  /**
   * Record a cell update event
   *
   * @param formulaId - Formula ID
   * @param event - Cell update event
   */
  recordCellUpdate(formulaId: string, event: CellUpdateEvent): void {
    if (!this.cellUpdates.has(formulaId)) {
      this.cellUpdates.set(formulaId, []);
    }
    this.cellUpdates.get(formulaId)!.push(event);
  }

  /**
   * Record a calculation event
   *
   * @param formulaId - Formula ID
   * @param event - Calculation event
   */
  recordCalculation(formulaId: string, event: CalculationEvent): void {
    if (!this.calculations.has(formulaId)) {
      this.calculations.set(formulaId, []);
    }
    this.calculations.get(formulaId)!.push(event);
  }

  /**
   * Record current row states
   *
   * @param formulaId - Formula ID
   * @param rows - Current row states
   */
  recordRowStates(formulaId: string, rows: TableRow[]): void {
    this.rowStates.set(formulaId, JSON.parse(JSON.stringify(rows))); // Deep clone
  }

  /**
   * Get all cell updates for a formula
   *
   * @param formulaId - Formula ID
   * @returns Array of cell update events
   */
  getCellUpdates(formulaId: string): CellUpdateEvent[] {
    return this.cellUpdates.get(formulaId) || [];
  }

  /**
   * Get all calculations for a formula
   *
   * @param formulaId - Formula ID
   * @returns Array of calculation events
   */
  getCalculations(formulaId: string): CalculationEvent[] {
    return this.calculations.get(formulaId) || [];
  }

  /**
   * Get current row states for a formula
   *
   * @param formulaId - Formula ID
   * @returns Array of row states
   */
  getRowStates(formulaId: string): TableRow[] {
    return this.rowStates.get(formulaId) || [];
  }

  /**
   * Get complete state table for a formula
   * Includes cell updates, calculations, and current row states
   *
   * @param formulaId - Formula ID
   * @returns Complete state information
   */
  getStateTable(formulaId: string): {
    formulaId: string;
    cellUpdates: CellUpdateEvent[];
    calculations: CalculationEvent[];
    currentRows: TableRow[];
    lastUpdate?: number;
    lastCalculation?: number;
  } {
    const updates = this.getCellUpdates(formulaId);
    const calcs = this.getCalculations(formulaId);
    const rows = this.getRowStates(formulaId);

    return {
      formulaId,
      cellUpdates: updates,
      calculations: calcs,
      currentRows: rows,
      lastUpdate:
        updates.length > 0 ? updates[updates.length - 1].timestamp : undefined,
      lastCalculation:
        calcs.length > 0 ? calcs[calcs.length - 1].timestamp : undefined,
    };
  }

  /**
   * Clear all tracking data for a formula
   *
   * @param formulaId - Formula ID
   */
  clearFormula(formulaId: string): void {
    this.cellUpdates.delete(formulaId);
    this.calculations.delete(formulaId);
    this.rowStates.delete(formulaId);
  }

  /**
   * Clear all tracking data
   */
  clearAll(): void {
    this.cellUpdates.clear();
    this.calculations.clear();
    this.rowStates.clear();
  }

  /**
   * Get debug information for troubleshooting
   *
   * @param formulaId - Formula ID
   * @returns Debug information
   */
  getDebugInfo(formulaId: string): {
    hasUpdates: boolean;
    hasCalculations: boolean;
    updateCount: number;
    calculationCount: number;
    lastUpdateTime?: number;
    lastCalculationTime?: number;
    pendingCalculations: number; // Updates without corresponding calculations
    rowsWithResults: number;
    rowsWithoutResults: number;
  } {
    const updates = this.getCellUpdates(formulaId);
    const calcs = this.getCalculations(formulaId);
    const rows = this.getRowStates(formulaId);

    // Count rows with and without results
    const rowsWithResults = rows.filter((r) => r._result !== undefined).length;
    const rowsWithoutResults = rows.filter(
      (r) => r._result === undefined && r._isValid === true
    ).length;

    // Estimate pending calculations (simplified: updates after last calculation)
    const lastCalcTime =
      calcs.length > 0 ? calcs[calcs.length - 1].timestamp : 0;
    const pendingCalculations = updates.filter(
      (u) => u.timestamp > lastCalcTime && u.isValid
    ).length;

    return {
      hasUpdates: updates.length > 0,
      hasCalculations: calcs.length > 0,
      updateCount: updates.length,
      calculationCount: calcs.length,
      lastUpdateTime:
        updates.length > 0 ? updates[updates.length - 1].timestamp : undefined,
      lastCalculationTime:
        calcs.length > 0 ? calcs[calcs.length - 1].timestamp : undefined,
      pendingCalculations,
      rowsWithResults,
      rowsWithoutResults,
    };
  }
}

// Export singleton instance
export const dataSheetStateTracker = new DataSheetStateTracker();
