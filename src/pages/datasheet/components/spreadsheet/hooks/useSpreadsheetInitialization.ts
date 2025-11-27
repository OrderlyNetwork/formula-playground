import { useRef, useEffect, useCallback } from "react";
import type { FormulaDefinition } from "@/types/formula";
import type { GridStore } from "@/store/spreadsheet";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import { generateColumnsFromFormula } from "../spreadsheetUtils";

/**
 * Minimum number of rows to display in spreadsheet
 */
const MIN_ROWS = 50;

interface UseSpreadsheetInitializationParams {
  currentFormula: FormulaDefinition | null;
  formulaId: string;
  flattenedPaths: FlattenedPath[] | undefined;
  columns: ColumnDef[];
  rows: RowDef[];
  handleCalculateRow: (rowId: string, colId: string) => Promise<void>;
  setTabColumns: (formulaId: string, columns: ColumnDef[]) => void;
  setTabRows: (formulaId: string, rows: RowDef[]) => void;
  setTabColumnsReady: (formulaId: string, ready: boolean) => void;
  getOrCreateTabGridStore: (
    formulaId: string,
    rows: RowDef[],
    columns: ColumnDef[],
    calculateCallback: (rowId: string, colId: string) => Promise<void>
  ) => GridStore;
}

/**
 * Hook to manage spreadsheet initialization and synchronization
 */
export const useSpreadsheetInitialization = ({
  currentFormula,
  formulaId,
  flattenedPaths,
  columns,
  rows,
  handleCalculateRow,
  setTabColumns,
  setTabRows,
  setTabColumnsReady,
  getOrCreateTabGridStore,
}: UseSpreadsheetInitializationParams) => {
  // GridStore for data calculation (per-tab instance)
  const storeRef = useRef<GridStore | null>(null);

  // Track if initial data has been loaded to GridStore
  const lastSyncedFormulaRef = useRef<string | undefined>(undefined);

  /**
   * Generate row definitions with minimum row count
   * Ensures at least MIN_ROWS rows exist for UI display
   */
  const generateRows = useCallback(
    (count: number, formulaId?: string): RowDef[] => {
      const rows: RowDef[] = [];
      const baseId = formulaId || "row";
      const targetCount = Math.max(count, MIN_ROWS);

      for (let i = 0; i < targetCount; i++) {
        rows.push({ id: `${baseId}_${i}` });
      }
      return rows;
    },
    []
  );

  // Initialize GridStore and Zustand store when formula changes
  // Each formula tab gets its own GridStore instance
  useEffect(() => {
    if (!currentFormula) return;

    const initialColumns = flattenedPaths
      ? generateColumnsFromFormula(flattenedPaths)
      : [];

    // Generate initial rows
    const initialRows = generateRows(0, formulaId);

    // Get or create GridStore for this tab (per-tab isolation)
    const gridStore = getOrCreateTabGridStore(
      formulaId,
      initialRows,
      initialColumns,
      handleCalculateRow
    );

    // Update the ref to point to the current formula's GridStore
    storeRef.current = gridStore;

    // Check if this tab's store is already initialized
    const isTabInitialized = columns.length > 0 || rows.length > 0;

    // Initialize per-tab Zustand store only if not already initialized
    if (!isTabInitialized) {
      setTabColumns(formulaId, initialColumns);
      setTabRows(formulaId, initialRows);
      setTabColumnsReady(formulaId, flattenedPaths !== undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFormula?.id, flattenedPaths]); // Re-initialize when formula changes

  // Sync columns when flattenedPaths changes (after initialization)
  // Note: Initial column setup is now handled in the main initialization useEffect above
  useEffect(() => {
    // Only update if we already have a GridStore (meaning initialization is done)
    if (!storeRef.current) return;

    if (flattenedPaths !== undefined && currentFormula) {
      const newColumns =
        flattenedPaths.length > 0
          ? generateColumnsFromFormula(flattenedPaths)
          : [];
      setTabColumns(formulaId, newColumns);
      setTabColumnsReady(formulaId, true);
    }
  }, [
    flattenedPaths,
    formulaId,
    currentFormula,
    setTabColumns,
    setTabColumnsReady,
  ]);

  // Sync GridStore when structure changes
  useEffect(() => {
    if (storeRef.current) {
      storeRef.current.syncStructure(rows, columns);
    }
  }, [rows, columns]);

  // Update GridStore's calculate callback when handleCalculateRow changes
  // This ensures the callback always uses the latest currentFormula
  useEffect(() => {
    if (storeRef.current) {
      storeRef.current.updateCalculateCallback(handleCalculateRow);
    }
  }, [handleCalculateRow]);

  // Initialize rows when formula changes
  useEffect(() => {
    if (!currentFormula) return;

    const currentFormulaId = currentFormula.id;

    // Check if this is a new formula (initial load or formula change)
    if (lastSyncedFormulaRef.current !== currentFormulaId) {
      console.log(
        "🔄 Formula changed: Generating new rows for formula:",
        currentFormulaId
      );
      lastSyncedFormulaRef.current = currentFormulaId;

      // Generate new rows for the new formula
      const newRows = generateRows(0, currentFormulaId);
      setTabRows(currentFormulaId, newRows);

      // Update GridStore with new row structure
      // Note: syncStructure will be called by the separate sync effect
      if (storeRef.current) {
        // Set index column values (silent mode)
        newRows.forEach((row, index) => {
          storeRef.current!.setValue(row.id, "index", String(index + 1), true);
        });
      }

      console.log(
        "✅ Rows initialized. GridStore is the single source of truth for input data."
      );
    }
  }, [currentFormula, generateRows, setTabRows]);

  return {
    storeRef,
    generateRows,
  };
};
