import React from "react";
import type { ColumnDef } from "@/types/spreadsheet";
import type { GridStore } from "@/store/spreadsheet";
import Cell from "./Cell";
import { getStickyStyle } from "./spreadsheetUtils";

/**
 * Props for SpreadsheetRow component
 * Uses rowId string instead of full row object (calculation results are fetched via key lookup)
 */
interface SpreadsheetRowProps {
  /** Row identifier for O(1) lookup */
  rowId: string;
  rowIndex: number;
  columns: ColumnDef[];
  store: GridStore;
  isRowSelected: boolean;
  selectedColIds: Set<string>;
  onRowHeaderClick: (id: string) => void;
  onCellClick: (rowId: string, colId: string) => void;
  style?: React.CSSProperties;
}

/**
 * Single row component for spreadsheet
 * Cell container handles renderer selection based on column type
 */
const SpreadsheetRow: React.FC<SpreadsheetRowProps> = ({
  rowId,
  rowIndex,
  columns,
  store,
  isRowSelected,
  selectedColIds,
  onRowHeaderClick,
  onCellClick,
  style,
}) => {
  return (
    <div className="flex min-w-max group w-full" style={style}>
      {/* Row Number - Sticky Left */}
      <div
        onClick={() => onRowHeaderClick(rowId)}
        className={`w-10 border-r border-b border-grid-border flex items-center justify-center text-xs font-mono sticky left-0 z-30 select-none cursor-pointer transition-colors ${
          isRowSelected
            ? "bg-blue-200 text-blue-800 border-blue-300"
            : "bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
        }`}
      >
        {rowIndex + 1}
      </div>

      {/* Cells - Cell container handles renderer selection */}
      {columns.map((col) => {
        const { style: cellStyle, className } = getStickyStyle(col, false);
        // Use pre-computed Sets for O(1) lookup
        const isColSelected = selectedColIds.has(col.id);
        const isCellSelected = isRowSelected || isColSelected;

        return (
          <Cell
            key={`${rowId}-${col.id}`}
            rowId={rowId}
            column={col}
            store={store}
            style={cellStyle}
            className={className}
            isSelected={isCellSelected}
            onCellClick={onCellClick}
          />
        );
      })}
    </div>
  );
};

export default SpreadsheetRow;
