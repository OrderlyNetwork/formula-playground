import { create } from "zustand";
import { shallow } from "zustand/shallow";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";
import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import type { GridStore } from "./spreadsheet";

/**
 * Calculation result for a single row
 * Stored in a map by rowId for O(1) lookup
 */
export interface RowCalculationResult {
  /** Calculation result (if calculated) */
  result?: FormulaScalar;
  /** Execution time in milliseconds (if calculated) */
  executionTime?: number;
  /** Error message (if validation or calculation failed) */
  error?: string;
  /** Validation status */
  isValid?: boolean;
}

/**
 * Map of rowId -> calculation result
 * Key: row ID, Value: calculation result data
 */
export type CalculationResults = Record<string, RowCalculationResult>;

/**
 * Selection type for rows and columns
 */
type Selection = { type: "row" | "column"; id: string } | null;

/**
 * Export shallow for use in components
 */
export { shallow };

/**
 * Spreadsheet State managed by Zustand
 * Handles UI state and calculation results only
 * Input data and row structure are stored in GridStore (single source of truth)
 */
interface SpreadsheetState {
  // UI State
  columns: ColumnDef[];
  /** Row definitions managed by Zustand store */
  rows: RowDef[];
  /** Calculation results by rowId. Row structure is managed by this store */
  calculationResults: CalculationResults;
  selection: Selection;
  isColumnsReady: boolean;

  // Formula context
  currentFormula?: FormulaDefinition;

  // Actions for managing state
  setColumns: (columns: ColumnDef[]) => void;
  setRows: (rows: RowDef[]) => void;
  setSelection: (selection: Selection) => void;
  setIsColumnsReady: (ready: boolean) => void;
  setCurrentFormula: (formula?: FormulaDefinition) => void;

  // Calculation result operations
  /** Set calculation result for a single row */
  setRowResult: (rowId: string, result: RowCalculationResult) => void;
  /** Set calculation results for multiple rows at once */
  setCalculationResults: (results: CalculationResults) => void;
  /** Get calculation result for a row */
  getRowResult: (rowId: string) => RowCalculationResult | undefined;
  /** Clear calculation result for a row */
  clearRowResult: (rowId: string) => void;
  /** Clear all calculation results */
  clearAllResults: () => void;

  // Row operations
  /** Add a new row after a specific row or at the end */
  addRow: (afterRowId?: string, gridStore?: GridStore, columns?: ColumnDef[]) => void;
  /** Delete a row by ID */
  deleteRow: (rowId: string) => void;

  // Column operations
  addColumn: (afterColId?: string) => void;
  deleteColumn: (colId: string) => void;

  // Selection operations
  toggleRowSelection: (rowId: string) => void;
  toggleColumnSelection: (colId: string) => void;
  clearSelection: () => void;
  updateSelectionOnCellClick: (rowId: string, colId: string) => void;

  // Reset store
  reset: () => void;
}

/**
 * Generate a unique ID for columns and rows
 */
const generateId = () => Math.random().toString(36).substring(2, 11);

/**
 * Initial state values
 */
const initialState = {
  columns: [] as ColumnDef[],
  rows: [] as RowDef[],
  calculationResults: {} as CalculationResults,
  selection: null as Selection,
  isColumnsReady: false,
  currentFormula: undefined as FormulaDefinition | undefined,
};

/**
 * Zustand store for Spreadsheet state (UI + Calculation Results + Row Structure)
 * Row structure and calculation results are managed by this store
 */
export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  ...initialState,

  // Basic setters
  setColumns: (columns) => set({ columns }),
  setRows: (rows) => set({ rows }),
  setSelection: (selection) => set({ selection }),
  setIsColumnsReady: (isColumnsReady) => set({ isColumnsReady }),
  setCurrentFormula: (currentFormula) => set({ currentFormula }),

  // Calculation result operations

  /**
   * Set calculation result for a single row
   * @param rowId - Row identifier
   * @param result - Calculation result data
   */
  setRowResult: (rowId, result) =>
    set((state) => ({
      calculationResults: {
        ...state.calculationResults,
        [rowId]: result,
      },
    })),

  /**
   * Set calculation results for multiple rows at once
   * Merges with existing results
   * @param results - Map of rowId -> calculation result
   */
  setCalculationResults: (results) =>
    set((state) => ({
      calculationResults: {
        ...state.calculationResults,
        ...results,
      },
    })),

  /**
   * Get calculation result for a row (sync getter)
   * @param rowId - Row identifier
   * @returns Calculation result or undefined
   */
  getRowResult: (rowId) => get().calculationResults[rowId],

  /**
   * Clear calculation result for a single row
   * @param rowId - Row identifier
   */
  clearRowResult: (rowId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [rowId]: _removed, ...rest } = state.calculationResults;
      return { calculationResults: rest };
    }),

  /**
   * Clear all calculation results
   */
  clearAllResults: () => set({ calculationResults: {} }),

  // Row operations

  /**
   * Add a new row after a specific row or at the end
   * @param afterRowId - Optional row ID after which to insert the new row
   * @param gridStore - Optional GridStore instance to sync with
   * @param columns - Optional columns array for GridStore sync
   */
  addRow: (afterRowId, gridStore?, columns?) =>
    set((state) => {
      const newId = generateId();
      const currentFormula = state.currentFormula;
      const formulaId = currentFormula?.id || "row";
      const newRowId = `${formulaId}_${newId}`;
      const newRow: RowDef = { id: newRowId };

      let newRows: RowDef[];

      if (afterRowId) {
        const index = state.rows.findIndex((r) => r.id === afterRowId);
        if (index !== -1) {
          newRows = [...state.rows];
          newRows.splice(index + 1, 0, newRow);
        } else {
          // If afterRowId not found, append at end
          newRows = [...state.rows, newRow];
        }
      } else {
        // Default: append at the end
        newRows = [...state.rows, newRow];
      }

      // Sync with GridStore if provided
      if (gridStore && columns) {
        gridStore.syncStructure(newRows, columns);

        // Set index for new row (silent mode)
        const newIndex = newRows.findIndex(r => r.id === newRowId) + 1;
        gridStore.setValue(newRowId, "index", String(newIndex), true);
      }

      return { rows: newRows };
    }),

  /**
   * Delete a row by ID
   * @param rowId - Row ID to delete
   */
  deleteRow: (rowId) =>
    set((state) => {
      const newRows = state.rows.filter((r) => r.id !== rowId);
      const newSelection =
        state.selection?.type === "row" && state.selection.id === rowId
          ? null
          : state.selection;

      // Clear calculation results for the deleted row
      const remainingResults = { ...state.calculationResults };
      delete remainingResults[rowId];

      return {
        rows: newRows,
        selection: newSelection,
        calculationResults: remainingResults
      };
    }),

  // Column operations

  /**
   * Add a column after a specific column or before the result column
   */
  addColumn: (afterColId) =>
    set((state) => {
      const newId = generateId();
      const newCol: ColumnDef = {
        id: `col_${newId}`,
        title: "New Column",
        width: 150,
        type: "text",
      };

      if (afterColId) {
        const index = state.columns.findIndex((c) => c.id === afterColId);
        if (index !== -1) {
          const newCols = [...state.columns];
          newCols.splice(index + 1, 0, newCol);
          return { columns: newCols };
        }
      }

      // Default: insert before the result column if it exists, else append
      const resultIndex = state.columns.findIndex((c) => c.id === "result");
      if (resultIndex !== -1) {
        const newCols = [...state.columns];
        newCols.splice(resultIndex, 0, newCol);
        return { columns: newCols };
      }

      return { columns: [...state.columns, newCol] };
    }),

  // Delete a column
  deleteColumn: (colId) =>
    set((state) => {
      const newColumns = state.columns.filter((c) => c.id !== colId);
      const newSelection =
        state.selection?.type === "column" && state.selection.id === colId
          ? null
          : state.selection;

      return { columns: newColumns, selection: newSelection };
    }),

  // Toggle row selection
  toggleRowSelection: (rowId) =>
    set((state) => ({
      selection:
        state.selection?.type === "row" && state.selection.id === rowId
          ? null
          : { type: "row", id: rowId },
    })),

  // Toggle column selection
  toggleColumnSelection: (colId) =>
    set((state) => ({
      selection:
        state.selection?.type === "column" && state.selection.id === colId
          ? null
          : { type: "column", id: colId },
    })),

  // Clear selection
  clearSelection: () => set({ selection: null }),

  // Update selection when clicking inside a cell
  updateSelectionOnCellClick: (rowId, colId) =>
    set((state) => {
      // If nothing is selected, stay null
      if (!state.selection) return { selection: null };

      // If we clicked inside the currently selected row, keep selection
      if (state.selection.type === "row" && state.selection.id === rowId) {
        return {};
      }

      // If we clicked inside the currently selected column, keep selection
      if (state.selection.type === "column" && state.selection.id === colId) {
        return {};
      }

      // Otherwise (clicked outside), clear selection
      return { selection: null };
    }),

  // Reset store to initial state
  reset: () => set(initialState),
}));
