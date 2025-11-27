import { create } from "zustand";
import { shallow } from "zustand/shallow";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";
import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import { GridStore } from "./spreadsheet";

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
 *
 * Now supports per-tab state management for multi-tab formula editing
 */
interface SpreadsheetState {
  // UI State (per-tab)
  /** Column definitions by tab (formulaId -> columns) */
  tabColumns: Record<string, ColumnDef[]>;
  /** Columns ready state by tab (formulaId -> isReady) */
  tabColumnsReady: Record<string, boolean>;

  // Selection (global - only one selection at a time)
  selection: Selection;

  // Formula context (global)
  currentFormula?: FormulaDefinition;

  // Per-tab state
  /** Row definitions by tab (formulaId -> rows) */
  tabRows: Record<string, RowDef[]>;
  /** Calculation results by tab (formulaId -> results) */
  tabCalculationResults: Record<string, CalculationResults>;
  /** GridStore instances by tab (formulaId -> GridStore) */
  tabGridStores: Record<string, GridStore>;

  // Legacy global state (for backward compatibility)
  columns: ColumnDef[];
  rows: RowDef[];
  calculationResults: CalculationResults;
  isColumnsReady: boolean;

  // Actions for managing state
  setColumns: (columns: ColumnDef[]) => void;
  setRows: (rows: RowDef[]) => void;
  setSelection: (selection: Selection) => void;
  setIsColumnsReady: (ready: boolean) => void;
  setCurrentFormula: (formula?: FormulaDefinition) => void;

  // Per-tab actions
  /** Set columns for a specific tab */
  setTabColumns: (formulaId: string, columns: ColumnDef[]) => void;
  /** Get columns for a specific tab */
  getTabColumns: (formulaId: string) => ColumnDef[];
  /** Set columns ready state for a specific tab */
  setTabColumnsReady: (formulaId: string, ready: boolean) => void;
  /** Get columns ready state for a specific tab */
  getTabColumnsReady: (formulaId: string) => boolean;
  /** Set rows for a specific tab */
  setTabRows: (formulaId: string, rows: RowDef[]) => void;
  /** Get rows for a specific tab */
  getTabRows: (formulaId: string) => RowDef[];
  /** Set calculation results for a specific tab */
  setTabCalculationResults: (
    formulaId: string,
    results: CalculationResults
  ) => void;
  /** Get calculation results for a specific tab */
  getTabCalculationResults: (formulaId: string) => CalculationResults;
  /** Get or create GridStore for a specific tab */
  getOrCreateTabGridStore: (
    formulaId: string,
    initialRows: RowDef[],
    initialColumns: ColumnDef[],
    onCalculateRow?: (rowId: string, colId: string) => void
  ) => GridStore;
  /** Get GridStore for a specific tab */
  getTabGridStore: (formulaId: string) => GridStore | undefined;
  /** Clear all data for a specific tab */
  clearTab: (formulaId: string) => void;

  // Calculation result operations
  /** Set calculation result for a single row */
  setRowResult: (rowId: string, result: RowCalculationResult) => void;
  /** Set calculation result for a single row in a specific tab */
  setTabRowResult: (
    formulaId: string,
    rowId: string,
    result: RowCalculationResult
  ) => void;
  /** Set calculation results for multiple rows at once */
  setCalculationResults: (results: CalculationResults) => void;
  /** Get calculation result for a row */
  getRowResult: (rowId: string) => RowCalculationResult | undefined;
  /** Get calculation result for a row in a specific tab */
  getTabRowResult: (
    formulaId: string,
    rowId: string
  ) => RowCalculationResult | undefined;
  /** Clear calculation result for a row */
  clearRowResult: (rowId: string) => void;
  /** Clear all calculation results */
  clearAllResults: () => void;
  /** Clear all results for a specific tab */
  clearTabResults: (formulaId: string) => void;

  // Row operations
  /** Add a new row after a specific row or at the end (legacy - uses global rows) */
  addRow: (
    afterRowId?: string,
    gridStore?: GridStore,
    columns?: ColumnDef[]
  ) => void;
  /** Delete a row by ID (legacy - uses global rows) */
  deleteRow: (rowId: string) => void;
  /** Add a new row for a specific tab */
  addTabRow: (
    formulaId: string,
    afterRowId?: string,
    gridStore?: GridStore,
    columns?: ColumnDef[]
  ) => void;
  /** Delete a row for a specific tab */
  deleteTabRow: (formulaId: string, rowId: string) => void;

  // Column operations
  addColumn: (afterColId?: string) => void;
  deleteColumn: (colId: string) => void;
  /** Add a column for a specific tab */
  addTabColumn: (formulaId: string, afterColId?: string) => void;
  /** Delete a column for a specific tab */
  deleteTabColumn: (formulaId: string, colId: string) => void;

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
  tabColumns: {} as Record<string, ColumnDef[]>,
  tabColumnsReady: {} as Record<string, boolean>,
  tabRows: {} as Record<string, RowDef[]>,
  tabCalculationResults: {} as Record<string, CalculationResults>,
  tabGridStores: {} as Record<string, GridStore>,
};

/**
 * Zustand store for Spreadsheet state (UI + Calculation Results + Row Structure)
 * Row structure and calculation results are managed by this store
 * Now supports per-tab state management for multi-tab formula editing
 */
export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  ...initialState,

  // Basic setters
  setColumns: (columns) => set({ columns }),
  setRows: (rows) => set({ rows }),
  setSelection: (selection) => set({ selection }),
  setIsColumnsReady: (isColumnsReady) => set({ isColumnsReady }),
  setCurrentFormula: (currentFormula) => set({ currentFormula }),

  // Per-tab setters and getters
  setTabColumns: (formulaId, columns) =>
    set((state) => ({
      tabColumns: {
        ...state.tabColumns,
        [formulaId]: columns,
      },
    })),

  getTabColumns: (formulaId) => {
    const state = get();
    return state.tabColumns[formulaId] || [];
  },

  setTabColumnsReady: (formulaId, ready) =>
    set((state) => ({
      tabColumnsReady: {
        ...state.tabColumnsReady,
        [formulaId]: ready,
      },
    })),

  getTabColumnsReady: (formulaId) => {
    const state = get();
    return state.tabColumnsReady[formulaId] || false;
  },

  setTabRows: (formulaId, rows) =>
    set((state) => ({
      tabRows: {
        ...state.tabRows,
        [formulaId]: rows,
      },
    })),

  getTabRows: (formulaId) => {
    const state = get();
    return state.tabRows[formulaId] || [];
  },

  setTabCalculationResults: (formulaId, results) =>
    set((state) => ({
      tabCalculationResults: {
        ...state.tabCalculationResults,
        [formulaId]: results,
      },
    })),

  getTabCalculationResults: (formulaId) => {
    const state = get();
    return state.tabCalculationResults[formulaId] || {};
  },

  /**
   * Get or create GridStore for a specific tab
   * @param formulaId - Formula/tab identifier
   * @param initialRows - Initial rows for new GridStore
   * @param initialColumns - Initial columns for new GridStore
   * @param onCalculateRow - Callback for row calculation
   * @returns GridStore instance for the tab
   */
  getOrCreateTabGridStore: (
    formulaId,
    initialRows,
    initialColumns,
    onCalculateRow
  ) => {
    const state = get();

    // Return existing GridStore if it exists
    if (state.tabGridStores[formulaId]) {
      return state.tabGridStores[formulaId];
    }

    // Create new GridStore
    const newGridStore = new GridStore(
      initialRows,
      initialColumns,
      onCalculateRow
    );

    // Store it
    set((state) => ({
      tabGridStores: {
        ...state.tabGridStores,
        [formulaId]: newGridStore,
      },
    }));

    return newGridStore;
  },

  /**
   * Get GridStore for a specific tab
   * @param formulaId - Formula/tab identifier
   * @returns GridStore instance or undefined if not found
   */
  getTabGridStore: (formulaId) => {
    const state = get();
    return state.tabGridStores[formulaId];
  },

  /**
   * Clear all data for a specific tab
   * @param formulaId - Formula/tab identifier
   */
  clearTab: (formulaId) =>
    set((state) => {
      const newTabRows = { ...state.tabRows };
      const newTabColumns = { ...state.tabColumns };
      const newTabColumnsReady = { ...state.tabColumnsReady };
      const newTabResults = { ...state.tabCalculationResults };
      const newTabGridStores = { ...state.tabGridStores };

      delete newTabRows[formulaId];
      delete newTabColumns[formulaId];
      delete newTabColumnsReady[formulaId];
      delete newTabResults[formulaId];
      delete newTabGridStores[formulaId];

      return {
        tabRows: newTabRows,
        tabColumns: newTabColumns,
        tabColumnsReady: newTabColumnsReady,
        tabCalculationResults: newTabResults,
        tabGridStores: newTabGridStores,
      };
    }),

  // Calculation result operations (legacy - for backward compatibility)

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
   * Set calculation result for a single row in a specific tab
   * @param formulaId - Formula/tab identifier
   * @param rowId - Row identifier
   * @param result - Calculation result data
   */
  setTabRowResult: (formulaId, rowId, result) =>
    set((state) => {
      const tabResults = state.tabCalculationResults[formulaId] || {};
      return {
        tabCalculationResults: {
          ...state.tabCalculationResults,
          [formulaId]: {
            ...tabResults,
            [rowId]: result,
          },
        },
      };
    }),

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
   *
   * Note: For reactive use in components, prefer direct state access:
   * useSpreadsheetStore((state) => state.calculationResults[rowId])
   * This method is for non-reactive scenarios (e.g., within actions)
   */
  getRowResult: (rowId) => get().calculationResults[rowId],

  /**
   * Get calculation result for a row in a specific tab
   * @param formulaId - Formula/tab identifier
   * @param rowId - Row identifier
   * @returns Calculation result or undefined if not found
   *
   * Note: For reactive use in components, prefer direct state access:
   * useSpreadsheetStore((state) => state.tabCalculationResults[formulaId]?.[rowId])
   * This method is for non-reactive scenarios (e.g., within actions)
   */
  getTabRowResult: (formulaId, rowId) => {
    const state = get();
    const tabResults = state.tabCalculationResults[formulaId] || {};
    return tabResults[rowId];
  },

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

  /**
   * Clear all results for a specific tab
   * @param formulaId - Formula/tab identifier
   */
  clearTabResults: (formulaId) =>
    set((state) => {
      const newTabResults = { ...state.tabCalculationResults };
      delete newTabResults[formulaId];
      return { tabCalculationResults: newTabResults };
    }),

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
        const newIndex = newRows.findIndex((r) => r.id === newRowId) + 1;
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
        calculationResults: remainingResults,
      };
    }),

  /**
   * Add a new row for a specific tab
   * @param formulaId - Formula/tab identifier
   * @param afterRowId - Optional row ID after which to insert the new row
   * @param gridStore - Optional GridStore instance to sync with
   * @param columns - Optional columns array for GridStore sync
   */
  addTabRow: (formulaId, afterRowId, gridStore?, columns?) =>
    set((state) => {
      const newId = generateId();
      const newRowId = `${formulaId}_${newId}`;
      const newRow: RowDef = { id: newRowId };

      const currentTabRows = state.tabRows[formulaId] || [];
      let newRows: RowDef[];

      if (afterRowId) {
        const index = currentTabRows.findIndex((r) => r.id === afterRowId);
        if (index !== -1) {
          newRows = [...currentTabRows];
          newRows.splice(index + 1, 0, newRow);
        } else {
          // If afterRowId not found, append at end
          newRows = [...currentTabRows, newRow];
        }
      } else {
        // Default: append at the end
        newRows = [...currentTabRows, newRow];
      }

      // Sync with GridStore if provided
      if (gridStore && columns) {
        gridStore.syncStructure(newRows, columns);

        // Set index for new row (silent mode)
        const newIndex = newRows.findIndex((r) => r.id === newRowId) + 1;
        gridStore.setValue(newRowId, "index", String(newIndex), true);
      }

      return {
        tabRows: {
          ...state.tabRows,
          [formulaId]: newRows,
        },
      };
    }),

  /**
   * Delete a row for a specific tab
   * @param formulaId - Formula/tab identifier
   * @param rowId - Row ID to delete
   */
  deleteTabRow: (formulaId, rowId) =>
    set((state) => {
      const currentTabRows = state.tabRows[formulaId] || [];
      const newRows = currentTabRows.filter((r) => r.id !== rowId);
      const newSelection =
        state.selection?.type === "row" && state.selection.id === rowId
          ? null
          : state.selection;

      // Clear calculation results for the deleted row
      const tabResults = state.tabCalculationResults[formulaId] || {};
      const newTabResults = { ...tabResults };
      delete newTabResults[rowId];

      return {
        tabRows: {
          ...state.tabRows,
          [formulaId]: newRows,
        },
        tabCalculationResults: {
          ...state.tabCalculationResults,
          [formulaId]: newTabResults,
        },
        selection: newSelection,
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

  /**
   * Add a column for a specific tab after a specific column or before the result column
   */
  addTabColumn: (formulaId, afterColId) =>
    set((state) => {
      const currentColumns = state.tabColumns[formulaId] || [];
      const newId = generateId();
      const newCol: ColumnDef = {
        id: `col_${newId}`,
        title: "New Column",
        width: 150,
        type: "text",
      };

      let newCols: ColumnDef[];

      if (afterColId) {
        const index = currentColumns.findIndex((c) => c.id === afterColId);
        if (index !== -1) {
          newCols = [...currentColumns];
          newCols.splice(index + 1, 0, newCol);
        } else {
          // If afterColId not found, insert before result column
          const resultIndex = currentColumns.findIndex(
            (c) => c.id === "result"
          );
          if (resultIndex !== -1) {
            newCols = [...currentColumns];
            newCols.splice(resultIndex, 0, newCol);
          } else {
            newCols = [...currentColumns, newCol];
          }
        }
      } else {
        // Default: insert before the result column if it exists, else append
        const resultIndex = currentColumns.findIndex((c) => c.id === "result");
        if (resultIndex !== -1) {
          newCols = [...currentColumns];
          newCols.splice(resultIndex, 0, newCol);
        } else {
          newCols = [...currentColumns, newCol];
        }
      }

      return {
        tabColumns: {
          ...state.tabColumns,
          [formulaId]: newCols,
        },
      };
    }),

  /**
   * Delete a column for a specific tab
   */
  deleteTabColumn: (formulaId, colId) =>
    set((state) => {
      const currentColumns = state.tabColumns[formulaId] || [];
      const newColumns = currentColumns.filter((c) => c.id !== colId);
      const newSelection =
        state.selection?.type === "column" && state.selection.id === colId
          ? null
          : state.selection;

      return {
        tabColumns: {
          ...state.tabColumns,
          [formulaId]: newColumns,
        },
        selection: newSelection,
      };
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
