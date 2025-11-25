import React, { useEffect, useRef } from "react";
import { GridStore } from "@/store/spreadsheet";
import type { ColumnDef, CellValue } from "@/types/spreadsheet";

interface InputCellProps {
  rowId: string;
  column: ColumnDef;
  store: GridStore;
  isSelected?: boolean;
  onCellClick?: (rowId: string, colId: string) => void;
}

/**
 * InputCell Component - Renders editable input cells
 *
 * DESIGN:
 * 1. Does NOT use props for 'value' to avoid re-rendering by parent.
 * 2. Uses `useRef` to maintain the input DOM element.
 * 3. Subscribes to GridStore to receive updates.
 * 4. Handles user input and updates GridStore on blur/enter.
 */
const InputCell: React.FC<InputCellProps> = ({
  rowId,
  column,
  store,
  isSelected,
  onCellClick,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Initial Value from GridStore
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
          // Only update if not currently focused (avoid overwriting user input)
          if (document.activeElement !== inputRef.current) {
            inputRef.current.value = String(newValue ?? "");
          }
        }
      }
    );

    return () => unsubscribe();
  }, [rowId, column.id, store]);

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

  const isEditable = column.editable !== false;

  return (
    <input
      ref={inputRef}
      type="text"
      className={`w-full h-full px-2 outline-none absolute inset-0 bg-transparent text-sm text-gray-700 ${
        !isEditable
          ? "cursor-not-allowed text-gray-500 font-mono text-right"
          : ""
      }`}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      readOnly={!isEditable}
    />
  );
};

export default InputCell;
