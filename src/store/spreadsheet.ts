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

  constructor(initialRows: RowDef[], initialCols: ColumnDef[]) {
    this.rows = initialRows;
    this.columns = initialCols;
  }

  // --- Key Helpers ---
  private getKey(rowId: string, colId: string): string {
    return `${rowId}:${colId}`;
  }

  // --- Data Access ---
  public getValue(rowId: string, colId: string): CellValue {
    return this.data.get(this.getKey(rowId, colId)) ?? "";
  }

  public setValue(rowId: string, colId: string, value: CellValue) {
    const key = this.getKey(rowId, colId);
    const oldValue = this.data.get(key);

    // 1. Update Internal Data
    this.data.set(key, value);

    // 2. Notify Listeners (The React Cell components)
    if (oldValue !== value) {
      this.notify(rowId, colId, value);

      // 3. Trigger Calculations (Business Logic)
      this.calculateRow(rowId);
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

  // --- Calculation Logic (Simplified Formula Engine) ---
  // In a real app, this would be a dependency graph.
  // Here we hardcode: "total" = "price" * "qty"
  public calculateRow(rowId: string) {
    // Check if we have the necessary columns for our hardcoded formula logic
    const hasPrice = this.columns.some((c) => c.id === "price");
    const hasQty = this.columns.some((c) => c.id === "qty");
    const hasTotal = this.columns.some((c) => c.id === "total");

    if (hasPrice && hasQty && hasTotal) {
      const price = parseFloat(
        (this.getValue(rowId, "price") as string) || "0"
      );
      const qty = parseFloat((this.getValue(rowId, "qty") as string) || "0");

      const total = (price * qty).toFixed(2);

      // Update the total cell (which triggers its listener -> updates DOM)
      // We do NOT call setValue recursively if the value hasn't changed to avoid loops
      const currentTotal = this.getValue(rowId, "total");
      if (currentTotal !== total) {
        // Direct set data and notify
        const key = this.getKey(rowId, "total");
        this.data.set(key, total);
        this.notify(rowId, "total", total);
      }
    }
  }

  // --- Structure Management ---
  // These are called by the React component when state changes there,
  // just to keep the store in sync with what React is rendering.
  public syncStructure(rows: RowDef[], cols: ColumnDef[]) {
    this.rows = rows;
    this.columns = cols;
  }
}
