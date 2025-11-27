import type { CellValue, RowDef, ColumnDef } from "@/types/spreadsheet";

/**
 * A mutable store that handles cell data outside of React's state lifecycle.
 * Uses a Pub/Sub pattern to update individual cells via Refs.
 */
export class GridStore {
  private data: Map<string, CellValue> = new Map();
  private listeners: Map<string, Set<(val: CellValue) => void>> = new Map();
  private rows: RowDef[] = [];
  private columns: ColumnDef[] = [];
  private onCalculateRow?: (rowId: string, colId: string) => void;

  constructor(
    initialRows: RowDef[],
    initialCols: ColumnDef[],
    onCalculateRow?: (rowId: string, colId: string) => void
  ) {
    this.rows = initialRows;
    this.columns = initialCols;
    this.onCalculateRow = onCalculateRow;
  }

  // --- Key Helpers ---
  private getKey(rowId: string, colId: string): string {
    return `${rowId}:${colId}`;
  }

  // --- Data Access ---
  public getValue(rowId: string, colId: string): CellValue {
    return this.data.get(this.getKey(rowId, colId)) ?? "";
  }

  /**
   * Get all input data for a row (excluding index and result columns)
   * @param rowId - Row identifier
   * @returns Record of column ID to cell value for editable columns only
   */
  public getRowData(rowId: string): Record<string, CellValue> {
    const rowData: Record<string, CellValue> = {};

    // Iterate through all columns and get values for editable ones
    this.columns.forEach((col) => {
      // Only include editable columns (input data), exclude index and result
      if (col.editable !== false && col.id !== "index" && col.id !== "result") {
        const value = this.getValue(rowId, col.id);
        // Only include non-empty values
        if (value !== null && value !== "") {
          rowData[col.id] = value;
        }
      }
    });

    return rowData;
  }

  /**
   * Check if a row exists in the store
   * @param rowId - Row identifier
   * @returns True if row exists
   */
  public hasRow(rowId: string): boolean {
    return this.rows.some((row) => row.id === rowId);
  }

  /**
   * Set a cell value and optionally trigger calculation
   * @param rowId - Row identifier
   * @param colId - Column identifier
   * @param value - New cell value
   * @param silent - If true, skip calculation trigger (for bulk updates)
   */
  public setValue(
    rowId: string,
    colId: string,
    value: CellValue,
    silent = false
  ) {
    const key = this.getKey(rowId, colId);
    const oldValue = this.data.get(key);

    // 1. Update Internal Data
    this.data.set(key, value);

    // 2. Notify Listeners (The React Cell components)
    if (oldValue !== value) {
      this.notify(rowId, colId, value);

      // 3. Trigger Calculations (Business Logic) - only if not silent
      if (!silent) {
        this.calculateRow(rowId, colId);
      }
    }
  }

  // --- Pub/Sub ---
  public subscribe(
    rowId: string,
    colId: string,
    listener: (val: CellValue) => void
  ) {
    const key = this.getKey(rowId, colId);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  private notify(rowId: string, colId: string, value: CellValue) {
    const key = this.getKey(rowId, colId);
    const set = this.listeners.get(key);
    if (set) {
      set.forEach((fn) => fn(value));
    }
  }

  // --- Calculation Logic ---
  /**
   * Trigger calculation for a row when a cell value changes
   * Calls the external callback if provided
   * @param rowId - Row identifier
   * @param colId - Column identifier that triggered the change
   */
  public calculateRow(rowId: string, colId: string) {
    // Find the column to check if it's editable
    const column = this.columns.find((c) => c.id === colId);

    // Only trigger calculation for editable columns (user inputs)
    // Skip for result columns or non-editable columns
    if (column && column.editable !== false && this.onCalculateRow) {
      // Call the external calculation callback
      this.onCalculateRow(rowId, colId);
    }
  }

  // --- Structure Management ---
  // These are called by the React component when state changes there,
  // just to keep the store in sync with what React is rendering.
  public syncStructure(rows: RowDef[], cols: ColumnDef[]) {
    this.rows = rows;
    this.columns = cols;
  }

  /**
   * Update the calculation callback
   * This is needed when the formula changes to ensure the callback has the latest formula reference
   * @param onCalculateRow - New calculation callback
   */
  public updateCalculateCallback(
    onCalculateRow: (rowId: string, colId: string) => void
  ) {
    this.onCalculateRow = onCalculateRow;
  }
}
