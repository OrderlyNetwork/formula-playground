import React, { useEffect, useRef, useState } from "react";
import { GridStore } from "@/store/spreadsheet";
import type { ColumnDef, CellValue } from "@/types/spreadsheet";
import { cn } from "@/lib/utils";

export interface ArrayGroupCellProps {
  rowId: string;
  column: ColumnDef;
  store: GridStore;
  style?: React.CSSProperties;
  className?: string;
  isSelected?: boolean;
  onCellClick?: (rowId: string, colId: string) => void;
}

/**
 * ArrayGroupCell Component - Renders array data as an editable nested table
 *
 * DESIGN:
 * 1. Subscribes to GridStore for the array data
 * 2. Parses array value (expects JSON array)
 * 3. Renders nested table with columns for each object property
 * 4. Supports editing individual array items
 */
export const ArrayGroupCell: React.FC<ArrayGroupCellProps> = ({
  rowId,
  column,
  store,
  style,
  className,
  isSelected,
  onCellClick,
}) => {
  const [arrayData, setArrayData] = useState<unknown[]>([]);
  const [subColumns, setSubColumns] = useState<string[]>([]);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  console.log("subColumns", column);

  useEffect(() => {
    // Get initial value from store
    const initialVal = store.getValue(rowId, column.id);
    parseAndSetArrayData(initialVal);

    // Subscribe to changes
    const unsubscribe = store.subscribe(
      rowId,
      column.id,
      (newValue: CellValue) => {
        parseAndSetArrayData(newValue);
      }
    );

    return () => unsubscribe();
  }, [rowId, column.id, store]);

  const parseAndSetArrayData = (value: CellValue) => {
    try {
      if (!value || value === "") {
        setArrayData([]);
        setSubColumns([]);
        return;
      }

      let parsed: unknown[];
      if (typeof value === "string") {
        parsed = JSON.parse(value) as unknown[];
      } else {
        parsed = value as unknown[];
      }

      if (!Array.isArray(parsed)) {
        setArrayData([]);
        setSubColumns([]);
        return;
      }

      setArrayData(parsed);

      // Extract column names from first object
      if (
        parsed.length > 0 &&
        typeof parsed[0] === "object" &&
        parsed[0] !== null
      ) {
        const keys = Object.keys(parsed[0]);
        setSubColumns(keys);
      } else {
        setSubColumns(["value"]);
      }
    } catch (error) {
      console.error("Failed to parse array data:", error);
      setArrayData([]);
      setSubColumns([]);
    }
  };

  const handleCellChange = (
    arrayIndex: number,
    fieldKey: string,
    newValue: string
  ) => {
    const updatedArray = [...arrayData];

    if (subColumns.length === 1 && subColumns[0] === "value") {
      // Simple array (not objects)
      updatedArray[arrayIndex] = isNaN(Number(newValue))
        ? newValue
        : Number(newValue);
    } else {
      // Array of objects
      const currentItem = updatedArray[arrayIndex] as Record<string, unknown>;
      updatedArray[arrayIndex] = {
        ...currentItem,
        [fieldKey]: isNaN(Number(newValue)) ? newValue : Number(newValue),
      };
    }

    // Update store with new array
    store.setValue(rowId, column.id, JSON.stringify(updatedArray));
  };

  const handleBlur = (arrayIndex: number, fieldKey: string) => {
    const inputKey = `${arrayIndex}-${fieldKey}`;
    const inputRef = inputRefs.current.get(inputKey);
    if (inputRef) {
      handleCellChange(arrayIndex, fieldKey, inputRef.value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleFocus = () => {
    if (onCellClick) {
      onCellClick(rowId, column.id);
    }
  };

  const getCellValue = (item: unknown, fieldKey: string): string => {
    if (subColumns.length === 1 && subColumns[0] === "value") {
      return String(item ?? "");
    }
    const obj = item as Record<string, unknown>;
    return String(obj?.[fieldKey] ?? "");
  };

  const isEditable = column.editable !== false;
  const bgClass = isSelected
    ? "bg-blue-50"
    : !isEditable
    ? "bg-gray-50"
    : "bg-white";

  const containerClass = cn(
    "relative border-r border-b border-grid-border box-border overflow-auto p-0 transition-colors",
    bgClass,
    className
  );

  // if (arrayData.length === 0) {
  //   return (
  //     <div
  //       className={containerClass}
  //       style={{ width: column.width, minHeight: 40, ...style }}
  //       onClick={handleFocus}
  //     >
  //       <div className="flex items-center justify-center h-full text-gray-400 text-xs">
  //         Empty Array
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div
      className={containerClass}
      style={{ width: column.width, ...style }}
      onClick={handleFocus}
    >
      <div className="w-full">
        {/* Nested table */}
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              {subColumns.map((colKey) => (
                <th
                  key={colKey}
                  className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 uppercase text-[10px]"
                >
                  {colKey}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {arrayData.map((item, arrayIndex) => (
              <tr key={arrayIndex} className="hover:bg-gray-50">
                {subColumns.map((fieldKey) => {
                  const inputKey = `${arrayIndex}-${fieldKey}`;
                  const cellValue = getCellValue(item, fieldKey);
                  return (
                    <td key={fieldKey} className="border border-gray-300 p-0">
                      <input
                        ref={(el) => {
                          if (el) {
                            inputRefs.current.set(inputKey, el);
                          } else {
                            inputRefs.current.delete(inputKey);
                          }
                        }}
                        type="text"
                        defaultValue={cellValue}
                        disabled={!isEditable}
                        onBlur={() => handleBlur(arrayIndex, fieldKey)}
                        onKeyDown={handleKeyDown}
                        className={cn(
                          "w-full h-full px-2 py-1 outline-none bg-transparent text-gray-700 text-xs",
                          !isEditable && "cursor-not-allowed text-gray-500",
                          "focus:bg-blue-50 focus:ring-1 focus:ring-blue-400"
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
