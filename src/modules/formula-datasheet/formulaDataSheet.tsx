import React, { useEffect, useCallback, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFormulaStore } from "@/store/formulaStore";
import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import {
  flattenFormulaInputs,
  generateTableColumns,
  createInitialRow,
  validateRow,
  reconstructFormulaInputs,
  type TableRow,
  type FlattenedPath,
} from "@/utils/formulaTableUtils";
import { TypeAwareInput } from "@/modules/formula-graph/components/TypeAwareInput";
import type { FactorType } from "@/types/formula";

interface FormulaDataSheetProps {
  formula?: FormulaDefinition;
  className?: string;
}

export const FormulaDataSheet: React.FC<FormulaDataSheetProps> = ({
  formula,
  className = "",
}) => {
  const {
    currentInputs,
    updateInputAt,
    executeFormula,
    tsResult,
    loading,
    error,
  } = useFormulaStore();

  const [rows, setRows] = React.useState<TableRow[]>([]);
  const [flattenedPaths, setFlattenedPaths] = React.useState<FlattenedPath[]>(
    []
  );

  // Initialize data when formula changes
  useEffect(() => {
    if (formula) {
      const paths = flattenFormulaInputs(formula.inputs);
      setFlattenedPaths(paths);

      // Initialize with current inputs or create a default row
      if (Object.keys(currentInputs).length > 0) {
        // Create a row from current inputs
        const initialRow: TableRow = {
          id: `row-${Date.now()}-0`,
          data: currentInputs,
          _result: tsResult?.outputs?.result,
          _executionTime: tsResult?.durationMs,
          _error: error || undefined,
          _isValid: true,
        };
        setRows([initialRow]);
      } else {
        // Create a default row with empty values
        const defaultRow = createInitialRow(formula, 0);
        setRows([defaultRow]);
      }
    } else {
      setRows([]);
      setFlattenedPaths([]);
    }
  }, [formula, currentInputs, tsResult, error]);

  // Handle cell updates
  const handleCellUpdate = useCallback(
    async (rowId: string, path: string, value: FormulaScalar) => {
      setRows((prevRows) =>
        prevRows.map((row) => {
          if (row.id === rowId) {
            const updatedData = { ...row.data, [path]: value };
            const validation = validateRow(
              { ...row, data: updatedData },
              formula!
            );

            return {
              ...row,
              data: updatedData,
              _isValid: validation.isValid,
              _error: validation.isValid
                ? undefined
                : validation.errors.join(", "),
            };
          }
          return row;
        })
      );

      // Update the formula store if this is the first row
      if (rows[0]?.id === rowId) {
        const reconstructedInputs = reconstructFormulaInputs({
          ...rows[0].data,
          [path]: value,
        });

        // Update each input individually to trigger the store's update logic
        for (const [key, val] of Object.entries(reconstructedInputs)) {
          updateInputAt(key, val);
        }
      }
    },
    [rows, formula, updateInputAt]
  );

  // Handle row data updates
  const updateRowData = useCallback(
    (rowId: string, data: Record<string, FormulaScalar>) => {
      setRows((prevRows) =>
        prevRows.map((row) => {
          if (row.id === rowId) {
            const validation = validateRow({ ...row, data }, formula!);
            return {
              ...row,
              data,
              _isValid: validation.isValid,
              _error: validation.isValid
                ? undefined
                : validation.errors.join(", "),
            };
          }
          return row;
        })
      );
    },
    [formula]
  );

  // Handle row deletion
  const deleteRow = useCallback((rowId: string) => {
    setRows((prevRows) => prevRows.filter((row) => row.id !== rowId));
  }, []);

  // Handle row duplication
  const duplicateRow = useCallback((rowId: string) => {
    setRows((prevRows) => {
      const rowToDuplicate = prevRows.find((row) => row.id === rowId);
      if (!rowToDuplicate) return prevRows;

      const newRow: TableRow = {
        ...rowToDuplicate,
        id: `row-${Date.now()}-${prevRows.length}`,
        _result: undefined, // Reset result for duplicated row
        _executionTime: undefined,
        _error: undefined,
      };

      return [...prevRows, newRow];
    });
  }, []);

  // Add new row
  const addNewRow = useCallback(() => {
    if (!formula) return;
    const newRow = createInitialRow(formula, rows.length);
    setRows((prev) => [...prev, newRow]);
  }, [formula, rows.length]);

  // Execute formula for all valid rows
  const executeAllRows = useCallback(async () => {
    if (!formula) return;

    for (const row of rows) {
      if (!row._isValid) continue; // Skip invalid rows

      // Set inputs from this row
      const inputs = reconstructFormulaInputs(row.data);
      for (const [key, value] of Object.entries(inputs)) {
        updateInputAt(key, value);
      }

      // Execute formula
      await executeFormula();

      // Update row with results
      setRows((prevRows) =>
        prevRows.map((r) => {
          if (r.id === row.id) {
            return {
              ...r,
              _result: tsResult?.outputs?.result,
              _executionTime: tsResult?.durationMs,
              _error: error || undefined,
            };
          }
          return r;
        })
      );
    }
  }, [formula, rows, updateInputAt, executeFormula, tsResult, error]);

  // Custom cell renderer
  const renderCell = useCallback(
    (props: {
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
          className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-blue-500 min-w-0"
        />
      );
    },
    []
  );

  // Generate columns dynamically
  const columns = useMemo(() => {
    if (!formula) return [];

    return generateTableColumns(flattenedPaths, handleCellUpdate);
  }, [formula, flattenedPaths, handleCellUpdate]);

  // Table setup
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    meta: {
      updateRowData,
      deleteRow,
      duplicateRow,
      renderCell,
    },
  });

  if (!formula) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          Select a formula to view and edit its parameters in a tabular format.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{formula.name}</h3>
          <p className="text-sm text-gray-600">{formula.description}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={addNewRow} variant="outline" size="sm">
            Add Row
          </Button>
          <Button
            onClick={executeAllRows}
            disabled={loading || rows.length === 0}
            size="sm"
          >
            {loading ? "Executing..." : "Execute All"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-medium whitespace-nowrap"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    row.original._isValid === false
                      ? "bg-red-50"
                      : "hover:bg-[#2a2a2a]"
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-2 border-b border-zinc-800"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {rows.length > 10 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {table.getState().pagination.pageIndex * 10 + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * 10,
              rows.length
            )}{" "}
            of {rows.length} rows
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <Button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No test cases. Click "Add Row" to create your first test case.
        </div>
      )}
    </div>
  );
};
