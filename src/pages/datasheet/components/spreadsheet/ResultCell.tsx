import React, { useMemo, useState } from "react";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { ColumnDef } from "@/types/spreadsheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
 * When there's an error, clicking on the cell shows detailed error information.
 *
 * Note: Cell container handles styling/positioning, this only renders content.
 */
const ResultCell: React.FC<ResultCellProps> = ({
  rowId,
  column,
  onCellClick,
}) => {
  // State for controlling error details popover
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Subscribe to calculation result by rowId (O(1) lookup from map)
  const calculationResult = useSpreadsheetStore(
    (state) => state.calculationResults[rowId]
  );

  // Derive display value from calculation result
  const displayValue = useMemo(() => {
    if (typeof calculationResult === "undefined") return "";
    if (
      typeof calculationResult.result === "string" ||
      typeof calculationResult.result === "number" ||
      typeof calculationResult.result === "boolean"
    ) {
      return calculationResult.result;
    }
    return JSON.stringify(calculationResult.result);
  }, [calculationResult]);

  // Handle click to update selection
  const handleClick = () => {
    onCellClick?.(rowId, column.id);
  };

  // Handle error click to show details
  const handleErrorClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the regular cell click
    setShowErrorDetails(true);
  };

  // Get text color based on result status
  const getTextClass = () => {
    if (calculationResult?.error)
      return "text-red-600 cursor-pointer hover:text-red-700";
    if (calculationResult?.result !== undefined) return "text-green-700";
    return "text-gray-400";
  };

  // Generate error details content
  const getErrorDetails = () => {
    if (!calculationResult?.error) return null;

    return (
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-sm text-red-600">Error Details</h4>
        </div>

        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-gray-500">
              Error Message:
            </span>
            <p className="text-sm text-red-700 mt-1 p-2 bg-red-50 rounded border border-red-200">
              {calculationResult.error}
            </p>
          </div>

          <div>
            <span className="text-xs font-medium text-gray-500">Row ID:</span>
            <p className="text-sm font-mono text-gray-700 mt-1">{rowId}</p>
          </div>

          <div>
            <span className="text-xs font-medium text-gray-500">Column:</span>
            <p className="text-sm text-gray-700 mt-1">
              {column.title || column.id}
            </p>
          </div>

          {calculationResult.executionTime && (
            <div>
              <span className="text-xs font-medium text-gray-500">
                Execution Time:
              </span>
              <p className="text-sm text-gray-700 mt-1">
                {calculationResult.executionTime}ms
              </p>
            </div>
          )}

          {calculationResult.isValid !== undefined && (
            <div>
              <span className="text-xs font-medium text-gray-500">
                Validation Status:
              </span>
              <p className="text-sm mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    calculationResult.isValid
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {calculationResult.isValid ? "Valid" : "Invalid"}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 pt-2 border-t">
          Click anywhere to close
        </div>
      </div>
    );
  };

  return (
    <Popover open={showErrorDetails} onOpenChange={setShowErrorDetails}>
      <PopoverTrigger asChild>
        <div
          className={`w-full h-full px-2 flex items-center text-sm font-mono text-right justify-end ${getTextClass()}`}
          onClick={calculationResult?.error ? handleErrorClick : handleClick}
          title={
            calculationResult?.error
              ? "Click to see error details"
              : calculationResult?.executionTime
              ? `Execution time: ${calculationResult.executionTime}ms`
              : undefined
          }
        >
          {displayValue || "-"}
        </div>
      </PopoverTrigger>

      {calculationResult?.error && (
        <PopoverContent className="w-80" align="start" side="bottom">
          {getErrorDetails()}
        </PopoverContent>
      )}
    </Popover>
  );
};

export default ResultCell;
