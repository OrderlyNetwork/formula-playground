/**
 * Example: Custom Spreadsheet Implementation for Playground Mode
 *
 * This example demonstrates how to use the stateless Spreadsheet component
 * with custom state management, independent of the global spreadsheet store.
 */

import React, { useState, useMemo, useRef, useCallback } from "react";
import { Spreadsheet } from "@/pages/datasheet/components/spreadsheet";
import type { SpreadsheetProps } from "@/pages/datasheet/components/spreadsheet";
import { GridStore } from "@/store/spreadsheet";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";

/**
 * Example component showing custom spreadsheet usage in playground mode
 */
export const PlaygroundSpreadsheet: React.FC = () => {
  // Local state management (not using global store)
  const [columns, setColumns] = useState<ColumnDef[]>([
    { id: "index", title: "#", width: 60, type: "index", fixed: true },
    { id: "input1", title: "Input 1", width: 150, type: "text" },
    { id: "input2", title: "Input 2", width: 150, type: "number" },
    { id: "result", title: "Result", width: 150, type: "result" },
  ]);

  const [rows, setRows] = useState<RowDef[]>(() => {
    // Initialize with 10 rows
    return Array.from({ length: 10 }, (_, i) => ({ id: `row_${i}` }));
  });

  const [selection, setSelection] = useState<{
    type: "row" | "column";
    id: string;
  } | null>(null);

  // GridStore for cell data management
  const gridStoreRef = useRef<GridStore | null>(null);

  // Initialize GridStore
  if (!gridStoreRef.current) {
    gridStoreRef.current = new GridStore(
      rows,
      columns,
      async (rowId, colId) => {
        console.log(`Cell changed: ${rowId}, ${colId}`);
        // Custom calculation logic here
      }
    );
  }

  // Compute derived data for rendering
  const rowIds = useMemo(() => rows.map((r) => r.id), [rows]);

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

  // Event handlers
  const handleRowHeaderClick = useCallback((rowId: string) => {
    setSelection((prev) =>
      prev?.type === "row" && prev.id === rowId
        ? null
        : { type: "row", id: rowId }
    );
  }, []);

  const handleColHeaderClick = useCallback((colId: string) => {
    setSelection((prev) =>
      prev?.type === "column" && prev.id === colId
        ? null
        : { type: "column", id: colId }
    );
  }, []);

  const handleCellClick = useCallback((rowId: string, colId: string) => {
    // Clear selection when clicking inside a cell
    setSelection((prev) => {
      if (!prev) return null;
      if (prev.type === "row" && prev.id === rowId) return prev;
      if (prev.type === "column" && prev.id === colId) return prev;
      return null;
    });
  }, []);

  const handleDeleteColumn = useCallback((colId: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== colId));
    setSelection((prev) =>
      prev?.type === "column" && prev.id === colId ? null : prev
    );
  }, []);

  const handleAddRow = useCallback(() => {
    const afterRowId = selection?.type === "row" ? selection.id : undefined;
    const newRow: RowDef = { id: `row_${Date.now()}` };

    setRows((prev) => {
      if (afterRowId) {
        const index = prev.findIndex((r) => r.id === afterRowId);
        if (index !== -1) {
          const newRows = [...prev];
          newRows.splice(index + 1, 0, newRow);
          return newRows;
        }
      }
      return [...prev, newRow];
    });

    // Sync with GridStore
    if (gridStoreRef.current) {
      gridStoreRef.current.syncStructure([...rows, newRow], columns);
    }
  }, [selection, rows, columns]);

  const handleAddColumn = useCallback(() => {
    const afterColId = selection?.type === "column" ? selection.id : undefined;
    const newCol: ColumnDef = {
      id: `col_${Date.now()}`,
      title: "New Column",
      width: 150,
      type: "text",
    };

    setColumns((prev) => {
      if (afterColId) {
        const index = prev.findIndex((c) => c.id === afterColId);
        if (index !== -1) {
          const newCols = [...prev];
          newCols.splice(index + 1, 0, newCol);
          return newCols;
        }
      }

      // Default: insert before result column
      const resultIndex = prev.findIndex((c) => c.id === "result");
      if (resultIndex !== -1) {
        const newCols = [...prev];
        newCols.splice(resultIndex, 0, newCol);
        return newCols;
      }

      return [...prev, newCol];
    });
  }, [selection]);

  const handleClearDataSheet = useCallback(() => {
    if (gridStoreRef.current) {
      gridStoreRef.current.clearAllData();
    }
  }, []);

  // Prepare props for Spreadsheet component
  const spreadsheetProps: SpreadsheetProps = {
    columns,
    rowIds,
    gridStore: gridStoreRef.current,
    selection,
    selectedRowIds,
    selectedColIds,
    onRowHeaderClick: handleRowHeaderClick,
    onColHeaderClick: handleColHeaderClick,
    onCellClick: handleCellClick,
    onDeleteColumn: handleDeleteColumn,
    onAddRow: handleAddRow,
    onAddColumn: handleAddColumn,
    onClearDataSheet: handleClearDataSheet,
    showToolbar: true,
  };

  return (
    <div className="h-full w-full bg-gray-50">
      <Spreadsheet {...spreadsheetProps} />
    </div>
  );
};

export default PlaygroundSpreadsheet;
