import React from "react";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";
import type { GridStore } from "@/store/spreadsheet";
import Cell from "./Cell";
import { getStickyStyle } from "./spreadsheetUtils";

/**
 * Props for SpreadsheetRow component
 */
interface SpreadsheetRowProps {
  row: RowDef;
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
 */
const SpreadsheetRow: React.FC<SpreadsheetRowProps> = ({
  row,
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
    <div
      className="flex min-w-max group absolute top-0 left-0 w-full"
      style={style}
    >
      {/* Row Number - Sticky Left */}
      <div
        onClick={() => onRowHeaderClick(row.id)}
        className={`w-10 border-r border-b border-grid-border flex items-center justify-center text-xs font-mono sticky left-0 z-30 select-none cursor-pointer transition-colors ${
          isRowSelected
            ? "bg-blue-200 text-blue-800 border-blue-300"
            : "bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
        }`}
      >
        {rowIndex + 1}
      </div>

      {/* Cells */}
      {columns.map((col) => {
        const { style: cellStyle, className } = getStickyStyle(col, false);
        // Use pre-computed Sets for O(1) lookup
        const isColSelected = selectedColIds.has(col.id);
        const isCellSelected = isRowSelected || isColSelected;

        return (
          <Cell
            key={`${row.id}-${col.id}`}
            rowId={row.id}
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

