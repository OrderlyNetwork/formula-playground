import React, { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import Spreadsheet from "./Spreadsheet";
import { useSpreadsheetState } from "./hooks/useSpreadsheetState";
import { useSpreadsheetCalculation } from "./hooks/useSpreadsheetCalculation";
import { useSpreadsheetActions } from "./hooks/useSpreadsheetActions";
import { useSpreadsheetInitialization } from "./hooks/useSpreadsheetInitialization";
import { useTabPersistence } from "@/pages/datasheet/hooks/useTabPersistence";
import {
  dataFlowManager,
  type DataRestoredInfo,
} from "@/modules/formula-datasheet/services/DataFlowManager";

/**
 * Props interface for SpreadsheetContainer component
 */
interface SpreadsheetContainerProps {
  flattenedPaths?: FlattenedPath[];
  showToolbar?: boolean;
}

/**
 * SpreadsheetContainer - Container component for Datasheet mode
 *
 * This container handles all state management, data fetching, and business logic
 * specific to the datasheet mode. It connects to the global spreadsheet store
 * and passes all necessary data and callbacks to the stateless Spreadsheet component.
 *
 * Usage:
 * - In datasheet mode: Use this container component
 * - In playground/development modes: Use Spreadsheet component directly with custom props
 *
 * @param props - Configuration props for datasheet mode
 */
const SpreadsheetContainer: React.FC<SpreadsheetContainerProps> = ({
  flattenedPaths,
  showToolbar = true,
}) => {
  // Get current formula first (needed for per-tab state)
  const currentFormula = useSpreadsheetStore((state) => state.currentFormula);

  // Get clear results action from store
  const clearTabResults = useSpreadsheetStore((state) => state.clearTabResults);

  // Use custom hooks for state management
  const {
    formulaId,
    columns,
    rows,
    rowIds,
    selection,
    selectedRowIds,
    selectedColIds,
    setTabColumns,
    setTabRows,
    setTabColumnsReady,
    getOrCreateTabGridStore,
    addColumnAction,
    deleteColumnAction,
    updateColumnAction,
    toggleRowSelection,
    toggleColumnSelection,
    updateSelectionOnCellClick,
  } = useSpreadsheetState(currentFormula || null);

  // Use calculation hook
  const { handleCalculateRow } = useSpreadsheetCalculation(
    currentFormula || null,
    formulaId
  );

  // Use initialization hook
  const { storeRef } = useSpreadsheetInitialization({
    currentFormula: currentFormula || null,
    formulaId,
    flattenedPaths,
    columns,
    rows,
    handleCalculateRow,
    setTabColumns,
    setTabRows,
    setTabColumnsReady,
    getOrCreateTabGridStore,
  });

  // Enable tab persistence (auto-save/restore)
  useTabPersistence(currentFormula?.id, storeRef.current);

  // Track if we've already calculated for this formula to avoid duplicate calculations
  const hasCalculatedRef = useRef<string | null>(null);

  /**
   * Listen for data restored events and auto-calculate all rows with data
   * This handles the case when data is loaded from URL or IndexedDB
   */
  useEffect(() => {
    /**
     * Handle data restored event - trigger calculation for all restored rows
     * @param info - Information about the restored data
     */
    const handleDataRestored = async (info: DataRestoredInfo) => {
      // Only process if this is for the current formula
      if (info.formulaId !== formulaId) return;

      // Skip if we've already calculated for this formula (avoid duplicate calculations)
      if (hasCalculatedRef.current === formulaId) {
        console.log(`⏭️ Skipping auto-calculation for ${formulaId} - already calculated`);
        return;
      }

      // Mark as calculated for this formula
      hasCalculatedRef.current = formulaId;

      console.log(
        `🔄 Auto-calculating ${info.rowIds.length} rows from ${info.source} for formula ${info.formulaId}`
      );

      // Calculate each row sequentially
      let successCount = 0;
      let errorCount = 0;

      for (const rowId of info.rowIds) {
        try {
          await handleCalculateRow(rowId, "auto-restore");
          successCount++;
        } catch (error) {
          console.error(`Error auto-calculating row ${rowId}:`, error);
          errorCount++;
        }
      }

      // Log result (no toast to avoid UI noise on page load)
      if (errorCount === 0) {
        console.log(`✅ Auto-calculated ${successCount} row(s) successfully`);
      } else {
        console.warn(
          `⚠️ Auto-calculated ${successCount} row(s), ${errorCount} failed`
        );
      }
    };

    // Register the handler
    dataFlowManager.registerDataRestoredHandler(handleDataRestored);

    // Cleanup on unmount or when dependencies change
    return () => {
      dataFlowManager.unregisterDataRestoredHandler();
    };
  }, [formulaId, handleCalculateRow]);

  // Reset the calculation flag when formula changes
  useEffect(() => {
    if (currentFormula?.id !== hasCalculatedRef.current) {
      hasCalculatedRef.current = null;
    }
  }, [currentFormula?.id]);

  // Use actions hook
  const {
    addRow,
    addColumn,
    handleRowHeaderClick,
    handleColHeaderClick,
    handleCellClick,
  } = useSpreadsheetActions(
    formulaId,
    selection,
    columns,
    storeRef.current,
    toggleRowSelection,
    toggleColumnSelection,
    updateSelectionOnCellClick,
    addColumnAction
  );

  /**
   * Clear all data in the current spreadsheet
   * Clears both cell input data and calculation results
   */
  const handleClearDataSheet = () => {
    // Clear all cell data in GridStore
    if (storeRef.current) {
      storeRef.current.clearAllData();
    }

    // Clear all calculation results for this tab
    clearTabResults(formulaId);
  };

  /**
   * Handle column deletion
   * @param colId - Column ID to delete
   */
  const handleDeleteColumn = (colId: string) => {
    deleteColumnAction(formulaId, colId);
  };

  /**
   * Handle column resize
   * @param colId - Column ID to resize
   * @param width - New width
   */
  const handleColumnResize = (colId: string, width: number) => {
    updateColumnAction(formulaId, colId, { width });
  };

  /**
   * Handle manual calculation trigger
   * - If a row is selected, only calculate that row
   * - If no row is selected, calculate all rows with data
   */
  const handleManualCalculate = useCallback(async () => {
    if (!storeRef.current || !currentFormula) {
      toast.error("No formula or data available");
      return;
    }

    const gridStore = storeRef.current;
    let targetRowIds: string[] = [];

    // Check if a row is selected
    if (selection?.type === "row") {
      // Only calculate the selected row
      targetRowIds = [selection.id];
    } else {
      // Calculate all rows with data
      const allData = gridStore.getAllData();
      targetRowIds = Object.keys(allData);
    }

    if (targetRowIds.length === 0) {
      toast.info("No rows with data to calculate");
      return;
    }

    // Calculate each row sequentially to avoid overloading
    let successCount = 0;
    let errorCount = 0;

    for (const rowId of targetRowIds) {
      try {
        await handleCalculateRow(rowId, "manual");
        successCount++;
      } catch (error) {
        console.error(`Error calculating row ${rowId}:`, error);
        errorCount++;
      }
    }

    // Show result toast
    if (errorCount === 0) {
      toast.success(`Calculated ${successCount} row(s)`);
    } else {
      toast.warning(`Calculated ${successCount} row(s), ${errorCount} failed`);
    }
  }, [storeRef, currentFormula, selection, handleCalculateRow]);

  // Render the stateless Spreadsheet component with all necessary props
  return (
    <Spreadsheet
      columns={columns}
      rowIds={rowIds}
      gridStore={storeRef.current}
      selection={selection}
      selectedRowIds={selectedRowIds}
      selectedColIds={selectedColIds}
      onRowHeaderClick={handleRowHeaderClick}
      onColHeaderClick={handleColHeaderClick}
      onCellClick={handleCellClick}
      onDeleteColumn={handleDeleteColumn}
      onColumnResize={handleColumnResize}
      onAddRow={addRow}
      onAddColumn={addColumn}
      onClearDataSheet={handleClearDataSheet}
      onManualCalculate={handleManualCalculate}
      flattenedPaths={flattenedPaths}
      showToolbar={showToolbar}
    />
  );
};

export default SpreadsheetContainer;
