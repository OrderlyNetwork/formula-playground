import React, { useEffect, useRef, memo, useState } from "react";
import { GridStore } from "@/store/spreadsheet";
import type { ColumnDef, CellValue } from "@/types/spreadsheet";

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
  const [_, setForceUpdate] = useState(0);

  useEffect(() => {
    // 1. Initial Value
    const initialVal = store.getValue(rowId, column.id);
    if (inputRef.current) {
      inputRef.current.value = String(initialVal ?? "");
    }

    // 2. Subscribe to external changes
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
  }, [rowId, column.id, store, column.type]);

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

  const baseClasses = `relative border-r border-b border-grid-border box-border ${bgClass}`;

  // Combine props className with base classes
  const containerClass = `${baseClasses} ${className || ""}`;

  // Custom Render Strategy
  if (column.type === "custom" && column.render) {
    const currentValue = store.getValue(rowId, column.id);
    return (
      <div
        className={`${containerClass} overflow-hidden p-1 transition-colors`}
        style={{ width: column.width, ...style }}
        onClick={handleFocus}
      >
        {column.render(currentValue)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${containerClass} transition-colors`}
      style={{ width: column.width, height: 40, ...style }}
    >
      <input
        ref={inputRef}
        type={column.type === "number" ? "number" : "text"}
        className={`w-full h-full px-2 outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 absolute inset-0 bg-transparent text-sm text-gray-700 ${
          !isEditable
            ? "cursor-not-allowed text-gray-500 font-mono text-right"
            : ""
        }`}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        readOnly={!isEditable}
      />
    </div>
  );
};

export default memo(Cell);
