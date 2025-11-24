/**
 * DataSheetTable Component
 * Renders the data sheet table using TanStack Table
 */

import React, { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnPinningState,
} from "@tanstack/react-table";
import type { FormulaScalar, FactorType } from "@/types/formula";
import type { TableRow } from "../types";
import { generateTableColumns, type FlattenedPath } from "@/utils/formulaTableUtils";
import { TypeAwareInput } from "@/modules/formula-graph/components/TypeAwareInput";
import { cn } from "@/lib/utils";
import { MIN_COLUMN_WIDTH } from "../constants";

interface DataSheetTableProps {
  rows: TableRow[];
  flattenedPaths: FlattenedPath[];
  loading: boolean;
  onCellUpdate: (rowId: string, path: string, value: FormulaScalar) => void;
  onUpdateRowData: (rowId: string, data: Record<string, FormulaScalar>) => void;
  onDeleteRow: (rowId: string) => void;
  onDuplicateRow: (rowId: string) => void;
  onAddNewRow: () => void;
  onExecuteAllRows: () => void;
}

/**
 * Renders a type-aware input cell
 */
const renderCell = (props: {
  value: FormulaScalar;
  rowId: string;
  path: string;
  factorType: FactorType;
  onUpdate: (value: FormulaScalar) => void;
}) => {
  return (
    <TypeAwareInput
      value={props.value}
      factorType={props.factorType}
      onChange={props.onUpdate}
      className="w-full px-2 py-1 text-sm border-0 rounded-none min-w-0"
    />
  );
};

/**
 * DataSheetTable component
 * Renders the table with pinned columns and custom cell rendering
 */
export const DataSheetTable: React.FC<DataSheetTableProps> = ({
  rows,
  flattenedPaths,
  loading,
  onCellUpdate,
  onUpdateRowData,
  onDeleteRow,
  onDuplicateRow,
  onAddNewRow,
  onExecuteAllRows,
}) => {
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["result"], // Pin the Result column to the right
    left: ["index"], // Pin the Index column to the left
  });

  // Generate columns dynamically
  const columns = useMemo(() => {
    return generateTableColumns(flattenedPaths, onCellUpdate);
  }, [flattenedPaths, onCellUpdate]);

  // Setup table
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      columnPinning,
    },
    onColumnPinningChange: setColumnPinning,
    enableColumnPinning: true,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      updateRowData: onUpdateRowData,
      deleteRow: onDeleteRow,
      duplicateRow: onDuplicateRow,
      renderCell,
      addNewRow: onAddNewRow,
      executeAllRows: onExecuteAllRows,
      loading,
    },
  });

  return (
    <div className="h-full overflow-auto">
      {/* Div-based headless table layout */}
      <div
        role="table"
        className="w-full text-sm"
        style={{ minWidth: "100%" }}
      >
        {/* Header groups */}
        <div role="rowgroup">
          {table.getHeaderGroups().map((headerGroup) => {
            // Find the last non-pinned header to make it expand
            const visibleHeaders = headerGroup.headers.filter(
              (h) => !h.isPlaceholder
            );
            const lastNonPinnedHeader = visibleHeaders
              .slice()
              .reverse()
              .find((h) => !h.column.getIsPinned());

            return (
              <div
                role="row"
                key={headerGroup.id}
                className="flex"
                style={{ minWidth: "100%" }}
              >
                {headerGroup.headers.map((header, headerIndex) => {
                  const { column } = header;
                  const isPinned = column.getIsPinned();
                  if (header.isPlaceholder) return null;

                  // Make the last non-pinned column expand to fill space
                  const isLastNonPinned = header === lastNonPinnedHeader;

                  // Determine minWidth based on column type
                  const isIndexColumn = column.id === "index";
                  const minWidth = isIndexColumn ? column.getSize() : MIN_COLUMN_WIDTH;

                  // Border strategy: right and bottom for all cells, left for first column, top for header row
                  const isFirstColumn = headerIndex === 0;

                  return (
                    <div
                      role="columnheader"
                      key={header.id}
                      className={cn(
                        "px-2 py-2 font-medium whitespace-nowrap border-r border-b border-gray-300",
                        isFirstColumn && "border-l",
                        isIndexColumn ? "text-right" : "text-left",
                        {
                          "shadow-[-2px_0_5px_-2px_rgba(136,136,136,.3)] bg-white sticky z-20":
                            isPinned,
                        }
                      )}
                      style={{
                        width: isLastNonPinned ? "auto" : header.getSize(),
                        flex: isLastNonPinned ? "1 1 auto" : "0 0 auto",
                        minWidth,
                        left:
                          isPinned === "left"
                            ? `${column.getStart("left")}px`
                            : undefined,
                        right:
                          isPinned === "right"
                            ? `${column.getAfter("right")}px`
                            : undefined,
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Body rows */}
        <div role="rowgroup">
          {table.getRowModel().rows.map((row) => {
            const visibleCells = row.getVisibleCells();
            // Find the last non-pinned cell to make it expand
            const lastNonPinnedCell = visibleCells
              .slice()
              .reverse()
              .find((cell) => !cell.column.getIsPinned());

            return (
              <div
                role="row"
                key={row.id}
                className={cn(
                  "relative flex group z-0 group-focus-within:z-10",
                  row.original._isValid === false
                    ? "bg-red-50"
                    : "hover:bg-gray-50"
                )}
                style={{ minWidth: "100%" }}
              >
                {visibleCells.map((cell, cellIndex) => {
                  const { column } = cell;
                  const isPinned = column.getIsPinned();
                  const isLastNonPinned = cell === lastNonPinnedCell;

                  // Determine minWidth based on column type
                  const isIndexColumn = column.id === "index";
                  const minWidth = isIndexColumn ? column.getSize() : MIN_COLUMN_WIDTH;

                  // Border strategy: right and bottom for all cells, left for first column
                  const isFirstColumn = cellIndex === 0;

                  return (
                    <div
                      role="cell"
                      key={cell.id}
                      className={cn(
                        "relative border-r border-b border-gray-300 flex items-center focus-within:outline-none focus-within:inset-ring-2 focus-within:inset-ring-blue-500",
                        isFirstColumn && "border-l",
                        isIndexColumn ? "text-right" : "text-left",
                        isPinned
                          ? "shadow-[-2px_0_5px_-2px_rgba(136,136,136,.3)] bg-white sticky z-10"
                          : "bg-white"
                      )}
                      style={{
                        width: isLastNonPinned ? "auto" : column.getSize(),
                        flex: isLastNonPinned ? "1 1 auto" : "0 0 auto",
                        minWidth,
                        left:
                          isPinned === "left"
                            ? `${column.getStart("left")}px`
                            : undefined,
                        right:
                          isPinned === "right"
                            ? `${column.getAfter("right")}px`
                            : undefined,
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </div>
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

