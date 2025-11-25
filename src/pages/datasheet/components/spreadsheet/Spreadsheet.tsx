import React, { useRef, useEffect, useCallback, useMemo } from "react";
import type { ColumnDef, RowDef, CellValue } from "@/types/spreadsheet";
import { GridStore } from "@/store/spreadsheet";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { useVirtualizer } from "@tanstack/react-virtual";
import Cell from "./Cell";
import { Trash2, Lock, ArrowDown, ArrowRight } from "lucide-react";
import type { TableRow } from "@/modules/formula-datasheet/types";
import type { FlattenedPath } from "@/utils/formulaTableUtils";

// Initial Data Generators
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Props interface for Spreadsheet component
 */
interface SpreadsheetProps {
  rows?: TableRow[];
  flattenedPaths?: FlattenedPath[];
}

/**
 * Generate columns from formula flattened paths
 */
const generateColumnsFromFormula = (
  flattenedPaths: FlattenedPath[]
): ColumnDef[] => {
  const columns: ColumnDef[] = [];

  // Add columns from formula inputs
  flattenedPaths.forEach((path) => {
    const widthMap: Record<string, number> = {
      number: 200,
      string: 200,
      boolean: 100,
      object: 250,
    };

    const width = widthMap[path.factorType.baseType] || 150;

    columns.push({
      id: path.path,
      title: path.header,
      width,

      type: path.factorType.baseType === "number" ? "number" : "text",
      locked: true,
      editable: true,
    });
  });

  // Add Result column (sticky right)
  columns.push({
    id: "result",
    title: "Result",
    width: 150,
    type: "custom",
    locked: true,
    editable: false,
    sticky: "right",
    render: (val: CellValue) => {
      const strVal = String(val || "");

      // Check if it's an error
      if (strVal.startsWith("Error:")) {
        return (
          <div className="text-red-600 text-xs px-2 truncate">{strVal}</div>
        );
      }

      // Display result
      if (strVal && strVal !== "") {
        return (
          <div className="text-gray-900 text-sm px-2 font-mono text-right truncate">
            {strVal}
          </div>
        );
      }

      return <div className="text-gray-400 text-sm px-2">-</div>;
    },
  });

  return columns;
};

/**
 * Generate rows with minimum 50 entries
 * If formulaRows provided, use their IDs; otherwise generate new IDs
 * Always ensures at least 50 rows exist
 */
const generateRows = (formulaRows?: TableRow[]): RowDef[] => {
  const rows: RowDef[] = [];

  // First, add formula rows if provided
  if (formulaRows && formulaRows.length > 0) {
    formulaRows.forEach((row) => {
      rows.push({ id: row.id });
    });
  }

  // Then pad to minimum 50 rows
  while (rows.length < 50) {
    rows.push({ id: generateId() });
  }

  return rows;
};

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

  // Helper function to convert FormulaScalar to CellValue
  const toCellValue = (value: unknown): CellValue => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" || typeof value === "number") return value;
    if (typeof value === "boolean") return String(value);
    // For objects and arrays, convert to JSON string
    return JSON.stringify(value);
  };

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

  // --- Styling Helpers (Memoized) ---
  const getStickyStyle = useCallback(
    (
      col: ColumnDef,
      isHeader: boolean
    ): { style: React.CSSProperties; className: string } => {
      if (!col.sticky) return { style: {}, className: "" };

      const style: React.CSSProperties = { position: "sticky" };
      let className = isHeader ? "z-30" : "z-20"; // Headers higher than body

      if (col.sticky === "right") {
        style.right = 0;
        className +=
          " border-l border-grid-border shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]";
      } else if (col.sticky === "left") {
        style.left = 40;
        className +=
          " border-r border-grid-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]";
      }

      return { style, className };
    },
    []
  );

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
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors active:translate-y-0.5"
          title={
            selection?.type === "row"
              ? "Add Row After Selected"
              : "Add Row at Bottom"
          }
        >
          <ArrowDown size={14} className="text-blue-600" />
          <span>Add Row {selection?.type === "row" ? "(Insert)" : ""}</span>
        </button>
        <button
          onClick={addColumn}
          // disabled={flattenedPaths && flattenedPaths.length > 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          title={
            flattenedPaths && flattenedPaths.length > 0
              ? "Columns are defined by formula inputs"
              : selection?.type === "column"
              ? "Add Column After Selected"
              : "Add Column at End"
          }
        >
          <ArrowRight size={14} className="text-green-600" />
          <span>
            Add Column {selection?.type === "column" ? "(Insert)" : ""}
          </span>
        </button>
        <div className="h-6 w-px bg-gray-300 mx-2"></div>
        <span className="text-xs text-gray-500">
          Click <strong>Row Index</strong> or <strong>Column Header</strong> to
          select. Add buttons insert after selection.
        </span>
      </div>

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
          <div className="flex sticky top-0 z-40 shadow-sm min-w-max">
            {/* Row Number Header - Sticky Left Corner */}
            <div className="w-10 bg-gray-100 border-r border-b border-gray-300 flex-shrink-0 sticky left-0 z-50"></div>

            {columns.map((col) => {
              const { style, className } = getStickyStyle(col, true);
              const isSelected = selectedColIds.has(col.id);
              return (
                <div
                  key={col.id}
                  onClick={() => handleColHeaderClick(col.id)}
                  className={`bg-gray-100 border-r border-b border-gray-300 px-2 py-2 flex items-center justify-between group font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors ${
                    isSelected
                      ? "bg-blue-200 text-blue-900 border-blue-300"
                      : "text-gray-600"
                  } ${className}`}
                  style={{ width: col.width, minWidth: col.width, ...style }}
                >
                  <div className="flex items-center gap-1 truncate">
                    {col.locked && <Lock size={10} className="text-gray-400" />}
                    <span>{col.title}</span>
                  </div>
                  {!col.locked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteColumnAction(col.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-all"
                      title="Delete Column"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

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
                <div
                  key={row.id}
                  className="flex min-w-max group absolute top-0 left-0 w-full"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {/* Row Number - Sticky Left */}
                  <div
                    onClick={() => handleRowHeaderClick(row.id)}
                    className={`w-10 border-r border-b border-grid-border flex items-center justify-center text-xs font-mono sticky left-0 z-30 select-none cursor-pointer transition-colors ${
                      isRowSelected
                        ? "bg-blue-200 text-blue-800 border-blue-300"
                        : "bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    {virtualRow.index + 1}
                  </div>

                  {/* Cells */}
                  {columns.map((col) => {
                    const { style, className } = getStickyStyle(col, false);
                    // Use pre-computed Sets for O(1) lookup
                    const isColSelected = selectedColIds.has(col.id);
                    const isCellSelected = isRowSelected || isColSelected;

                    return (
                      <Cell
                        key={`${row.id}-${col.id}`}
                        rowId={row.id}
                        column={col}
                        store={storeRef.current!}
                        style={style}
                        className={className}
                        isSelected={isCellSelected}
                        onCellClick={handleCellClick}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spreadsheet;
