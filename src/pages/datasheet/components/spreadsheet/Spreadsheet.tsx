import React, { useRef, useEffect, useCallback, useMemo } from "react";
import { GridStore } from "@/store/spreadsheet";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TableRow } from "@/modules/formula-datasheet/types";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import SpreadsheetToolbar from "./SpreadsheetToolbar";
import SpreadsheetHeader from "./SpreadsheetHeader";
import SpreadsheetRow from "./SpreadsheetRow";
import {
  generateColumnsFromFormula,
  generateRows,
  toCellValue,
} from "./spreadsheetUtils";

/**
 * Props interface for Spreadsheet component
 */
interface SpreadsheetProps {
  rows?: TableRow[];
  flattenedPaths?: FlattenedPath[];
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({
  rows: formulaRows,
  flattenedPaths,
}) => {
  // Separate state and actions using selectors to avoid unnecessary re-renders
  const columns = useSpreadsheetStore((state) => state.columns);
  const rows = useSpreadsheetStore((state) => state.rows);
  const selection = useSpreadsheetStore((state) => state.selection);
  const isColumnsReady = useSpreadsheetStore((state) => state.isColumnsReady);

  // Get actions separately (they're stable and won't cause re-renders)
  const setColumns = useSpreadsheetStore((state) => state.setColumns);
  const setRows = useSpreadsheetStore((state) => state.setRows);
  const setIsColumnsReady = useSpreadsheetStore(
    (state) => state.setIsColumnsReady
  );
  const addRowAction = useSpreadsheetStore((state) => state.addRow);
  const addColumnAction = useSpreadsheetStore((state) => state.addColumn);
  const deleteColumnAction = useSpreadsheetStore((state) => state.deleteColumn);
  const toggleRowSelection = useSpreadsheetStore(
    (state) => state.toggleRowSelection
  );
  const toggleColumnSelection = useSpreadsheetStore(
    (state) => state.toggleColumnSelection
  );
  const updateSelectionOnCellClick = useSpreadsheetStore(
    (state) => state.updateSelectionOnCellClick
  );

  // GridStore for data calculation (stable ref)
  const storeRef = useRef<GridStore | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize GridStore and Zustand store in useEffect to avoid state updates during render
  useEffect(() => {
    if (!isInitializedRef.current) {
      const initialColumns = flattenedPaths
        ? generateColumnsFromFormula(flattenedPaths)
        : [];
      const initialRows = generateRows(formulaRows);

      // Initialize GridStore
      if (!storeRef.current) {
        storeRef.current = new GridStore(initialRows, initialColumns);
      }

      // Initialize Zustand store
      setColumns(initialColumns);
      setRows(initialRows);
      setIsColumnsReady(flattenedPaths !== undefined);

      isInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - dependencies captured in closure

  // Sync columns when flattenedPaths changes
  useEffect(() => {
    if (!isInitializedRef.current) return; // Skip during initialization

    if (flattenedPaths !== undefined) {
      const newColumns =
        flattenedPaths.length > 0
          ? generateColumnsFromFormula(flattenedPaths)
          : [];
      setColumns(newColumns);
      setIsColumnsReady(true);
    }
  }, [flattenedPaths, setColumns, setIsColumnsReady]);

  // Sync rows when formulaRows changes - always ensure minimum 50 rows
  useEffect(() => {
    if (!isInitializedRef.current) return; // Skip during initialization

    const newRows = generateRows(formulaRows);
    setRows(newRows);
  }, [formulaRows, setRows]);

  // Sync GridStore when structure changes
  useEffect(() => {
    if (storeRef.current) {
      storeRef.current.syncStructure(rows, columns);
    }
  }, [rows, columns]);

  // --- Actions ---

  const addRow = useCallback(() => {
    const afterRowId = selection?.type === "row" ? selection.id : undefined;
    addRowAction(afterRowId);
  }, [selection, addRowAction]);

  const addColumn = useCallback(() => {
    const afterColId = selection?.type === "column" ? selection.id : undefined;
    addColumnAction(afterColId);
  }, [selection, addColumnAction]);

  // --- Selection Handlers ---
  const handleRowHeaderClick = useCallback(
    (id: string) => {
      toggleRowSelection(id);
    },
    [toggleRowSelection]
  );

  const handleColHeaderClick = useCallback(
    (id: string) => {
      toggleColumnSelection(id);
    },
    [toggleColumnSelection]
  );

  // Handle click inside a cell: Clear selection if clicked outside current selection
  const handleCellClick = useCallback(
    (rowId: string, colId: string) => {
      updateSelectionOnCellClick(rowId, colId);
    },
    [updateSelectionOnCellClick]
  );

  // Initialize GridStore with formula data
  useEffect(() => {
    if (formulaRows && formulaRows.length > 0 && storeRef.current) {
      const s = storeRef.current;

      formulaRows.forEach((row, rowIndex) => {
        // Set index column value
        s.setValue(row.id, "index", String(rowIndex + 1));

        // Populate cell data from row.data
        Object.entries(row.data).forEach(([path, value]) => {
          s.setValue(row.id, path, toCellValue(value));
        });

        // Set result or error
        if (row._error) {
          s.setValue(row.id, "result", `Error: ${row._error}`);
        } else if (row._result !== undefined) {
          s.setValue(row.id, "result", toCellValue(row._result));
        }
      });
    }
  }, [formulaRows, rows]);

  // Pre-compute selection sets for O(1) lookup instead of O(n) checks
  const selectedRowIds = useMemo(() => {
    if (selection?.type === "row") {
      return new Set([selection.id]);
    }
    return new Set<string>();
  }, [selection]);

  const selectedColIds = useMemo(() => {
    if (selection?.type === "column") {
      return new Set([selection.id]);
    }
    return new Set<string>();
  }, [selection]);

  // Container ref for virtualizer
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual row scrolling
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Row height
    overscan: 5, // Render 5 extra rows above/below viewport
  });

  // Show loading state until columns are determined
  if (!isColumnsReady) {
    return (
      <div className="flex flex-col h-full bg-white shadow-sm overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-500">Loading spreadsheet...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <SpreadsheetToolbar
        selection={selection}
        flattenedPaths={flattenedPaths}
        onAddRow={addRow}
        onAddColumn={addColumn}
      />

      {/* Grid Container with Virtual Scrolling */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto relative scrollbar-thin"
      >
        <div
          className="inline-block min-w-full"
          style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
        >
          {/* Header Row - Sticky */}
          <SpreadsheetHeader
            columns={columns}
            selectedColIds={selectedColIds}
            onColHeaderClick={handleColHeaderClick}
            onDeleteColumn={deleteColumnAction}
          />

          {/* Virtualized Data Rows */}
          <div
            style={{
              position: "relative",
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isRowSelected = selectedRowIds.has(row.id);

              return (
                <SpreadsheetRow
                  key={row.id}
                  row={row}
                  rowIndex={virtualRow.index}
                  columns={columns}
                  store={storeRef.current!}
                  isRowSelected={isRowSelected}
                  selectedColIds={selectedColIds}
                  onRowHeaderClick={handleRowHeaderClick}
                  onCellClick={handleCellClick}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spreadsheet;
