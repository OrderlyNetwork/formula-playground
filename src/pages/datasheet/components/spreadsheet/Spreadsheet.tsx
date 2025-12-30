import React from "react";
import type { GridStore } from "@/store/spreadsheet";
import type { ColumnDef } from "@/types/spreadsheet";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import SpreadsheetToolbar from "./SpreadsheetToolbar";
import SpreadsheetHeader from "./SpreadsheetHeader";
import SpreadsheetRow from "./SpreadsheetRow";

/**
 * Selection type for rows and columns
 */
type Selection = { type: "row" | "column"; id: string } | null;

/**
 * Props interface for stateless Spreadsheet component
 * All data and callbacks are passed from parent
 */
export interface SpreadsheetProps {
  /** Column definitions */
  columns: ColumnDef[];
  /** Row IDs for rendering */
  rowIds: string[];
  /** GridStore instance containing cell data */
  gridStore: GridStore | null;
  /** Current selection state (row or column) */
  selection: Selection;
  /** Set of selected row IDs for O(1) lookup */
  selectedRowIds: Set<string>;
  /** Set of selected column IDs for O(1) lookup */
  selectedColIds: Set<string>;
  /** Callback when row header is clicked */
  onRowHeaderClick: (rowId: string) => void;
  /** Callback when column header is clicked */
  onColHeaderClick: (colId: string) => void;
  /** Callback when cell is clicked */
  onCellClick: (rowId: string, colId: string) => void;
  /** Callback when column is deleted */
  onDeleteColumn: (colId: string) => void;
  /** Callback when column is resized */
  onColumnResize: (colId: string, width: number) => void;
  /** Callback when add row button is clicked */
  onAddRow: () => void;
  /** Callback when add column button is clicked */
  onAddColumn: () => void;
  /** Callback when clear datasheet button is clicked */
  onClearDataSheet: () => void;
  /** Optional flattened paths for toolbar display */
  flattenedPaths?: FlattenedPath[];
  /** Whether to show toolbar */
  showToolbar?: boolean;
}

/**
 * Stateless Spreadsheet Component
 *
 * This is a pure presentation component that receives all data and callbacks via props.
 * It has no direct dependency on global state stores, making it reusable across different modes:
 * - Datasheet mode: Use SpreadsheetContainer wrapper
 * - Playground mode: Pass custom props
 * - Development mode: Pass custom props
 *
 * @param props - All data and callbacks needed for rendering
 */
const Spreadsheet: React.FC<SpreadsheetProps> = ({
  columns,
  rowIds,
  gridStore,
  selection,
  selectedRowIds,
  selectedColIds,
  onRowHeaderClick,
  onColHeaderClick,
  onCellClick,
  onDeleteColumn,
  onColumnResize,
  onAddRow,
  onAddColumn,
  onClearDataSheet,
  flattenedPaths,
  showToolbar = true,
}) => {
  return (
    <div className="flex flex-col h-full shadow-sm overflow-hidden">
      {/* Toolbar */}
      {showToolbar && (
        <SpreadsheetToolbar
          selection={selection}
          flattenedPaths={flattenedPaths}
          onAddRow={onAddRow}
          onAddColumn={onAddColumn}
          onClearDataSheet={onClearDataSheet}
        />
      )}

      {/* Grid Container */}
      <div className="flex-1 overflow-auto relative scrollbar-thin">
        {/* Header Row - Sticky */}
        <SpreadsheetHeader
          columns={columns}
          selectedColIds={selectedColIds}
          onColHeaderClick={onColHeaderClick}
          onDeleteColumn={onDeleteColumn}
          onColumnResize={onColumnResize}
        />

        {/* Data Rows */}
        <div>
          {rowIds.map((rowId, index) => {
            const isRowSelected = selectedRowIds.has(rowId);

            return (
              <SpreadsheetRow
                key={rowId}
                rowId={rowId}
                rowIndex={index}
                columns={columns}
                store={gridStore!}
                isRowSelected={isRowSelected}
                selectedColIds={selectedColIds}
                onRowHeaderClick={onRowHeaderClick}
                onCellClick={onCellClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Spreadsheet;
