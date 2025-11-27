import { useMemo } from "react";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { FormulaDefinition } from "@/types/formula";

/**
 * Hook to manage spreadsheet state including per-tab columns, rows, and selection
 */
export const useSpreadsheetState = (
  currentFormula: FormulaDefinition | null
) => {
  const formulaId = currentFormula?.id || "default";

  // Use per-tab state selectors
  const columns = useSpreadsheetStore((state) =>
    state.getTabColumns(formulaId)
  );
  const rows = useSpreadsheetStore((state) => state.getTabRows(formulaId));
  const isColumnsReady = useSpreadsheetStore((state) =>
    state.getTabColumnsReady(formulaId)
  );
  const selection = useSpreadsheetStore((state) => state.selection);

  // Get per-tab actions
  const setTabColumns = useSpreadsheetStore((state) => state.setTabColumns);
  const setTabRows = useSpreadsheetStore((state) => state.setTabRows);
  const setTabColumnsReady = useSpreadsheetStore(
    (state) => state.setTabColumnsReady
  );
  const setTabRowResult = useSpreadsheetStore((state) => state.setTabRowResult);
  const getOrCreateTabGridStore = useSpreadsheetStore(
    (state) => state.getOrCreateTabGridStore
  );

  // Get selection and column actions (still global)
  const addColumnAction = useSpreadsheetStore((state) => state.addTabColumn);
  const deleteColumnAction = useSpreadsheetStore(
    (state) => state.deleteTabColumn
  );
  const toggleRowSelection = useSpreadsheetStore(
    (state) => state.toggleRowSelection
  );
  const toggleColumnSelection = useSpreadsheetStore(
    (state) => state.toggleColumnSelection
  );
  const updateSelectionOnCellClick = useSpreadsheetStore(
    (state) => state.updateSelectionOnCellClick
  );

  // Convert rows from store to rowIds array for rendering
  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);

  // Pre-compute selection sets for O(1) lookup instead of O(n) checks
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

  return {
    formulaId,
    columns,
    rows,
    rowIds,
    isColumnsReady,
    selection,
    selectedRowIds,
    selectedColIds,
    // Actions
    setTabColumns,
    setTabRows,
    setTabColumnsReady,
    setTabRowResult,
    getOrCreateTabGridStore,
    addColumnAction,
    deleteColumnAction,
    toggleRowSelection,
    toggleColumnSelection,
    updateSelectionOnCellClick,
  };
};
