import React from "react";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import Spreadsheet from "./Spreadsheet";
import { useSpreadsheetState } from "./hooks/useSpreadsheetState";
import { useSpreadsheetCalculation } from "./hooks/useSpreadsheetCalculation";
import { useSpreadsheetActions } from "./hooks/useSpreadsheetActions";
import { useSpreadsheetInitialization } from "./hooks/useSpreadsheetInitialization";
import { useTabPersistence } from "@/pages/datasheet/hooks/useTabPersistence";

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
      onAddRow={addRow}
      onAddColumn={addColumn}
      onClearDataSheet={handleClearDataSheet}
      flattenedPaths={flattenedPaths}
      showToolbar={showToolbar}
    />
  );
};

export default SpreadsheetContainer;
