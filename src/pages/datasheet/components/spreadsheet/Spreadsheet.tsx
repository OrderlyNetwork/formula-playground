import React from "react";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import SpreadsheetToolbar from "./SpreadsheetToolbar";
import SpreadsheetHeader from "./SpreadsheetHeader";
import SpreadsheetRow from "./SpreadsheetRow";
import { useSpreadsheetState } from "./hooks/useSpreadsheetState";
import { useSpreadsheetCalculation } from "./hooks/useSpreadsheetCalculation";
import { useSpreadsheetActions } from "./hooks/useSpreadsheetActions";
import { useSpreadsheetInitialization } from "./hooks/useSpreadsheetInitialization";
import { useSpreadsheetVirtualization } from "./hooks/useSpreadsheetVirtualization";

/**
 * Props interface for Spreadsheet component
 */
interface SpreadsheetProps {
  flattenedPaths?: FlattenedPath[];
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ flattenedPaths }) => {
  // Get current formula first (needed for per-tab state)
  const currentFormula = useSpreadsheetStore((state) => state.currentFormula);

  // Use custom hooks for state management
  const {
    formulaId,
    columns,
    rows,
    rowIds,
    isColumnsReady,
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

  // Use virtualization hook
  const { parentRef, rowVirtualizer } = useSpreadsheetVirtualization(rowIds);

  // Show loading state until columns are determined
  if (!isColumnsReady) {
    return (
      <div className="flex flex-col h-full bg-white shadow-sm overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-500">Loading spreadsheet...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <SpreadsheetToolbar
        selection={selection}
        flattenedPaths={flattenedPaths}
        onAddRow={addRow}
        onAddColumn={addColumn}
      />

      {/* Grid Container with Virtual Scrolling */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto relative scrollbar-thin"
      >
        <div
          className="inline-block min-w-full"
          style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
        >
          {/* Header Row - Sticky */}
          <SpreadsheetHeader
            columns={columns}
            selectedColIds={selectedColIds}
            onColHeaderClick={handleColHeaderClick}
            onDeleteColumn={deleteColumnAction}
          />

          {/* Virtualized Data Rows */}
          <div
            style={{
              position: "relative",
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowId = rowIds[virtualRow.index];
              const isRowSelected = selectedRowIds.has(rowId);

              return (
                <SpreadsheetRow
                  key={rowId}
                  rowId={rowId}
                  rowIndex={virtualRow.index}
                  columns={columns}
                  store={storeRef.current!}
                  isRowSelected={isRowSelected}
                  selectedColIds={selectedColIds}
                  onRowHeaderClick={handleRowHeaderClick}
                  onCellClick={handleCellClick}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spreadsheet;
