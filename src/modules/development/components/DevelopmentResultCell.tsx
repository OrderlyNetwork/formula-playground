import React, { useEffect, useState } from "react";
import type { ColumnDef, CellValue } from "@/types/spreadsheet";
import type { GridStore } from "@/store/spreadsheet";

export interface DevelopmentResultCellProps {
  rowId: string;
  column: ColumnDef;
  store: GridStore;
  onCellClick?: (rowId: string, colId: string) => void;
}

/**
 * ResultCell component for Development Mode
 * 
 * Unlike the regular ResultCell which reads from useSpreadsheetStore,
 * this component reads directly from the GridStore to support
 * the isolated development environment.
 */
const DevelopmentResultCell: React.FC<DevelopmentResultCellProps> = ({
  rowId,
  column,
  store,
  onCellClick,
}) => {
  const [displayValue, setDisplayValue] = useState<CellValue>("");
  const [executionTime, setExecutionTime] = useState<string>("");

  useEffect(() => {
    // Get initial values from GridStore
    const resultValue = store.getValue(rowId, "result");
    const timeValue = store.getValue(rowId, "executionTime");
    
    setDisplayValue(resultValue);
    setExecutionTime(String(timeValue || ""));

    // Subscribe to changes in result column
    const unsubscribeResult = store.subscribe(
      rowId,
      "result",
      (newValue: CellValue) => {
        setDisplayValue(newValue);
      }
    );

    // Subscribe to changes in executionTime column
    const unsubscribeTime = store.subscribe(
      rowId,
      "executionTime",
      (newValue: CellValue) => {
        setExecutionTime(String(newValue || ""));
      }
    );

    return () => {
      unsubscribeResult();
      unsubscribeTime();
    };
  }, [rowId, store]);

  const handleClick = () => {
    onCellClick?.(rowId, column.id);
  };

  // Determine text color based on value
  const getTextClass = () => {
    const valueStr = String(displayValue || "");
    
    // Check if it's an error message
    if (valueStr.startsWith("Error:")) {
      return "text-red-600";
    }
    
    // Check if there's a valid result
    if (displayValue && displayValue !== "") {
      return "text-green-700";
    }
    
    return "text-gray-400";
  };

  return (
    <div
      className={`w-full h-full px-2 flex items-center text-sm font-mono text-right justify-end ${getTextClass()}`}
      onClick={handleClick}
      title={executionTime ? `Execution time: ${executionTime}` : undefined}
    >
      {displayValue ?? "-"}
    </div>
  );
};

export default DevelopmentResultCell;
