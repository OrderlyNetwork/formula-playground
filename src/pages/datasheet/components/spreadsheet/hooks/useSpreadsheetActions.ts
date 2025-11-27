import { useCallback } from "react";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { GridStore } from "@/store/spreadsheet";
import type { ColumnDef } from "@/types/spreadsheet";

type Selection = { type: "row" | "column"; id: string } | null;

/**
 * Hook to manage spreadsheet actions (add row/column, selection handlers)
 */
export const useSpreadsheetActions = (
  formulaId: string,
  selection: Selection | null,
  columns: ColumnDef[],
  gridStore: GridStore | null,
  toggleRowSelection: (id: string) => void,
  toggleColumnSelection: (id: string) => void,
  updateSelectionOnCellClick: (rowId: string, colId: string) => void,
  addColumnAction: (afterColId?: string) => void
) => {
  /**
   * Add a new row to the spreadsheet (per-tab)
   * Uses store's addTabRow method and syncs with GridStore
   */
  const addRow = useCallback(() => {
    const afterRowId = selection?.type === "row" ? selection.id : undefined;

    // Add row using per-tab store method with GridStore sync
    const state = useSpreadsheetStore.getState();
    state.addTabRow(formulaId, afterRowId, gridStore || undefined, columns);
  }, [selection, columns, formulaId, gridStore]);

  const addColumn = useCallback(() => {
    const afterColId = selection?.type === "column" ? selection.id : undefined;
    addColumnAction(afterColId);
  }, [selection, addColumnAction]);

  // --- Selection Handlers ---
  const handleRowHeaderClick = useCallback(
    (id: string) => {
      toggleRowSelection(id);
    },
    [toggleRowSelection]
  );

  const handleColHeaderClick = useCallback(
    (id: string) => {
      toggleColumnSelection(id);
    },
    [toggleColumnSelection]
  );

  // Handle click inside a cell: Clear selection if clicked outside current selection
  const handleCellClick = useCallback(
    (rowId: string, colId: string) => {
      updateSelectionOnCellClick(rowId, colId);
    },
    [updateSelectionOnCellClick]
  );

  return {
    addRow,
    addColumn,
    handleRowHeaderClick,
    handleColHeaderClick,
    handleCellClick,
  };
};
