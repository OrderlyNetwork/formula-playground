import { create } from "zustand";
import { shallow } from "zustand/shallow";
import type { ColumnDef } from "@/types/spreadsheet";
import type { TableRow } from "@/modules/formula-datasheet/types";
import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import {
  validateRow,
  reconstructFormulaInputs,
} from "@/utils/formulaTableUtils";
import { useFormulaStore } from "./formulaStore";
import { dataSheetStateTracker } from "@/modules/formula-datasheet/services/dataSheetStateTracker";

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
 * Handles all state including columns, rows (TableRow with business data), selection, etc.
 */
interface SpreadsheetState {
  // UI State
  columns: ColumnDef[];
  rows: TableRow[];
  selection: Selection;
  isColumnsReady: boolean;

  // Formula context
  currentFormula?: FormulaDefinition;

  // Actions for managing state
  setColumns: (columns: ColumnDef[]) => void;
  setRows: (rows: TableRow[] | ((prev: TableRow[]) => TableRow[])) => void;
  setSelection: (selection: Selection) => void;
  setIsColumnsReady: (ready: boolean) => void;
  setCurrentFormula: (formula?: FormulaDefinition) => void;
  setFormulaAndRows: (formula: FormulaDefinition, rows: TableRow[]) => void;

  // Row operations
  addRow: (afterRowId?: string) => void;

  // Column operations
  addColumn: (afterColId?: string) => void;
  deleteColumn: (colId: string) => void;

  // Business logic operations
  updateCell: (rowId: string, path: string, value: FormulaScalar) => void;
  updateRowData: (rowId: string, data: Record<string, FormulaScalar>) => void;
  deleteRow: (rowId: string) => void;
  duplicateRow: (
    rowId: string,
    getStableRowId: (formulaId: string, rowIndex: number) => string
  ) => void;
  addNewRow: (
    getStableRowId: (formulaId: string, rowIndex: number) => string,
    createInitialRow: (formula: FormulaDefinition, index: number) => TableRow
  ) => void;

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
 * Minimum number of rows to display in spreadsheet
 */
const MIN_ROWS = 50;

/**
 * Ensure rows array has at least MIN_ROWS entries by padding with empty rows
 */
const ensureMinimumRows = (
  rows: TableRow[],
  formulaId?: string
): TableRow[] => {
  if (rows.length >= MIN_ROWS) return rows;

  const paddedRows = [...rows];
  const baseId = formulaId || "empty";

  while (paddedRows.length < MIN_ROWS) {
    paddedRows.push({
      id: `${baseId}_placeholder_${paddedRows.length}`,
      data: {},
      _isValid: false,
    });
  }

  return paddedRows;
};

/**
 * Initial state values
 */
const initialState = {
  columns: [] as ColumnDef[],
  rows: [] as TableRow[],
  selection: null as Selection,
  isColumnsReady: false,
  currentFormula: undefined,
};

/**
 * Zustand store for Spreadsheet state (UI + Business logic)
 */
export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  ...initialState,

  // Basic setters
  setColumns: (columns) => set({ columns }),
  setRows: (rowsOrUpdater) => {
    if (typeof rowsOrUpdater === "function") {
      set((state) => {
        const newRows = rowsOrUpdater(state.rows);
        return { rows: ensureMinimumRows(newRows, state.currentFormula?.id) };
      });
    } else {
      set((state) => ({
        rows: ensureMinimumRows(rowsOrUpdater, state.currentFormula?.id),
      }));
    }
  },
  setSelection: (selection) => set({ selection }),
  setIsColumnsReady: (isColumnsReady) => set({ isColumnsReady }),
  setCurrentFormula: (currentFormula) => set({ currentFormula }),

  // Set formula and rows together to ensure proper padding
  setFormulaAndRows: (formula, rows) => {
    set({
      currentFormula: formula,
      rows: ensureMinimumRows(rows, formula.id),
    });
  },

  // Add row after a specific row or at the end (deprecated for spreadsheet UI, use addNewRow for business logic)
  addRow: (afterRowId) =>
    set((state) => {
      const newRow: TableRow = {
        id: generateId(),
        data: {},
        _isValid: false,
      };

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

  // Business logic operations

  /**
   * Update a single cell value with validation
   */
  updateCell: (rowId, path, value) => {
    const state = get();
    const currentFormula = state.currentFormula;
    if (!currentFormula) return;

    // Get old value for tracking
    const currentRow = state.rows.find((r) => r.id === rowId);
    const oldValue: FormulaScalar = currentRow?.data[path] ?? "";

    set((state) => {
      const updatedRows = state.rows.map((row) => {
        if (row.id === rowId) {
          const updatedData = { ...row.data, [path]: value };
          const validation = validateRow(
            { ...row, data: updatedData },
            currentFormula
          );

          // Record cell update event
          dataSheetStateTracker.recordCellUpdate(currentFormula.id, {
            timestamp: Date.now(),
            rowId,
            path,
            oldValue,
            newValue: value,
            isValid: validation.isValid,
            validationErrors: validation.isValid
              ? undefined
              : validation.errors,
          });

          return {
            ...row,
            data: updatedData,
            _isValid: validation.isValid,
            _error: validation.isValid
              ? undefined
              : validation.errors.join(", "),
          };
        }
        return row;
      });

      // Update the formula store if this is the first row
      if (state.rows[0]?.id === rowId) {
        const updatedFirstRow = updatedRows[0];
        if (updatedFirstRow) {
          const reconstructedInputs = reconstructFormulaInputs(
            updatedFirstRow.data,
            currentFormula
          );

          // Update each input individually to trigger the store's update logic
          const formulaStore = useFormulaStore.getState();
          for (const [key, val] of Object.entries(reconstructedInputs)) {
            formulaStore.updateInputAt(key, val);
          }
        }
      }

      return { rows: updatedRows };
    });
  },

  /**
   * Update entire row data (for batch updates)
   */
  updateRowData: (rowId, data) => {
    const currentFormula = get().currentFormula;
    if (!currentFormula) return;

    set((state) => ({
      rows: state.rows.map((row) => {
        if (row.id === rowId) {
          const validation = validateRow({ ...row, data }, currentFormula);
          return {
            ...row,
            data,
            _isValid: validation.isValid,
            _error: validation.isValid
              ? undefined
              : validation.errors.join(", "),
          };
        }
        return row;
      }),
    }));
  },

  /**
   * Delete a row
   */
  deleteRow: (rowId) => {
    set((state) => ({
      rows: state.rows.filter((row) => row.id !== rowId),
    }));
  },

  /**
   * Duplicate a row
   */
  duplicateRow: (rowId, getStableRowId) => {
    const currentFormula = get().currentFormula;
    if (!currentFormula) return;

    set((state) => {
      const rowToDuplicate = state.rows.find((row) => row.id === rowId);
      if (!rowToDuplicate) return state;

      // Get stable row ID for the new row
      const stableRowId = getStableRowId(currentFormula.id, state.rows.length);

      const newRow: TableRow = {
        ...rowToDuplicate,
        id: stableRowId,
        _result: undefined,
        _executionTime: undefined,
        _error: undefined,
      };

      return { rows: [...state.rows, newRow] };
    });
  },

  /**
   * Add a new empty row
   */
  addNewRow: (getStableRowId, createInitialRow) => {
    const currentFormula = get().currentFormula;
    if (!currentFormula) return;

    set((state) => {
      const stableRowId = getStableRowId(currentFormula.id, state.rows.length);
      const newRow = {
        ...createInitialRow(currentFormula, state.rows.length),
        id: stableRowId,
      };

      return { rows: [...state.rows, newRow] };
    });
  },

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
