/**
 * Hook for managing data sheet rows state and operations
 * Handles row CRUD operations, validation, and formula store synchronization
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useFormulaStore } from "@/store/formulaStore";
import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import {
  createInitialRow,
  validateRow,
  reconstructFormulaInputs,
} from "@/utils/formulaTableUtils";
import type { TableRow } from "../types";
import { dataSheetStateTracker } from "../services/dataSheetStateTracker";

/**
 * Internal fields on TableRow that should not be treated as data
 */
const INTERNAL_ROW_FIELDS = new Set([
  "id",
  "_result",
  "_executionTime",
  "_error",
  "_isValid",
]);

/**
 * Extract data fields from a TableRow (exclude internal fields)
 */
function extractRowData(row: TableRow): Record<string, FormulaScalar> {
  const data: Record<string, FormulaScalar> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!INTERNAL_ROW_FIELDS.has(key) && value !== undefined) {
      data[key] = value as FormulaScalar;
    }
  }
  return data;
}

/**
 * Merge data fields into a row (preserving internal fields)
 */
function mergeDataIntoRow(
  row: TableRow,
  data: Record<string, FormulaScalar>
): TableRow {
  // Start with internal fields from original row
  const result: TableRow = {
    id: row.id,
    _result: row._result,
    _executionTime: row._executionTime,
    _error: row._error,
    _isValid: row._isValid,
  };
  // Add data fields
  for (const [key, value] of Object.entries(data)) {
    result[key] = value;
  }
  return result;
}

interface UseDataSheetRowsOptions {
  formula?: FormulaDefinition;
  getStableRowId: (formulaId: string, rowIndex: number) => string;
}

/**
 * Custom hook to manage rows data, validation, and CRUD operations
 */
export function useDataSheetRows({
  formula,
  getStableRowId,
}: UseDataSheetRowsOptions) {
  const currentInputs = useFormulaStore((state) => state.currentInputs);
  const updateInputAt = useFormulaStore((state) => state.updateInputAt);
  const tsResult = useFormulaStore((state) => state.tsResult);
  const error = useFormulaStore((state) => state.error);

  const [rows, setRows] = useState<TableRow[]>([]);

  // Keep a ref to the latest rows state for accessing in async callbacks
  const rowsRef = useRef<TableRow[]>(rows);
  rowsRef.current = rows;

  // Track the previous formula ID to detect formula changes
  const previousFormulaIdRef = useRef<string | undefined>(undefined);

  // Store formula and updateInputAt in refs to avoid recreating callbacks
  const formulaRef = useRef<FormulaDefinition | undefined>(formula);
  const updateInputAtRef = useRef(updateInputAt);

  // Update refs when values change
  useEffect(() => {
    formulaRef.current = formula;
    updateInputAtRef.current = updateInputAt;
  }, [formula, updateInputAt]);

  // Initialize data when formula changes (and only when formula changes)
  useEffect(() => {
    const formulaChanged = previousFormulaIdRef.current !== formula?.id;
    previousFormulaIdRef.current = formula?.id;

    if (formula && formulaChanged) {
      // Get stable row ID for this formula's first row
      const stableRowId = getStableRowId(formula.id, 0);

      // Always create a default empty row when formula changes
      // This prevents using stale data from previous formula
      // The auto-calculation logic will handle populating results if needed
      const defaultRow = {
        ...createInitialRow(formula, 0),
        id: stableRowId,
      };
      
      setRows([defaultRow]);
      // Record initial state
      dataSheetStateTracker.recordRowStates(formula.id, [defaultRow]);
    } else if (!formula) {
      setRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula?.id, getStableRowId]); // Only depend on formula ID

  /**
   * Update a single cell value
   */
  const updateCell = useCallback(
    (rowId: string, path: string, value: FormulaScalar) => {
      const currentFormula = formulaRef.current;
      if (!currentFormula) return;

      // Get old value for tracking
      const currentRow = rowsRef.current.find((r) => r.id === rowId);
      const oldValue: FormulaScalar = currentRow?.[path] ?? "";

      // Update row data and validation state
      setRows((prevRows) => {
        const updatedRows = prevRows.map((row) => {
          if (row.id === rowId) {
            // Extract current data, update with new value
            const currentData = extractRowData(row);
            const updatedData = { ...currentData, [path]: value };
            // Merge updated data back into row for validation
            const updatedRow = mergeDataIntoRow(row, updatedData);
            const validation = validateRow(updatedRow, currentFormula);

            // Record cell update event
            dataSheetStateTracker.recordCellUpdate(currentFormula.id, {
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

            return mergeDataIntoRow(
              {
                ...row,
                _isValid: validation.isValid,
                _error: validation.isValid
                  ? undefined
                  : validation.errors.join(", "),
              },
              updatedData
            );
          }
          return row;
        });

        // Update the formula store if this is the first row
        if (prevRows[0]?.id === rowId) {
          const updatedFirstRow = updatedRows[0];
          if (updatedFirstRow) {
            const reconstructedInputs = reconstructFormulaInputs(
              extractRowData(updatedFirstRow),
              currentFormula
            );

            // Update each input individually to trigger the store's update logic
            for (const [key, val] of Object.entries(reconstructedInputs)) {
              updateInputAtRef.current(key, val);
            }
          }
        }

        return updatedRows;
      });
    },
    []
  );

  /**
   * Update entire row data (for batch updates)
   */
  const updateRowData = useCallback(
    (rowId: string, data: Record<string, FormulaScalar>) => {
      const currentFormula = formulaRef.current;
      if (!currentFormula) return;

      setRows((prevRows) =>
        prevRows.map((row) => {
          if (row.id === rowId) {
            const updatedRow = mergeDataIntoRow(row, data);
            const validation = validateRow(updatedRow, currentFormula);
            return mergeDataIntoRow(
              {
                ...row,
                _isValid: validation.isValid,
                _error: validation.isValid
                  ? undefined
                  : validation.errors.join(", "),
              },
              data
            );
          }
          return row;
        })
      );
    },
    []
  );

  /**
   * Delete a row
   */
  const deleteRow = useCallback((rowId: string) => {
    setRows((prevRows) => prevRows.filter((row) => row.id !== rowId));
  }, []);

  /**
   * Duplicate a row
   */
  const duplicateRow = useCallback(
    (rowId: string) => {
      const currentFormula = formulaRef.current;
      if (!currentFormula) return;

      setRows((prevRows) => {
        const rowToDuplicate = prevRows.find((row) => row.id === rowId);
        if (!rowToDuplicate) return prevRows;

        // Get stable row ID for the new row
        const stableRowId = getStableRowId(currentFormula.id, prevRows.length);

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
    [getStableRowId]
  );

  /**
   * Add a new empty row
   */
  const addNewRow = useCallback(() => {
    const currentFormula = formulaRef.current;
    if (!currentFormula) return;

    setRows((prev) => {
      // Get stable row ID for the new row
      const stableRowId = getStableRowId(currentFormula.id, prev.length);

      const newRow = {
        ...createInitialRow(currentFormula, prev.length),
        id: stableRowId,
      };

      return [...prev, newRow];
    });
  }, [getStableRowId]);

  return {
    rows,
    setRows,
    rowsRef,
    updateCell,
    updateRowData,
    deleteRow,
    duplicateRow,
    addNewRow,
  };
}

