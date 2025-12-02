import { useMemo, useCallback } from "react";
import Spreadsheet from "@/pages/datasheet/components/spreadsheet/Spreadsheet";
import { useDeveloperStore } from "@/store/developerStore";
import { flattenFormulaInputs } from "@/utils/formulaTableUtils";
import { useDevelopmentSpreadsheetState } from "./hooks/useDevelopmentSpreadsheetState";
import { useDevelopmentSpreadsheetLogic } from "./hooks/useDevelopmentSpreadsheetLogic";

/**
 * FormulaDataSheet component for development mode
 *
 * This component provides an isolated spreadsheet for formula testing in development mode.
 * Unlike SpreadsheetContainer, it uses independent state management that doesn't interfere
 * with playground/datasheet modes.
 *
 * Architecture:
 * - Uses custom hooks for isolated state management
 * - Connects to developer store only for formula definitions
 * - Maintains its own GridStore instance for data
 * - Does not execute formulas automatically (manual testing only)
 */
export const FormulaDataSheet = () => {
  // Get formula from developer store (set by parent components)
  const parsedFormulas = useDeveloperStore((state) => state.parsedFormulas);
  const selectedFormulaId = useDeveloperStore(
    (state) => state.selectedFormulaId
  );

  // Select current formula
  const formula = useMemo(() => {
    if (!Array.isArray(parsedFormulas) || parsedFormulas.length === 0)
      return null;
    return parsedFormulas[0];
    // if(!selectedFormulaId) return null;
    // return parsedFormulas.find((formula) => formula.id === selectedFormulaId);
  }, [parsedFormulas, selectedFormulaId]);

  // Flatten formula inputs for column generation
  const flattenedPaths = useMemo(() => {
    if (!formula) return [];
    return flattenFormulaInputs(formula.inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula?.id]);

  // Use independent state management (not connected to playground/datasheet stores)
  const {
    columns,
    rows,
    rowIds,
    selection,
    selectedRowIds,
    selectedColIds,
    gridStore,
    setColumns,
    setRows,
    setColumnsReady,
    setGridStore,
    toggleRowSelection,
    toggleColumnSelection,
    updateSelectionOnCellClick,
    // addColumn: addColumnAction,
    deleteColumn: deleteColumnAction,
    // addRow: addRowAction,
    setActiveCell,
  } = useDevelopmentSpreadsheetState();

  // Use initialization and calculation logic
  const { handleCalculateRow } = useDevelopmentSpreadsheetLogic({
    formula,
    flattenedPaths,
    setColumns,
    setRows,
    setColumnsReady,
    setGridStore,
  });

  /**
   * Add a new row to the spreadsheet
   */
  const addRow = useCallback(() => {}, []);

  /**
   * Add a new column to the spreadsheet
   */
  const addColumn = useCallback(() => {}, []);

  /**
   * Handle row header click
   */
  const handleRowHeaderClick = useCallback(
    (id: string) => {
      toggleRowSelection(id);
    },
    [toggleRowSelection]
  );

  /**
   * Handle column header click
   */
  const handleColHeaderClick = useCallback(
    (id: string) => {
      toggleColumnSelection(id);
    },
    [toggleColumnSelection]
  );

  /**
   * Handle cell click
   */
  const handleCellClick = useCallback(
    (rowId: string, colId: string) => {
      // Update active cell
      setActiveCell({ rowId, colId });

      // Update selection state (clears if clicked outside current selection)
      updateSelectionOnCellClick(rowId, colId);
    },
    [setActiveCell, updateSelectionOnCellClick]
  );

  /**
   * Clear all data in the current spreadsheet
   */
  const handleClearDataSheet = useCallback(() => {
    if (gridStore) {
      gridStore.clearAllData();
    }
  }, [gridStore]);

  /**
   * Handle column deletion
   */
  const handleDeleteColumn = useCallback(
    (colId: string) => {
      deleteColumnAction(colId);
    },
    [deleteColumnAction]
  );

  // Show placeholder if no formula is available
  if (!formula) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        No formula available for testing, Please parse the formula first
      </div>
    );
  }

  // Render the stateless Spreadsheet component with all necessary props
  return (
    <Spreadsheet
      columns={columns}
      rowIds={rowIds}
      gridStore={gridStore}
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
      showToolbar={false}
    />
  );
};
