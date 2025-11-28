import type { FormulaScalar } from "@/types/formula";
import type { TableRow } from "@/utils/formulaTableUtils";

/**
 * Configuration for state tracker to prevent memory leaks
 */
export interface StateTrackerConfig {
  maxEventsPerFormula: number;
  maxRowsPerFormula: number;
  enableDeepClone: boolean;
  autoCleanupInterval?: number; // ms, undefined = disabled
}

/**
 * Default configuration optimized for performance
 */
const DEFAULT_CONFIG: StateTrackerConfig = {
  maxEventsPerFormula: 500, // Reasonable limit for debugging
  maxRowsPerFormula: 1000,  // Prevent excessive row storage
  enableDeepClone: true,
  autoCleanupInterval: 10 * 60 * 1000, // 10 minutes
};

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
 * Memory-optimized with configurable limits and auto-cleanup
 */
class DataSheetStateTracker {
  private config: StateTrackerConfig;
  private cellUpdates: Map<string, CellUpdateEvent[]> = new Map();
  private calculations: Map<string, CalculationEvent[]> = new Map();
  private rowStates: Map<string, TableRow[]> = new Map();
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<StateTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startAutoCleanup();
  }

  /**
   * Record a cell update event
   * Automatically enforces memory limits
   *
   * @param formulaId - Formula ID
   * @param event - Cell update event
   */
  recordCellUpdate(formulaId: string, event: CellUpdateEvent): void {
    if (!this.cellUpdates.has(formulaId)) {
      this.cellUpdates.set(formulaId, []);
    }

    const events = this.cellUpdates.get(formulaId)!;
    events.push(event);

    // Enforce memory limit - keep only the most recent events
    if (events.length > this.config.maxEventsPerFormula) {
      this.cellUpdates.set(formulaId,
        events.slice(-this.config.maxEventsPerFormula)
      );
    }
  }

  /**
   * Record a calculation event
   * Automatically enforces memory limits
   *
   * @param formulaId - Formula ID
   * @param event - Calculation event
   */
  recordCalculation(formulaId: string, event: CalculationEvent): void {
    if (!this.calculations.has(formulaId)) {
      this.calculations.set(formulaId, []);
    }

    const events = this.calculations.get(formulaId)!;
    events.push(event);

    // Enforce memory limit - keep only the most recent events
    if (events.length > this.config.maxEventsPerFormula) {
      this.calculations.set(formulaId,
        events.slice(-this.config.maxEventsPerFormula)
      );
    }
  }

  /**
   * Record current row states
   * Uses optimized deep cloning and enforces memory limits
   *
   * @param formulaId - Formula ID
   * @param rows - Current row states
   */
  recordRowStates(formulaId: string, rows: TableRow[]): void {
    // Enforce row limit before cloning to save memory
    if (rows.length > this.config.maxRowsPerFormula) {
      console.warn(
        `Row count (${rows.length}) exceeds limit (${this.config.maxRowsPerFormula}) for formula ${formulaId}. Truncating...`
      );
      rows = rows.slice(0, this.config.maxRowsPerFormula);
    }

    const clonedRows = this.cloneRows(rows);
    this.rowStates.set(formulaId, clonedRows);
  }

  /**
   * Optimized row cloning based on data size and configuration
   *
   * @param rows - Rows to clone
   * @returns Cloned rows
   */
  private cloneRows(rows: TableRow[]): TableRow[] {
    if (!this.config.enableDeepClone) {
      return rows;
    }

    // Use modern structuredClone for better performance if available
    if (typeof structuredClone !== 'undefined') {
      return structuredClone(rows);
    }

    // Fallback to JSON method for older browsers
    try {
      return JSON.parse(JSON.stringify(rows));
    } catch (error) {
      console.warn('Failed to deep clone rows, using shallow copy:', error);
      return [...rows]; // Shallow copy as fallback
    }
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
   * Start automatic cleanup if configured
   */
  private startAutoCleanup(): void {
    if (this.config.autoCleanupInterval) {
      this.cleanupTimer = setInterval(() => {
        this.performCleanup();
      }, this.config.autoCleanupInterval);
    }
  }

  /**
   * Stop automatic cleanup timer
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Perform cleanup of old data to prevent memory leaks
   * Removes data for formulas that haven't been updated recently
   */
  private performCleanup(): void {
    const now = Date.now();
    const maxAge = this.config.autoCleanupInterval! * 2; // Remove data older than 2x cleanup interval
    let cleanedCount = 0;

    Array.from(this.cellUpdates.entries()).forEach(([formulaId, updates]) => {
      const lastUpdate = updates.length > 0 ?
        updates[updates.length - 1].timestamp : 0;

      if (now - lastUpdate > maxAge) {
        this.clearFormula(formulaId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.info(`Auto cleanup: removed tracking data for ${cleanedCount} inactive formulas`);
    }
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
   * Clear all tracking data and stop auto cleanup
   */
  clearAll(): void {
    this.cellUpdates.clear();
    this.calculations.clear();
    this.rowStates.clear();
    this.stopAutoCleanup();
  }

  /**
   * Get memory usage statistics for monitoring
   *
   * @returns Memory usage information
   */
  getMemoryStats(): {
    totalFormulas: number;
    totalCellUpdates: number;
    totalCalculations: number;
    totalRows: number;
    estimatedMemoryKB: number;
    config: StateTrackerConfig;
  } {
    let totalCellUpdates = 0;
    let totalCalculations = 0;
    let totalRows = 0;

    Array.from(this.cellUpdates.values()).forEach(updates => {
      totalCellUpdates += updates.length;
    });

    Array.from(this.calculations.values()).forEach(calculations => {
      totalCalculations += calculations.length;
    });

    Array.from(this.rowStates.values()).forEach(rows => {
      totalRows += rows.length;
    });

    // Rough memory estimation (this is approximate)
    const estimatedMemoryKB = Math.round(
      (totalCellUpdates * 200 + // ~200 bytes per cell update event
      totalCalculations * 300 + // ~300 bytes per calculation event
      totalRows * 1000) / 1024  // ~1KB per row (rough estimate)
    );

    return {
      totalFormulas: this.cellUpdates.size,
      totalCellUpdates,
      totalCalculations,
      totalRows,
      estimatedMemoryKB,
      config: { ...this.config },
    };
  }

  /**
   * Update configuration
   *
   * @param newConfig - New configuration options
   */
  updateConfig(newConfig: Partial<StateTrackerConfig>): void {
    const oldAutoCleanup = this.config.autoCleanupInterval;
    this.config = { ...this.config, ...newConfig };

    // Restart auto cleanup if interval changed
    if (this.config.autoCleanupInterval !== oldAutoCleanup) {
      this.stopAutoCleanup();
      this.startAutoCleanup();
    }
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

// Export singleton instance with default config
export const dataSheetStateTracker = new DataSheetStateTracker();

// Export types and config for external use
export { DEFAULT_CONFIG };
