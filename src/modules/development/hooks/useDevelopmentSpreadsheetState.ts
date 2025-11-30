import { useState, useMemo, useCallback, useRef } from "react";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";
import type { GridStore } from "@/store/spreadsheet";

type Selection = { type: "row" | "column"; id: string } | null;

/**
 * Hook to manage independent spreadsheet state for development mode
 *
 * This hook provides isolated state management that doesn't interfere with
 * playground/datasheet stores. Each instance maintains its own state.
 */
export const useDevelopmentSpreadsheetState = () => {
  // Local state for development mode spreadsheet (independent from other modes)
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [rows, setRows] = useState<RowDef[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [isColumnsReady, setIsColumnsReady] = useState(false);
  const [activeCell, setActiveCell] = useState<{
    rowId: string;
    colId: string;
  } | null>(null);

  // GridStore reference for this development instance
  const gridStoreRef = useRef<GridStore | null>(null);

  /**
   * Convert rows to rowIds array for rendering
   */
  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);

  /**
   * Pre-compute selection sets for O(1) lookup
   */
  const selectedRowIds = useMemo(() => {
    if (selection?.type === "row") {
      return new Set([selection.id]);
    }
    return new Set<string>();
  }, [selection]);

  const selectedColIds = useMemo(() => {
    if (selection?.type === "column") {
      return new Set([selection.id]);
    }
    return new Set<string>();
  }, [selection]);

  /**
   * Toggle row selection
   */
  const toggleRowSelection = useCallback((id: string) => {
    setSelection((prev) => {
      if (prev?.type === "row" && prev.id === id) {
        return null; // Deselect if already selected
      }
      return { type: "row", id };
    });
  }, []);

  /**
   * Toggle column selection
   */
  const toggleColumnSelection = useCallback((id: string) => {
    setSelection((prev) => {
      if (prev?.type === "column" && prev.id === id) {
        return null; // Deselect if already selected
      }
      return { type: "column", id };
    });
  }, []);

  /**
   * Update selection on cell click
   * Clears selection if clicked cell is not in current selection
   */
  const updateSelectionOnCellClick = useCallback(
    (rowId: string, colId: string) => {
      setSelection((prev) => {
        // If clicking a cell in currently selected row or column, keep selection
        if (
          (prev?.type === "row" && prev.id === rowId) ||
          (prev?.type === "column" && prev.id === colId)
        ) {
          return prev;
        }
        // Otherwise, clear selection
        return null;
      });
    },
    []
  );

  /**
   * Add a new column
   */
  const addColumn = useCallback((afterColId?: string) => {
    setColumns((prevColumns) => {
      const newColId = `col_${Date.now()}`;
      const newColumn: ColumnDef = {
        id: newColId,
        name: `Column ${prevColumns.length + 1}`,
        type: "text",
        editable: true,
      };

      // If afterColId is specified, insert after that column
      if (afterColId) {
        const index = prevColumns.findIndex((col) => col.id === afterColId);
        if (index !== -1) {
          const newColumns = [...prevColumns];
          newColumns.splice(index + 1, 0, newColumn);
          return newColumns;
        }
      }

      // Otherwise, add to end
      return [...prevColumns, newColumn];
    });
  }, []);

  /**
   * Delete a column
   */
  const deleteColumn = useCallback((colId: string) => {
    setColumns((prevColumns) => prevColumns.filter((col) => col.id !== colId));
  }, []);

  /**
   * Add a new row
   */
  const addRow = useCallback((afterRowId?: string) => {
    setRows((prevRows) => {
      const newRowId = `dev_row_${Date.now()}`;
      const newRow: RowDef = { id: newRowId };

      // If afterRowId is specified, insert after that row
      if (afterRowId) {
        const index = prevRows.findIndex((row) => row.id === afterRowId);
        if (index !== -1) {
          const newRows = [...prevRows];
          newRows.splice(index + 1, 0, newRow);
          return newRows;
        }
      }

      // Otherwise, add to end
      return [...prevRows, newRow];
    });
  }, []);

  /**
   * Set all columns at once
   */
  const setColumnsState = useCallback((newColumns: ColumnDef[]) => {
    setColumns(newColumns);
  }, []);

  /**
   * Set all rows at once
   */
  const setRowsState = useCallback((newRows: RowDef[]) => {
    setRows(newRows);
  }, []);

  /**
   * Set columns ready state
   */
  const setColumnsReady = useCallback((ready: boolean) => {
    setIsColumnsReady(ready);
  }, []);

  /**
   * Set GridStore reference
   */
  const setGridStore = useCallback((store: GridStore | null) => {
    gridStoreRef.current = store;
  }, []);

  return {
    // State
    columns,
    rows,
    rowIds,
    selection,
    selectedRowIds,
    selectedColIds,
    isColumnsReady,
    activeCell,
    gridStore: gridStoreRef.current,

    // Actions
    setColumns: setColumnsState,
    setRows: setRowsState,
    setColumnsReady,
    setGridStore,
    toggleRowSelection,
    toggleColumnSelection,
    updateSelectionOnCellClick,
    addColumn,
    deleteColumn,
    addRow,
    setActiveCell,
  };
};
