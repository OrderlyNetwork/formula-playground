import React, { useEffect, useRef, memo, useState, useMemo } from "react";
import { GridStore } from "@/store/spreadsheet";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { ColumnDef, CellValue } from "@/types/spreadsheet";
import InputCell from "./InputCell";
import { cn } from "@/lib/utils";

interface CellProps {
  rowId: string;
  column: ColumnDef;
  store: GridStore;
  style?: React.CSSProperties;
  className?: string;
  isSelected?: boolean;
  onCellClick?: (rowId: string, colId: string) => void;
}

/**
 * Cell Component
 *
 * DESIGN:
 * 1. Does NOT use props for 'value' to avoid re-rendering by parent.
 * 2. Uses `useRef` to maintain the input DOM element.
 * 3. Subscribes to `store` to receive updates.
 * 4. For result column, subscribes to SpreadsheetStore calculation results.
 */
const Cell: React.FC<CellProps> = ({
  rowId,
  column,
  store,
  style,
  className,
  isSelected,
  onCellClick,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state ONLY for custom rendering triggers.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_forceUpdateCounter, setForceUpdate] = useState(0);

  // Subscribe to calculation result for result column (O(1) lookup by rowId)
  const calculationResult = useSpreadsheetStore((state) =>
    column.id === "result" ? state.calculationResults[rowId] : undefined
  );

  useEffect(() => {
    // For result column, use calculation result from SpreadsheetStore
    if (column.id === "result" && inputRef.current) {
      if (calculationResult?.error) {
        inputRef.current.value = `Error: ${calculationResult.error}`;
      } else if (calculationResult?.result !== undefined) {
        inputRef.current.value = String(calculationResult.result);
      } else {
        inputRef.current.value = "";
      }
      return; // Skip GridStore subscription for result column
    }

    // 1. Initial Value from GridStore (for non-result columns)
    const initialVal = store.getValue(rowId, column.id);
    if (inputRef.current) {
      inputRef.current.value = String(initialVal ?? "");
    }

    // 2. Subscribe to external changes from GridStore
    const unsubscribe = store.subscribe(
      rowId,
      column.id,
      (newValue: CellValue) => {
        if (inputRef.current) {
          if (document.activeElement !== inputRef.current) {
            inputRef.current.value = String(newValue ?? "");
          }
        }

        if (column.type === "custom") {
          setForceUpdate((prev) => prev + 1);
        }
      }
    );

    return () => unsubscribe();
  }, [rowId, column.id, store, column.type, calculationResult]);

  const handleBlur = () => {
    if (inputRef.current && column.editable !== false) {
      const val = inputRef.current.value;
      store.setValue(rowId, column.id, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    if (onCellClick) {
      onCellClick(rowId, column.id);
    }
  };

  // --- Rendering Logic ---

  const isEditable = column.editable !== false;

  // Calculate background color based on selection state and editability
  const bgClass = isSelected
    ? "bg-blue-50"
    : !isEditable
      ? "bg-gray-50"
      : "bg-white";

  // const baseClasses = `relative border-r border-b border-grid-border box-border ${bgClass}`;

  // Combine props className with base classes
  // const containerClass = `${baseClasses} ${className || ""}`;

  const innerElement = useMemo(() => {
    if (typeof column.render === "function") {
      return column.render(rowId, column, store);
    }
    return null;
  }, [rowId, column, store]);

  const containerClass = cn(
    "relative [&:not(:last-child)]:border-r border-b border-grid-border box-border overflow-hidden p-1 transition-colors focus-within:inset-ring-2 focus-within:inset-ring-blue-500 focus-within:z-10 ",
    bgClass,
    className
    // containerClass
  );

  // Custom Render Strategy
  if (innerElement) {
    // const currentValue = store.getValue(rowId, column.id);
    return (
      <div
        className={containerClass}
        style={{ width: column.width, ...style }}
        onClick={handleFocus}
      >
        {innerElement}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${containerClass} transition-colors`}
      style={{ width: column.width, height: 40, ...style }}
    >
      <InputCell
        rowId={rowId}
        column={column}
        store={store}
        isSelected={isSelected}
        onCellClick={onCellClick}
      />
      {/* <input
        ref={inputRef}
        // type={column.type === "number" ? "number" : "text"}
        type="text"
        className={`w-full h-full px-2 outline-none focus:inset-ring-2 focus:inset-ring-blue-500 focus:z-10 absolute inset-0 bg-transparent text-sm text-gray-700 ${
          !isEditable
            ? "cursor-not-allowed text-gray-500 font-mono text-right"
            : ""
        }`}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        readOnly={!isEditable}
      /> */}
    </div>
  );
};

/**
 * Custom comparison function for memo
 * Only re-render if these props actually changed
 */
const areEqual = (prevProps: CellProps, nextProps: CellProps) => {
  return (
    prevProps.rowId === nextProps.rowId &&
    prevProps.column.id === nextProps.column.id &&
    prevProps.column.width === nextProps.column.width &&
    prevProps.column.editable === nextProps.column.editable &&
    prevProps.column.locked === nextProps.column.locked &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.store === nextProps.store
    // onCellClick is stable (useCallback), no need to compare
    // style and className are derived from column, handled above
  );
};

export default memo(Cell, areEqual);
