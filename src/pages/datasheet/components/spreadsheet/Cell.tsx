import React, { useEffect, useRef, memo, useState, useMemo } from "react";
import { GridStore } from "@/store/spreadsheet";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import type { ColumnDef, CellValue } from "@/types/spreadsheet";
import InputCell from "./InputCell";
import { cn } from "@/lib/utils";
import { CELL_REGISTRY } from "./cellRegistry";

export interface CellProps {
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
  const [_forceUpdateCounter, setForceUpdate] = useState(0);

  // Get current formula ID for per-tab lookup
  const currentFormula = useSpreadsheetStore((state) => state.currentFormula);
  const formulaId = currentFormula?.id || "default";

  // Subscribe to calculation result for result column (O(1) lookup by formulaId -> rowId)
  // Direct state access for proper reactivity instead of using getter method
  const calculationResult = useSpreadsheetStore((state) => {
    if (column.id !== "result") return undefined;
    const tabResults = state.tabCalculationResults[formulaId];
    return tabResults ? tabResults[rowId] : undefined;
  });

  useEffect(() => {
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

        // For custom cells (using column.render or CELL_REGISTRY), trigger re-render on data change
        if (
          typeof column.render === "function" ||
          CELL_REGISTRY.has(column.type)
        ) {
          setForceUpdate((prev) => prev + 1);
        }
      }
    );

    return () => unsubscribe();
  }, [rowId, column.id, store, column.type, column.render, calculationResult]);

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

  const innerElement = useMemo(() => {
    if (typeof column.render === "function") {
      return column.render(rowId, column, store);
    }
    if (CELL_REGISTRY.has(column.type)) {
      const CellComponent = CELL_REGISTRY.get(column.type)!;
      return (
        <CellComponent
          rowId={rowId}
          column={column}
          store={store}
          isSelected={isSelected}
          onCellClick={onCellClick}
        />
      );
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowId, column, store, isSelected, onCellClick, _forceUpdateCounter]);

  const containerClass = cn(
    "h-[40px] relative border-r border-b border-grid-border box-border overflow-hidden transition-colors focus-within:inset-ring-2 focus-within:inset-ring-blue-500 focus-within:z-10 [&:has([data-popover-open])]:inset-ring-2 [&:has([data-popover-open])]:inset-ring-blue-500 [&:has([data-popover-open])]:z-10",
    bgClass,
    className
  );

  if (innerElement) {
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
    </div>
  );
};

const areEqual = (prevProps: CellProps, nextProps: CellProps) => {
  return (
    prevProps.rowId === nextProps.rowId &&
    prevProps.column.id === nextProps.column.id &&
    prevProps.column.width === nextProps.column.width &&
    prevProps.column.editable === nextProps.column.editable &&
    prevProps.column.locked === nextProps.column.locked &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.store === nextProps.store
  );
};

export default memo(Cell, areEqual);
