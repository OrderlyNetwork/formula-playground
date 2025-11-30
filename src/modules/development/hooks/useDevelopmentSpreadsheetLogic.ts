import { useEffect, useCallback, useRef } from "react";
import type { FormulaDefinition } from "@/types/formula";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";
import { GridStore } from "@/store/spreadsheet";
import { generateColumnsFromFormula } from "@/pages/datasheet/components/spreadsheet/spreadsheetUtils";

/**
 * Minimum number of rows to display in development spreadsheet
 */
const MIN_ROWS = 50;

interface UseDevelopmentSpreadsheetLogicParams {
  formula: FormulaDefinition | null;
  flattenedPaths: FlattenedPath[];
  setColumns: (columns: ColumnDef[]) => void;
  setRows: (rows: RowDef[]) => void;
  setColumnsReady: (ready: boolean) => void;
  setGridStore: (store: GridStore | null) => void;
}

/**
 * Hook to manage spreadsheet initialization and calculation logic for development mode
 *
 * This hook is independent from playground/datasheet stores and manages its own
 * GridStore instance for isolated testing.
 */
export const useDevelopmentSpreadsheetLogic = ({
  formula,
  flattenedPaths,
  setColumns,
  setRows,
  setColumnsReady,
  setGridStore,
}: UseDevelopmentSpreadsheetLogicParams) => {
  // Local GridStore instance for this development session
  const gridStoreRef = useRef<GridStore | null>(null);
  const lastFormulaIdRef = useRef<string | undefined>(undefined);

  /**
   * Generate row definitions with minimum row count
   */
  const generateRows = useCallback(
    (count: number, formulaId?: string): RowDef[] => {
      const rows: RowDef[] = [];
      const baseId = formulaId || "dev_row";
      const targetCount = Math.max(count, MIN_ROWS);

      for (let i = 0; i < targetCount; i++) {
        rows.push({ id: `${baseId}_${i}` });
      }
      return rows;
    },
    []
  );

  /**
   * Handle row calculation when cell changes
   * For development mode, we just log the calculation (no actual execution)
   */
  const handleCalculateRow = useCallback(
    async (rowId: string, colId: string) => {
      console.log(`[Dev Mode] Cell changed: row=${rowId}, col=${colId}`);

      // In development mode, we don't execute formulas automatically
      // Users can manually test formulas using the execute button
      // This callback is still needed for GridStore compatibility
    },
    []
  );

  /**
   * Initialize GridStore and columns when formula changes
   */
  useEffect(() => {
    if (!formula) {
      // Clear state if no formula
      gridStoreRef.current = null;
      setGridStore(null);
      setColumns([]);
      setRows([]);
      setColumnsReady(false);
      lastFormulaIdRef.current = undefined;
      return;
    }

    const formulaId = formula.id;

    // Check if this is a new formula
    if (lastFormulaIdRef.current === formulaId) {
      return; // Already initialized for this formula
    }

    console.log(
      `[Dev Mode] Initializing spreadsheet for formula: ${formulaId}`
    );

    // Generate columns from formula structure
    const initialColumns =
      flattenedPaths.length > 0
        ? generateColumnsFromFormula(flattenedPaths)
        : [];

    // Generate initial rows
    const initialRows = generateRows(0, formulaId);

    // Create new GridStore instance for this development session
    const gridStore = new GridStore(
      initialRows,
      initialColumns,
      handleCalculateRow
    );

    // Update refs and state
    gridStoreRef.current = gridStore;
    setGridStore(gridStore);
    setColumns(initialColumns);
    setRows(initialRows);
    setColumnsReady(flattenedPaths.length > 0);
    lastFormulaIdRef.current = formulaId;

    // Set index column values
    initialRows.forEach((row, index) => {
      gridStore.setValue(row.id, "index", String(index + 1), true);
    });

    console.log(
      `[Dev Mode] ✅ Spreadsheet initialized with ${initialColumns.length} columns and ${initialRows.length} rows`
    );
  }, [
    formula,
    flattenedPaths,
    generateRows,
    handleCalculateRow,
    setColumns,
    setRows,
    setColumnsReady,
    setGridStore,
  ]);

  /**
   * Update columns when flattenedPaths changes
   */
  useEffect(() => {
    if (!formula || !gridStoreRef.current) return;

    if (flattenedPaths.length > 0) {
      const newColumns = generateColumnsFromFormula(flattenedPaths);
      setColumns(newColumns);
      setColumnsReady(true);
    }
  }, [flattenedPaths, formula, setColumns, setColumnsReady]);

  /**
   * Sync GridStore structure when columns or rows change
   */
  useEffect(() => {
    if (gridStoreRef.current) {
      // GridStore will handle structure updates internally
      console.log("[Dev Mode] Structure sync may be needed");
    }
  }, []);

  return {
    gridStore: gridStoreRef.current,
    handleCalculateRow,
  };
};
