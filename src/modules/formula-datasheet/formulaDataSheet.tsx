import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnPinningState,
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { useFormulaStore } from "@/store/formulaStore";
import { useCalculationStatusStore } from "@/store/calculationStatusStore";
import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import {
  flattenFormulaInputs,
  generateTableColumns,
  createInitialRow,
  validateRow,
  reconstructFormulaInputs,
  type TableRow,
} from "@/utils/formulaTableUtils";
import { TypeAwareInput } from "@/modules/formula-graph/components/TypeAwareInput";
import type { FactorType } from "@/types/formula";
import { cn } from "@/lib/utils";
import { dataSheetStateTracker } from "./services/dataSheetStateTracker";
import {
  performRowCalculation,
  updateRowWithResult,
} from "./helpers/calculationHelpers";

interface FormulaDataSheetProps {
  formula?: FormulaDefinition;
  className?: string;
}

export const FormulaDataSheet: React.FC<FormulaDataSheetProps> = ({
  formula,
  className = "",
}) => {
  const { currentInputs, updateInputAt, tsResult, loading, error } =
    useFormulaStore();

  const { updateMetrics } = useCalculationStatusStore();

  const [rows, setRows] = React.useState<TableRow[]>([]);
  const flattenedPaths = useMemo(() => {
    if (!formula) {
      return [];
    }

    return flattenFormulaInputs(formula.inputs);
  }, [formula]);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["result"], // Pin the Result column to the right
    left: ["index"], // Pin the Index column to the left
  });

  // Debounce timers for automatic calculation (one per row)
  const debounceTimersRef = useRef<Map<string, number>>(new Map());
  const DEBOUNCE_DELAY_MS = 300;

  // Track rows that have already been auto-calculated to prevent infinite loops
  const autoCalculatedRowsRef = useRef<Set<string>>(new Set());

  // Keep a ref to the latest rows state for accessing in async callbacks
  const rowsRef = useRef<TableRow[]>(rows);

  // Sync rowsRef with rows state
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Track the previous formula ID to detect formula changes
  const previousFormulaIdRef = useRef<string | undefined>(undefined);

  // Store stable row IDs per formula to maintain consistency across formula switches
  // Key: formulaId, Value: array of stable row IDs
  const formulaRowIdsRef = useRef<Map<string, string[]>>(new Map());

  /**
   * Get or create a stable row ID for a formula and row index
   * This ensures the same rowId is reused when switching back to a formula
   */
  const getStableRowId = useCallback(
    (formulaId: string, rowIndex: number): string => {
      if (!formulaRowIdsRef.current.has(formulaId)) {
        formulaRowIdsRef.current.set(formulaId, []);
      }

      const rowIds = formulaRowIdsRef.current.get(formulaId)!;

      // If we don't have a rowId for this index yet, create one
      if (!rowIds[rowIndex]) {
        rowIds[rowIndex] = `row-${formulaId}-${rowIndex}`;
      }

      return rowIds[rowIndex];
    },
    []
  );

  // Initialize data when formula changes (and only when formula changes)
  useEffect(() => {
    const formulaChanged = previousFormulaIdRef.current !== formula?.id;
    previousFormulaIdRef.current = formula?.id;

    if (formula && formulaChanged) {
      // Clear auto-calculated rows tracking when formula changes
      autoCalculatedRowsRef.current.clear();

      // Get stable row ID for this formula's first row
      const stableRowId = getStableRowId(formula.id, 0);

      // Initialize with current inputs or create a default row
      if (Object.keys(currentInputs).length > 0) {
        // Create a row from current inputs with stable ID
        const initialRow: TableRow = {
          id: stableRowId,
          data: currentInputs,
          _result: tsResult?.outputs?.result,
          _executionTime: tsResult?.durationMs,
          _error: error || undefined,
          _isValid: true,
        };
        setRows([initialRow]);
        // Record initial state
        dataSheetStateTracker.recordRowStates(formula.id, [initialRow]);
      } else {
        // Create a default row with empty values and stable ID
        const defaultRow = {
          ...createInitialRow(formula, 0),
          id: stableRowId,
        };
        setRows([defaultRow]);
        // Record initial state
        dataSheetStateTracker.recordRowStates(formula.id, [defaultRow]);
      }
    } else if (!formula) {
      setRows([]);
      autoCalculatedRowsRef.current.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula?.id]); // Only depend on formula ID, not on currentInputs/tsResult/error

  /**
   * Helper function to trigger automatic calculation for a row
   * This is used for auto-triggering calculations when a row becomes valid
   * without user interaction (e.g., on formula change or initialization)
   */
  const triggerRowCalculation = useCallback(
    (rowId: string, rowData: Record<string, FormulaScalar>) => {
      if (!formula) return;

      // Check if this row has already been auto-calculated
      if (autoCalculatedRowsRef.current.has(rowId)) {
        return;
      }

      // Check if there's already a pending timer for this row
      if (debounceTimersRef.current.has(rowId)) {
        return;
      }

      // Mark this row as being auto-calculated
      autoCalculatedRowsRef.current.add(rowId);

      // Calculate asynchronously using shared calculation logic
      performRowCalculation(rowId, rowData, formula, "auto")
        .then((result) => {
          // Update row with calculation results
          updateRowWithResult(setRows, rowId, result);

          // Note: Keep the row in autoCalculatedRowsRef to prevent re-triggering
          // even if result is undefined (calculation failed)
        })
        .catch(() => {
          // This catch is for unexpected errors outside performRowCalculation
          // performRowCalculation already handles and logs errors internally
        });
    },
    [formula]
  );

  // Record row states and auto-trigger calculation for valid rows without results
  useEffect(() => {
    if (formula && rows.length > 0) {
      dataSheetStateTracker.recordRowStates(formula.id, rows);

      const debugInfo = dataSheetStateTracker.getDebugInfo(formula.id);

      // Auto-trigger calculation for valid rows without results
      // Only trigger if:
      // 1. There are no pending calculations
      // 2. No recent cell updates (to avoid duplicate triggers)
      // 3. Row hasn't been auto-calculated before (prevent infinite loop)
      const hasRecentUpdates =
        debugInfo.lastUpdateTime &&
        Date.now() - debugInfo.lastUpdateTime < 1000; // Within last second

      if (
        debugInfo.rowsWithoutResults > 0 &&
        !hasRecentUpdates &&
        debugInfo.pendingCalculations === 0
      ) {
        // Find rows that are valid but don't have results
        rows.forEach((row) => {
          if (
            row._isValid === true &&
            row._result === undefined &&
            Object.keys(row.data).length > 0 && // Has some data
            !autoCalculatedRowsRef.current.has(row.id) // Not already auto-calculated
          ) {
            // Check if row has at least one non-empty value
            const hasData = Object.values(row.data).some(
              (val) => val !== "" && val !== null && val !== undefined
            );

            if (hasData) {
              // Trigger calculation after a short delay to avoid race conditions
              setTimeout(() => {
                triggerRowCalculation(row.id, row.data);
              }, 100);
            }
          }
        });
      }
    }
  }, [formula, rows, triggerRowCalculation]);

  // Calculate and update global execution time data
  useEffect(() => {
    if (formula && rows.length > 0) {
      const calculatedRows = rows.filter(
        (row) => row._executionTime !== undefined
      );
      const totalTime = calculatedRows.reduce(
        (sum, row) => sum + (row._executionTime || 0),
        0
      );
      const averageTime =
        calculatedRows.length > 0 ? totalTime / calculatedRows.length : 0;

      // Update global store
      updateMetrics(formula.id, {
        totalTime,
        averageTime,
        calculatedRows: calculatedRows.length,
        totalRows: rows.length,
      });
    }
  }, [rows, formula, updateMetrics]);

  // Handle cell updates with debounced automatic calculation
  const handleCellUpdate = useCallback(
    async (rowId: string, path: string, value: FormulaScalar) => {
      if (!formula) return;

      // Clear existing debounce timer for this row
      const existingTimer = debounceTimersRef.current.get(rowId);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
        debounceTimersRef.current.delete(rowId);
      }

      // Clear auto-calculated flag when user updates a cell
      // This allows re-calculation when data changes
      autoCalculatedRowsRef.current.delete(rowId);

      // Get old value for tracking from rowsRef
      const currentRow = rowsRef.current.find((r) => r.id === rowId);
      const oldValue: FormulaScalar = currentRow?.data[path] ?? "";

      // Update row data and validation state
      setRows((prevRows) => {
        const updatedRows = prevRows.map((row) => {
          if (row.id === rowId) {
            const updatedData = { ...row.data, [path]: value };
            const validation = validateRow(
              { ...row, data: updatedData },
              formula
            );

            // Record cell update event
            dataSheetStateTracker.recordCellUpdate(formula.id, {
              timestamp: Date.now(),
              rowId,
              path,
              oldValue,
              newValue: value,
              isValid: validation.isValid,
              validationErrors: validation.isValid
                ? undefined
                : validation.errors,
            });

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
        });

        // Update the formula store if this is the first row
        if (prevRows[0]?.id === rowId) {
          const updatedFirstRow = updatedRows[0];
          if (updatedFirstRow) {
            const reconstructedInputs = reconstructFormulaInputs(
              updatedFirstRow.data,
              formula
            );

            // Update each input individually to trigger the store's update logic
            for (const [key, val] of Object.entries(reconstructedInputs)) {
              updateInputAt(key, val);
            }
          }
        }

        return updatedRows;
      });

      // Set up debounced calculation for the updated row
      const timerId = window.setTimeout(async () => {
        if (!formula) {
          debounceTimersRef.current.delete(rowId);
          return;
        }

        // Get current row state from rowsRef (always up-to-date)
        const updatedRow = rowsRef.current.find((row) => row.id === rowId);

        if (!updatedRow) {
          debounceTimersRef.current.delete(rowId);
          return;
        }

        // Only calculate if row is valid
        if (updatedRow._isValid !== true) {
          debounceTimersRef.current.delete(rowId);
          return;
        }

        // Row is valid - proceed with calculation using shared logic
        try {
          const result = await performRowCalculation(
            rowId,
            updatedRow.data,
            formula,
            "cell-update"
          );

          // Update row with calculation results
          updateRowWithResult(setRows, rowId, result);
        } catch {
          // This catch is for unexpected errors outside performRowCalculation
          // performRowCalculation already handles and logs errors internally
        } finally {
          debounceTimersRef.current.delete(rowId);
        }
      }, DEBOUNCE_DELAY_MS);

      // Store timer ID for this row
      debounceTimersRef.current.set(rowId, timerId);
    },
    [formula, updateInputAt]
  );

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const timers = debounceTimersRef.current;
    return () => {
      // Clear all debounce timers
      timers.forEach((timerId) => {
        clearTimeout(timerId);
      });
      timers.clear();
    };
  }, []);

  /**
   * Handle row data updates
   * This function is provided to table meta but currently not used
   * since handleCellUpdate handles individual cell updates
   * Keeping it for potential batch update scenarios
   *
   * FIXED: Re-enabled the implementation with proper formula validation
   */
  const updateRowData = useCallback(
    (rowId: string, data: Record<string, FormulaScalar>) => {
      if (!formula) {
        return;
      }

      setRows((prevRows) =>
        prevRows.map((row) => {
          if (row.id === rowId) {
            const validation = validateRow({ ...row, data }, formula);
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
  const duplicateRow = useCallback(
    (rowId: string) => {
      if (!formula) return;

      setRows((prevRows) => {
        const rowToDuplicate = prevRows.find((row) => row.id === rowId);
        if (!rowToDuplicate) return prevRows;

        // Get stable row ID for the new row
        const stableRowId = getStableRowId(formula.id, prevRows.length);

        const newRow: TableRow = {
          ...rowToDuplicate,
          id: stableRowId,
          _result: undefined, // Reset result for duplicated row
          _executionTime: undefined,
          _error: undefined,
        };

        return [...prevRows, newRow];
      });
    },
    [formula, getStableRowId]
  );

  // Add new row
  const addNewRow = useCallback(() => {
    if (!formula) return;

    setRows((prev) => {
      // Get stable row ID for the new row
      const stableRowId = getStableRowId(formula.id, prev.length);

      const newRow = {
        ...createInitialRow(formula, prev.length),
        id: stableRowId,
      };

      return [...prev, newRow];
    });
  }, [formula, getStableRowId]);

  /**
   * Execute formula for all valid rows
   * This function calculates results for all valid rows in the table
   * Each row is calculated independently with its own result
   *
   * FIXED: Previously this relied on global tsResult/error which could be stale
   * Now each row calculation is independent and results are correctly associated
   */
  const executeAllRows = useCallback(async () => {
    if (!formula) {
      return;
    }

    // Filter valid rows
    const validRows = rows.filter((row) => row._isValid);

    if (validRows.length === 0) {
      return;
    }

    // Calculate all valid rows in parallel (or use sequential if needed)
    // Using Promise.allSettled to ensure all calculations complete regardless of failures
    const calculationPromises = validRows.map(async (row) => {
      const result = await performRowCalculation(
        row.id,
        row.data,
        formula,
        "manual"
      );
      return { rowId: row.id, result };
    });

    const results = await Promise.allSettled(calculationPromises);

    // Batch update all rows at once for better performance
    setRows((prevRows) => {
      // Create a map of rowId -> result for efficient lookup
      const resultMap = new Map<string, (typeof results)[0]>();
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          resultMap.set(r.value.rowId, r);
        }
      });

      return prevRows.map((row) => {
        const resultEntry = resultMap.get(row.id);
        if (resultEntry && resultEntry.status === "fulfilled") {
          const { result } = resultEntry.value;
          return {
            ...row,
            _result: result.result,
            _executionTime: result.executionTime,
            _error: result.error,
          };
        }
        return row;
      });
    });
  }, [formula, rows]);

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
          className="w-full px-2 py-1 text-sm border-0 rounded-none min-w-0"
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
    state: {
      columnPinning,
    },
    onColumnPinningChange: setColumnPinning,
    enableColumnPinning: true,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      updateRowData,
      deleteRow,
      duplicateRow,
      renderCell,
      addNewRow,
      executeAllRows,
      loading,
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
    <div className="h-full flex flex-col">
      {/* Header */}
      {/* <div className="flex items-center justify-between">
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
      </div> */}

      {/* Table */}
      <div className="flex-1 overflow-hidden">
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
                      const minWidth = isIndexColumn ? column.getSize() : 200;

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
                      const minWidth = isIndexColumn ? column.getSize() : 200;

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
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No test cases. Click "Add Row" to create your first test case.
        </div>
      )}
    </div>
  );
};
