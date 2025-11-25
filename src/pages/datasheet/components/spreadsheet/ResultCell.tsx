import React from "react";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { ColumnDef } from "@/types/spreadsheet";

export interface ResultCellProps {
  rowId: string;
  column: ColumnDef;
  onCellClick?: (rowId: string, colId: string) => void;
}

/**
 * ResultCell Component
 *
 * Specialized cell renderer for displaying calculation results.
 * Gets value from SpreadsheetStore.calculationResults by rowId (O(1) lookup).
 * This is a read-only cell that displays formula execution results.
 *
 * Note: Cell container handles styling/positioning, this only renders content.
 */
const ResultCell: React.FC<ResultCellProps> = ({
  rowId,
  column,
  // isSelected is passed but not used - background handled by Cell container
  onCellClick,
}) => {
  // Subscribe to calculation result by rowId (O(1) lookup from map)
  const calculationResult = useSpreadsheetStore(
    (state) => state.calculationResults[rowId]
  );

  // Derive display value from calculation result
  const displayValue = (() => {
    if (!calculationResult) return "";
    if (calculationResult.error) return `Error: ${calculationResult.error}`;
    if (calculationResult.result !== undefined) {
      return String(calculationResult.result);
    }
    return "";
  })();

  // Handle click to update selection
  const handleClick = () => {
    onCellClick?.(rowId, column.id);
  };

  // Get text color based on result status
  const getTextClass = () => {
    if (calculationResult?.error) return "text-red-600";
    if (calculationResult?.result !== undefined) return "text-green-700";
    return "text-gray-400";
  };

  return (
    <div
      className={`w-full h-full px-2 flex items-center text-sm font-mono text-right justify-end ${getTextClass()}`}
      onClick={handleClick}
      title={
        calculationResult?.executionTime
          ? `Execution time: ${calculationResult.executionTime}ms`
          : undefined
      }
    >
      {displayValue || "-"}
    </div>
  );
};

export default ResultCell;
