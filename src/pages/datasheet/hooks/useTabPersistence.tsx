import { useEffect, useCallback, useRef } from "react";
import { useFormulaTabStore } from "@/store/formulaTabStore";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { tabPersistenceService } from "@/services/TabPersistenceService";
import type { GridStore } from "@/store/spreadsheet";
import ResultCell from "@/pages/datasheet/components/spreadsheet/ResultCell";
import type { ColumnDef } from "@/types/spreadsheet";

/**
 * Hook to integrate tab persistence with spreadsheet
 * Handles automatic saving and loading of tab state
 */

/**
 * Restore render functions for columns that need them
 * This re-attaches JSX render functions that were removed for IndexedDB storage
 */
const restoreColumnRenderFunctions = (columns: ColumnDef[]): ColumnDef[] => {
  return columns.map(column => {
    const restoredColumn = { ...column };

    // Re-attach ResultCell render function for result columns
    if (column.type === "result" || column.id === "result") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      restoredColumn.render = (rowId: string, column: ColumnDef, _gridStore: GridStore) => {
        return <ResultCell rowId={rowId} column={column} />;
      };
    }

    return restoredColumn;
  });
};
export function useTabPersistence(
  formulaId: string | undefined,
  gridStore: GridStore | null
) {
  const activeTabId = useFormulaTabStore((state) => state.activeTabId);
  const setTabLoading = useFormulaTabStore((state) => state.setTabLoading);
  const setTabDirty = useFormulaTabStore((state) => state.setTabDirty);
  const getActiveTab = useFormulaTabStore((state) => state.getActiveTab);

  // Get per-tab state using getters
  const getTabRows = useSpreadsheetStore((state) => state.getTabRows);
  const getTabColumns = useSpreadsheetStore((state) => state.getTabColumns);
  const getTabCalculationResults = useSpreadsheetStore(
    (state) => state.getTabCalculationResults
  );
  const setTabRows = useSpreadsheetStore((state) => state.setTabRows);
  const setTabColumns = useSpreadsheetStore((state) => state.setTabColumns);
  const setTabCalculationResults = useSpreadsheetStore(
    (state) => state.setTabCalculationResults
  );

  // Also update global state for backward compatibility
  const setRows = useSpreadsheetStore((state) => state.setRows);
  const setColumns = useSpreadsheetStore((state) => state.setColumns);
  const setCalculationResults = useSpreadsheetStore(
    (state) => state.setCalculationResults
  );

  const lastSavedStateRef = useRef<string>("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Save current tab state
   */
  const saveTabState = useCallback(async () => {
    if (!formulaId || !gridStore) return;

    const activeTab = getActiveTab();
    if (!activeTab || activeTab.id !== formulaId) return;

    // Get current tab state
    const rows = getTabRows(formulaId);
    const columns = getTabColumns(formulaId);
    const calculationResults = getTabCalculationResults(formulaId);

    try {
      await tabPersistenceService.saveTabState(
        formulaId,
        gridStore,
        rows,
        columns,
        calculationResults,
        activeTab.label,
        activeTab.type
      );

      // Also save to per-tab store (already there, but ensure consistency)
      setTabRows(formulaId, rows);
      setTabColumns(formulaId, columns);
      setTabCalculationResults(formulaId, calculationResults);

      // Update last saved state
      const currentState = JSON.stringify({
        rows,
        columns,
        calculationResults,
      });
      lastSavedStateRef.current = currentState;

      // Clear dirty flag after successful save
      setTabDirty(formulaId, false);

      console.log(`Tab state saved: ${formulaId}`);
    } catch (error) {
      console.error(`Failed to save tab state: ${formulaId}`, error);
    }
  }, [
    formulaId,
    gridStore,
    getActiveTab,
    getTabRows,
    getTabColumns,
    getTabCalculationResults,
    setTabRows,
    setTabColumns,
    setTabCalculationResults,
    setTabDirty,
  ]);

  /**
   * Load tab state when tab becomes active
   */
  const loadTabState = useCallback(
    async (targetFormulaId: string) => {
      setTabLoading(targetFormulaId, true);

      try {
        const state = await tabPersistenceService.restoreTabState(
          targetFormulaId
        );

        if (state) {
          // Restore render functions before setting columns
          const restoredColumns = restoreColumnRenderFunctions(state.columns);

          // Restore to per-tab store
          setTabRows(targetFormulaId, state.rows);
          setTabColumns(targetFormulaId, restoredColumns);
          setTabCalculationResults(targetFormulaId, state.calculationResults);

          // Also update global state for backward compatibility
          setRows(state.rows);
          setColumns(restoredColumns);
          setCalculationResults(state.calculationResults);

          // Sync GridStore if available
          if (gridStore) {
            // Restore cell data to GridStore
            state.cellData.forEach((value, key) => {
              const [rowId, colId] = key.split(":");
              gridStore.setValue(rowId, colId, value, true); // silent mode
            });
          }

          // Update last saved state
          const currentState = JSON.stringify({
            rows: state.rows,
            columns: state.columns,
            calculationResults: state.calculationResults,
          });
          lastSavedStateRef.current = currentState;

          console.log(`Tab state loaded: ${targetFormulaId}`);
        } else {
          console.warn(
            `No saved state found for tab: ${targetFormulaId}, using empty state`
          );
        }
      } catch (error) {
        console.error(`Failed to load tab state: ${targetFormulaId}`, error);
      } finally {
        setTabLoading(targetFormulaId, false);
      }
    },
    [
      gridStore,
      setTabRows,
      setTabColumns,
      setTabCalculationResults,
      setRows,
      setColumns,
      setCalculationResults,
      setTabLoading,
    ]
  );

  /**
   * Track changes and mark tab as dirty
   */
  useEffect(() => {
    if (!formulaId) return;

    // Get current tab state
    const rows = getTabRows(formulaId);
    const columns = getTabColumns(formulaId);
    const calculationResults = getTabCalculationResults(formulaId);

    const currentState = JSON.stringify({ rows, columns, calculationResults });

    // Check if state has changed
    if (
      lastSavedStateRef.current &&
      currentState !== lastSavedStateRef.current
    ) {
      setTabDirty(formulaId, true);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule auto-save
      saveTimeoutRef.current = setTimeout(() => {
        saveTabState();
      }, 500); // 500ms debounce
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    formulaId,
    getTabRows,
    getTabColumns,
    getTabCalculationResults,
    saveTabState,
    setTabDirty,
  ]);

  /**
   * Load state when active tab changes
   */
  useEffect(() => {
    if (activeTabId && activeTabId !== formulaId) {
      // Tab switched, save current state first
      if (formulaId) {
        saveTabState();
      }
    }

    if (activeTabId && activeTabId === formulaId) {
      // This tab became active, load its state
      loadTabState(activeTabId);
    }
  }, [activeTabId, formulaId, saveTabState, loadTabState]);

  /**
   * Save on unmount
   */
  useEffect(() => {
    return () => {
      if (formulaId && gridStore) {
        // Force save on unmount
        saveTabState();
      }
    };
  }, [formulaId, gridStore, saveTabState]);

  return {
    saveTabState,
    loadTabState,
  };
}
