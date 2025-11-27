import { useEffect, useCallback, useRef } from "react";
import { useFormulaTabStore } from "@/store/formulaTabStore";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { tabPersistenceService } from "@/services/TabPersistenceService";
import type { GridStore } from "@/store/spreadsheet";

/**
 * Hook to integrate tab persistence with spreadsheet
 * Handles automatic saving and loading of tab state
 */
export function useTabPersistence(
  formulaId: string | undefined,
  gridStore: GridStore | null
) {
  const activeTabId = useFormulaTabStore((state) => state.activeTabId);
  const setTabLoading = useFormulaTabStore((state) => state.setTabLoading);
  const setTabDirty = useFormulaTabStore((state) => state.setTabDirty);
  const getActiveTab = useFormulaTabStore((state) => state.getActiveTab);

  const rows = useSpreadsheetStore((state) => state.rows);
  const calculationResults = useSpreadsheetStore(
    (state) => state.calculationResults
  );
  const setRows = useSpreadsheetStore((state) => state.setRows);
  const setCalculationResults = useSpreadsheetStore(
    (state) => state.setCalculationResults
  );
  const setTabRows = useSpreadsheetStore((state) => state.setTabRows);
  const setTabCalculationResults = useSpreadsheetStore(
    (state) => state.setTabCalculationResults
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

    try {
      await tabPersistenceService.saveTabState(
        formulaId,
        gridStore,
        rows,
        calculationResults,
        activeTab.label,
        activeTab.type
      );

      // Also save to per-tab store
      setTabRows(formulaId, rows);
      setTabCalculationResults(formulaId, calculationResults);

      // Update last saved state
      const currentState = JSON.stringify({ rows, calculationResults });
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
    rows,
    calculationResults,
    getActiveTab,
    setTabRows,
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
          // Restore rows and calculation results
          setRows(state.rows);
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
    [gridStore, setRows, setCalculationResults, setTabLoading]
  );

  /**
   * Track changes and mark tab as dirty
   */
  useEffect(() => {
    if (!formulaId) return;

    const currentState = JSON.stringify({ rows, calculationResults });

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
  }, [formulaId, rows, calculationResults, saveTabState, setTabDirty]);

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
