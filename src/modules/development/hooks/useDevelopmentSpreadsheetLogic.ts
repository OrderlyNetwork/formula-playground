import React, { useEffect, useCallback, useRef } from "react";
import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import type { ColumnDef, RowDef } from "@/types/spreadsheet";
import { GridStore } from "@/store/spreadsheet";
import { generateColumnsFromFormula } from "@/pages/datasheet/components/spreadsheet/spreadsheetUtils";
import { compiledFunctionCache } from "@/modules/development/compiledFunctionCache";
import DevelopmentResultCell from "@/modules/development/components/DevelopmentResultCell";
import { dataSheetCalculator } from "@/modules/formula-datasheet/services/dataSheetCalculator";

/**
 * Minimum number of rows to display in development spreadsheet
 */
const MIN_ROWS = 50;

interface UseDevelopmentSpreadsheetLogicParams {
  formula: FormulaDefinition | null;
  flattenedPaths: FlattenedPath[];
  setColumns: (columns: ColumnDef[]) => void;
  setRows: (rows: RowDef[]) => void;
  setColumnsReady: (ready: boolean) => void;
  setGridStore: (store: GridStore | null) => void;
}

/**
 * Hook to manage spreadsheet initialization and calculation logic for development mode
 *
 * This hook is independent from playground/datasheet stores and manages its own
 * GridStore instance for isolated testing.
 */
export const useDevelopmentSpreadsheetLogic = ({
  formula,
  flattenedPaths,
  setColumns,
  setRows,
  setColumnsReady,
  setGridStore,
}: UseDevelopmentSpreadsheetLogicParams) => {
  // Local GridStore instance for this development session
  const gridStoreRef = useRef<GridStore | null>(null);
  const lastFormulaIdRef = useRef<string | undefined>(undefined);

  /**
   * Generate row definitions with minimum row count
   */
  const generateRows = useCallback(
    (count: number, formulaId?: string): RowDef[] => {
      const rows: RowDef[] = [];
      const baseId = formulaId || "dev_row";
      const targetCount = Math.max(count, MIN_ROWS);

      for (let i = 0; i < targetCount; i++) {
        rows.push({ id: `${baseId}_${i}` });
      }
      return rows;
    },
    []
  );

  /**
   * Handle row calculation when cell changes
   * Uses pre-compiled function from cache (compiled during Parse)
   */
  const handleCalculateRow = useCallback(
    async (rowId: string, colId: string) => {
      // Only execute if we have a formula and grid store
      if (!formula || !gridStoreRef.current) {
        console.log(
          `[Dev Mode] Skipping calculation - no formula or grid store`
        );
        return;
      }

      console.log(
        `[Dev Mode] Cell changed: row=${rowId}, col=${colId}, executing formula...`
      );

      const startTime = performance.now();

      try {
        // Get pre-compiled function from cache
        const compiledFunc = compiledFunctionCache.get(formula.id);

        if (!compiledFunc) {
          const errorMsg = `Formula ${formula.id} not compiled. Please click Parse button first.`;
          console.error(`[Dev Mode] ❌`, errorMsg);
          gridStoreRef.current.setValue(
            rowId,
            "result",
            `Error: ${errorMsg}`,
            true
          );
          return;
        }

        // Build inputs object from current row values
        const inputs: Record<string, FormulaScalar> = {};
        for (const input of formula.inputs) {
          const cellValue = gridStoreRef.current.getValue(rowId, input.key);

          // Parse the value based on input type
          if (input.type === "number") {
            // Convert to number, handle empty strings and null
            const stringValue = cellValue?.toString() || "";
            if (stringValue === "") {
              inputs[input.key] = null;
            } else {
              const parsed = parseFloat(stringValue);
              inputs[input.key] = isNaN(parsed) ? null : parsed;
            }
          } else if (input.type === "boolean") {
            // Convert to boolean
            const stringValue = String(cellValue);
            if (stringValue === "" || stringValue === "null" || stringValue === "undefined") {
              inputs[input.key] = null;
            } else {
              inputs[input.key] = stringValue === "true" || stringValue === "1";
            }
          } else if (input.type === "object") {
            // Try to parse as JSON for object types
            try {
              inputs[input.key] =
                typeof cellValue === "string"
                  ? JSON.parse(cellValue)
                  : cellValue;
            } catch {
              inputs[input.key] = cellValue === "" || cellValue === null ? null : cellValue;
            }
          } else {
            // String or other types - use as-is (convert null and empty string to null)
            inputs[input.key] = cellValue === "" || cellValue === null ? null : cellValue;
          }
        }

        console.log(`[Dev Mode] Built inputs:`, inputs);

        // Validate parameters before calculation
        const isValid = dataSheetCalculator.preArgsCheck(formula, inputs);
        
        if (!isValid) {
          console.log(`[Dev Mode] ⚠️ Parameter validation failed - skipping calculation`);
          // Clear result when validation fails
          gridStoreRef.current.setValue(rowId, "result", "", true);
          gridStoreRef.current.setValue(rowId, "executionTime", "", true);
          return;
        }

        console.log(`[Dev Mode] ✅ Parameter validation passed, executing...`);

        // Convert inputs to array of arguments in the correct order
        const args = formula.inputs.map((input) => inputs[input.key]);

        // Execute the pre-compiled function
        let result = compiledFunc(...args);

        // Handle async functions
        if (result instanceof Promise) {
          result = await result;
        }

        const durationMs = performance.now() - startTime;

        console.log(
          `[Dev Mode] ✅ Execution successful: ${result} (${durationMs.toFixed(
            2
          )}ms)`
        );

        // Update the result column with the output
        gridStoreRef.current.setValue(rowId, "result", String(result), true);

        // Also store execution metadata
        gridStoreRef.current.setValue(
          rowId,
          "executionTime",
          `${durationMs.toFixed(2)}ms`,
          true
        );
      } catch (error) {
        const durationMs = performance.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[Dev Mode] ❌ Execution failed (${durationMs.toFixed(2)}ms):`,
          errorMsg
        );

        // Write error to result column
        gridStoreRef.current.setValue(
          rowId,
          "result",
          `Error: ${errorMsg}`,
          true
        );
      }
    },
    [formula]
  );

  /**
   * Initialize GridStore and columns when formula changes
   */
  useEffect(() => {
    if (!formula) {
      // Clear state if no formula
      gridStoreRef.current = null;
      setGridStore(null);
      setColumns([]);
      setRows([]);
      setColumnsReady(false);
      lastFormulaIdRef.current = undefined;
      return;
    }

    const formulaId = formula.id;

    // Check if this is a new formula
    if (lastFormulaIdRef.current === formulaId) {
      return; // Already initialized for this formula
    }

    console.log(
      `[Dev Mode] Initializing spreadsheet for formula: ${formulaId}`
    );

    // Generate columns from formula structure
    const initialColumns =
      flattenedPaths.length > 0
        ? generateColumnsFromFormula(
            flattenedPaths,
            // Custom ResultCell renderer for development mode
            (rowId, column, store) =>
              React.createElement(DevelopmentResultCell, {
                rowId,
                column,
                store,
              })
          )
        : [];

    // Generate initial rows
    const initialRows = generateRows(0, formulaId);

    // Create new GridStore instance for this development session
    const gridStore = new GridStore(
      initialRows,
      initialColumns,
      handleCalculateRow
    );

    // Update refs and state
    gridStoreRef.current = gridStore;
    setGridStore(gridStore);
    setColumns(initialColumns);
    setRows(initialRows);
    setColumnsReady(flattenedPaths.length > 0);
    lastFormulaIdRef.current = formulaId;

    // Set index column values
    initialRows.forEach((row, index) => {
      gridStore.setValue(row.id, "index", String(index + 1), true);
    });

    console.log(
      `[Dev Mode] ✅ Spreadsheet initialized with ${initialColumns.length} columns and ${initialRows.length} rows`
    );
  }, [
    formula,
    flattenedPaths,
    generateRows,
    handleCalculateRow,
    setColumns,
    setRows,
    setColumnsReady,
    setGridStore,
  ]);

  /**
   * Update columns when flattenedPaths changes
   */
  useEffect(() => {
    if (!formula || !gridStoreRef.current) return;

    if (flattenedPaths.length > 0) {
      const newColumns = generateColumnsFromFormula(
        flattenedPaths,
        // Custom ResultCell renderer for development mode
        (rowId, column, store) =>
          React.createElement(DevelopmentResultCell, {
            rowId,
            column,
            store,
          })
      );
      setColumns(newColumns);
      setColumnsReady(true);
    }
  }, [flattenedPaths, formula, setColumns, setColumnsReady]);

  /**
   * Sync GridStore structure when columns or rows change
   */
  useEffect(() => {
    if (gridStoreRef.current) {
      // GridStore will handle structure updates internally
      console.log("[Dev Mode] Structure sync may be needed");
    }
  }, []);

  return {
    gridStore: gridStoreRef.current,
    handleCalculateRow,
  };
};
