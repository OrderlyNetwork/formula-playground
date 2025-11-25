import React, { useState, useRef, useEffect, useCallback } from "react";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";
import { GridStore } from "@/store/spreadsheet";
import Cell from "./Cell";
import { Plus, Trash2, Lock, ArrowDown, ArrowRight } from "lucide-react";

// Initial Data Generators
const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_COLS: ColumnDef[] = [
  { id: "sku", title: "SKU", width: 100, type: "text", locked: true },
  {
    id: "name",
    title: "Product Name",
    width: 250,
    type: "text",
    locked: false,
  },
  {
    id: "status",
    title: "Status",
    width: 120,
    type: "custom",
    locked: false,
    render: (val) => {
      const v = String(val).toLowerCase();
      let color = "bg-gray-100 text-gray-600";
      if (v === "stock") color = "bg-green-100 text-green-700";
      if (v === "low") color = "bg-yellow-100 text-yellow-700";
      if (v === "out") color = "bg-red-100 text-red-700";
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${color}`}
        >
          {val || "N/A"}
        </span>
      );
    },
  },
  { id: "qty", title: "Quantity", width: 100, type: "number", locked: false },
  {
    id: "price",
    title: "Unit Price",
    width: 100,
    type: "number",
    locked: false,
  },
  // Set sticky: 'right' for the Total column
  {
    id: "total",
    title: "Total (Calc)",
    width: 120,
    type: "number",
    locked: true,
    editable: false,
    sticky: "right",
  },
];

const INITIAL_ROWS: RowDef[] = Array.from({ length: 50 }).map(() => ({
  id: generateId(),
}));

type Selection = { type: "row" | "column"; id: string } | null;

const Spreadsheet: React.FC = () => {
  // React State for Structure ONLY
  const [columns, setColumns] = useState<ColumnDef[]>(INITIAL_COLS);
  const [rows, setRows] = useState<RowDef[]>(INITIAL_ROWS);
  const [selection, setSelection] = useState<Selection>(null);

  // The Store (stable ref)
  const storeRef = useRef<GridStore>(new GridStore(INITIAL_ROWS, INITIAL_COLS));

  // Sync store when structure changes
  useEffect(() => {
    storeRef.current.syncStructure(rows, columns);
  }, [rows, columns]);

  // --- Actions ---

  const addRow = useCallback(() => {
    setRows((prev) => {
      const newRow = { id: generateId() };

      // If a row is selected, insert after it
      if (selection?.type === "row") {
        const index = prev.findIndex((r) => r.id === selection.id);
        if (index !== -1) {
          const newRows = [...prev];
          newRows.splice(index + 1, 0, newRow);
          return newRows;
        }
      }
      // Default: Append to end
      return [...prev, newRow];
    });
  }, [selection]);

  const addColumn = useCallback(() => {
    const newId = generateId();
    const newCol: ColumnDef = {
      id: `col_${newId}`,
      title: "New Column",
      width: 150,
      type: "text",
    };

    setColumns((prev) => {
      // If a column is selected, insert after it
      if (selection?.type === "column") {
        const index = prev.findIndex((c) => c.id === selection.id);
        if (index !== -1) {
          const newCols = [...prev];
          newCols.splice(index + 1, 0, newCol);
          return newCols;
        }
      }

      // Default: Insert before the last one (Total) if exists, else append
      const lastIndex = prev.findIndex((c) => c.id === "total");
      if (lastIndex !== -1) {
        const newCols = [...prev];
        newCols.splice(lastIndex, 0, newCol);
        return newCols;
      }
      return [...prev, newCol];
    });
  }, [selection]);

  const deleteColumn = useCallback(
    (colId: string) => {
      setColumns((prev) => prev.filter((c) => c.id !== colId));
      // Clear selection if deleted
      if (selection?.type === "column" && selection.id === colId) {
        setSelection(null);
      }
    },
    [selection]
  );

  // --- Selection Handlers ---
  const handleRowHeaderClick = (id: string) => {
    setSelection((prev) =>
      prev?.type === "row" && prev.id === id ? null : { type: "row", id }
    );
  };

  const handleColHeaderClick = (id: string) => {
    setSelection((prev) =>
      prev?.type === "column" && prev.id === id ? null : { type: "column", id }
    );
  };

  // Handle click inside a cell: Clear selection if clicked outside current selection
  const handleCellClick = useCallback((rowId: string, colId: string) => {
    setSelection((prev) => {
      // If nothing is selected, stay null
      if (!prev) return null;

      // If we clicked inside the currently selected row, keep selection
      if (prev.type === "row" && prev.id === rowId) return prev;

      // If we clicked inside the currently selected column, keep selection
      if (prev.type === "column" && prev.id === colId) return prev;

      // Otherwise (clicked outside), clear selection
      return null;
    });
  }, []);

  // --- Pre-populate some data for demo purposes ---
  useEffect(() => {
    const s = storeRef.current;
    // Row 0
    s.setValue(rows[0].id, "sku", "A-001");
    s.setValue(rows[0].id, "name", "Gaming Keyboard");
    s.setValue(rows[0].id, "status", "stock");
    s.setValue(rows[0].id, "qty", 5);
    s.setValue(rows[0].id, "price", 120);

    // Row 1
    s.setValue(rows[1].id, "sku", "A-002");
    s.setValue(rows[1].id, "name", "Wireless Mouse");
    s.setValue(rows[1].id, "status", "low");
    s.setValue(rows[1].id, "qty", 10);
    s.setValue(rows[1].id, "price", 45);

    // Row 2
    s.setValue(rows[2].id, "sku", "B-105");
    s.setValue(rows[2].id, "name", "4K Monitor");
    s.setValue(rows[2].id, "status", "out");
    s.setValue(rows[2].id, "qty", 0);
    s.setValue(rows[2].id, "price", 350);
  }, []); // Run once on mount

  // --- Styling Helpers ---
  const getStickyStyle = (
    col: ColumnDef,
    index: number,
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
  };

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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors active:translate-y-0.5"
          title={
            selection?.type === "column"
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

      {/* Grid Container */}
      <div className="flex-1 overflow-auto relative scrollbar-thin">
        <div className="inline-block min-w-full">
          {/* Header Row */}
          <div className="flex sticky top-0 z-40 shadow-sm min-w-max">
            {/* Row Number Header - Sticky Left Corner */}
            <div className="w-10 bg-gray-100 border-r border-b border-gray-300 flex-shrink-0 sticky left-0 z-50"></div>

            {columns.map((col, idx) => {
              const { style, className } = getStickyStyle(col, idx, true);
              const isSelected =
                selection?.type === "column" && selection.id === col.id;
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
                        deleteColumn(col.id);
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

          {/* Data Rows */}
          {rows.map((row, index) => {
            const isRowSelected =
              selection?.type === "row" && selection.id === row.id;

            return (
              <div key={row.id} className="flex min-w-max group">
                {/* Row Number - Sticky Left */}
                <div
                  onClick={() => handleRowHeaderClick(row.id)}
                  className={`w-10 border-r border-b border-grid-border flex items-center justify-center text-xs font-mono sticky left-0 z-30 select-none cursor-pointer transition-colors ${
                    isRowSelected
                      ? "bg-blue-200 text-blue-800 border-blue-300"
                      : "bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Cells */}
                {columns.map((col, idx) => {
                  const { style, className } = getStickyStyle(col, idx, false);
                  // Determine if this specific cell should look selected
                  const isColSelected =
                    selection?.type === "column" && selection.id === col.id;
                  const isCellSelected = isRowSelected || isColSelected;

                  return (
                    <Cell
                      key={`${row.id}-${col.id}`}
                      rowId={row.id}
                      column={col}
                      store={storeRef.current}
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
  );
};

export default Spreadsheet;
