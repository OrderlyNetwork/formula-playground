/**
 * Hook for managing automatic calculation logic
 * Handles debounced calculations, auto-triggering, and row state tracking
 */

import { useCallback, useEffect, useRef } from "react";
import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import type { TableRow } from "../types";
import { dataSheetStateTracker } from "../services/dataSheetStateTracker";
import {
  performRowCalculation,
  updateRowWithResult,
} from "../helpers/calculationHelpers";
import { DEBOUNCE_DELAY_MS, AUTO_TRIGGER_DELAY_MS } from "../constants";

interface UseAutoCalculationOptions {
  formula?: FormulaDefinition;
  rows: TableRow[];
  rowsRef: React.MutableRefObject<TableRow[]>;
  setRows: React.Dispatch<React.SetStateAction<TableRow[]>>;
}

/**
 * Custom hook to manage automatic calculation logic
 */
export function useAutoCalculation({
  formula,
  rows,
  rowsRef,
  setRows,
}: UseAutoCalculationOptions) {
  // Debounce timers for automatic calculation (one per row)
  const debounceTimersRef = useRef<Map<string, number>>(new Map());

  // Track rows that have already been auto-calculated to prevent infinite loops
  const autoCalculatedRowsRef = useRef<Set<string>>(new Set());

  // Clear auto-calculated rows tracking when formula changes
  const previousFormulaIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previousFormulaIdRef.current !== formula?.id) {
      autoCalculatedRowsRef.current.clear();
      previousFormulaIdRef.current = formula?.id;
    }
  }, [formula?.id]);

  /**
   * Trigger automatic calculation for a row
   * Used for auto-triggering calculations when a row becomes valid
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

          // Keep the row in autoCalculatedRowsRef to prevent re-triggering
        })
        .catch(() => {
          // This catch is for unexpected errors outside performRowCalculation
          // performRowCalculation already handles and logs errors internally
        });
    },
    [formula, setRows]
  );

  /**
   * Handle cell updates with debounced automatic calculation
   * Note: path and value are unused but kept for API consistency
   */
  const handleCellUpdate = useCallback(
    async (rowId: string, _path: string, _value: FormulaScalar) => {
      if (!formula) return;

      // Clear existing debounce timer for this row
      const existingTimer = debounceTimersRef.current.get(rowId);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
        debounceTimersRef.current.delete(rowId);
      }

      // Clear auto-calculated flag when user updates a cell
      autoCalculatedRowsRef.current.delete(rowId);

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
    [formula, rowsRef, setRows]
  );

  /**
   * Execute formula for all valid rows
   */
  const executeAllRows = useCallback(async () => {
    const currentRows = rowsRef.current;
    if (!formula) return;

    // Filter valid rows
    const validRows = currentRows.filter((row) => row._isValid);
    if (validRows.length === 0) return;

    // Calculate all valid rows in parallel
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
  }, [formula, rowsRef, setRows]);

  // Auto-trigger calculation for valid rows without results
  const rowsSerializedRef = useRef<string>("");
  const prevRowsLengthRef = useRef<number>(0);

  useEffect(() => {
    if (!formula || rows.length === 0) return;

    // Only process if rows actually changed (not just reference)
    const currentSerialized = JSON.stringify(
      rows.map((r) => ({
        id: r.id,
        isValid: r._isValid,
        hasResult: r._result !== undefined,
        dataKeys: Object.keys(r.data),
      }))
    );

    // Skip if rows haven't meaningfully changed
    if (
      currentSerialized === rowsSerializedRef.current &&
      rows.length === prevRowsLengthRef.current
    ) {
      return;
    }

    rowsSerializedRef.current = currentSerialized;
    prevRowsLengthRef.current = rows.length;

    // Record row states
    dataSheetStateTracker.recordRowStates(formula.id, rows);

    const debugInfo = dataSheetStateTracker.getDebugInfo(formula.id);

    // Auto-trigger calculation for valid rows without results
    const hasRecentUpdates =
      debugInfo.lastUpdateTime && Date.now() - debugInfo.lastUpdateTime < 1000;

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
          Object.keys(row.data).length > 0 &&
          !autoCalculatedRowsRef.current.has(row.id)
        ) {
          // Check if row has at least one non-empty value
          const hasData = Object.values(row.data).some(
            (val) => val !== "" && val !== null && val !== undefined
          );

          if (hasData) {
            // Trigger calculation after a short delay to avoid race conditions
            setTimeout(() => {
              triggerRowCalculation(row.id, row.data);
            }, AUTO_TRIGGER_DELAY_MS);
          }
        }
      });
    }
  }, [formula, rows, triggerRowCalculation]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const timers = debounceTimersRef.current;
    return () => {
      timers.forEach((timerId) => {
        clearTimeout(timerId);
      });
      timers.clear();
    };
  }, []);

  return {
    handleCellUpdate,
    executeAllRows,
  };
}
