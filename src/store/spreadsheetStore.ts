import { create } from "zustand";
import { shallow } from "zustand/shallow";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";

/**
 * Selection type for rows and columns
 */
type Selection = { type: "row" | "column"; id: string } | null;

/**
 * Export shallow for use in components
 */
export { shallow };

/**
 * Spreadsheet UI State managed by Zustand
 * Handles all UI-related state like columns, rows, selection, etc.
 */
interface SpreadsheetState {
  // UI State
  columns: ColumnDef[];
  rows: RowDef[];
  selection: Selection;
  isColumnsReady: boolean;

  // Actions for managing state
  setColumns: (columns: ColumnDef[]) => void;
  setRows: (rows: RowDef[]) => void;
  setSelection: (selection: Selection) => void;
  setIsColumnsReady: (ready: boolean) => void;

  // Row operations
  addRow: (afterRowId?: string) => void;
  
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
 * Generate a unique ID for rows/columns
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Initial state values
 */
const initialState = {
  columns: [] as ColumnDef[],
  rows: [] as RowDef[],
  selection: null as Selection,
  isColumnsReady: false,
};

/**
 * Zustand store for Spreadsheet UI state
 */
export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  ...initialState,

  // Basic setters
  setColumns: (columns) => set({ columns }),
  setRows: (rows) => set({ rows }),
  setSelection: (selection) => set({ selection }),
  setIsColumnsReady: (isColumnsReady) => set({ isColumnsReady }),

  // Add row after a specific row or at the end
  addRow: (afterRowId) =>
    set((state) => {
      const newRow = { id: generateId() };

      if (afterRowId) {
        const index = state.rows.findIndex((r) => r.id === afterRowId);
        if (index !== -1) {
          const newRows = [...state.rows];
          newRows.splice(index + 1, 0, newRow);
          return { rows: newRows };
        }
      }

      // Default: append to end
      return { rows: [...state.rows, newRow] };
    }),

  // Add column after a specific column or before the result column
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

