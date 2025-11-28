import { useCallback } from "react";
import type { FormulaDefinition } from "@/types/formula";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { dataSheetCalculator } from "@/modules/formula-datasheet/services/dataSheetCalculator";
import { dataSheetStateTracker } from "@/modules/formula-datasheet/services/dataSheetStateTracker";
import {
  reconstructFormulaInputs,
  validateRow,
} from "@/utils/formulaTableUtils";

/**
 * Hook to manage spreadsheet calculation logic
 */
export const useSpreadsheetCalculation = (
  currentFormula: FormulaDefinition | null,
  formulaId: string
) => {
  const setTabRowResult = useSpreadsheetStore((state) => state.setTabRowResult);

  /**
   * Handle row calculation when cell changes
   * Callback passed to GridStore to trigger formula execution
   * Gets all data directly from GridStore (single source of truth for input data)
   */
  const handleCalculateRow = useCallback(
    async (rowId: string, colId: string) => {
      // Guard: Check if formula exists
      if (!currentFormula) {
        console.warn("No formula available for calculation");
        return;
      }

      // Get GridStore for current tab
      const gridStore = useSpreadsheetStore
        .getState()
        .getTabGridStore(formulaId);

      // Guard: Check if GridStore exists
      if (!gridStore) {
        console.warn("GridStore not initialized");
        return;
      }

      // Guard: Check if row exists in GridStore
      if (!gridStore.hasRow(rowId)) {
        console.warn(`Row ${rowId} not found in GridStore`);
        return;
      }

      const calcStartTime = Date.now();

      try {
        // Read current data directly from GridStore (the single source of truth for input data)
        // This method automatically filters to only editable columns
        const currentRowData = gridStore.getRowData(rowId);

        // Validate the row data
        const validation = validateRow(
          { id: rowId, data: currentRowData },
          currentFormula
        );

        // Only calculate if row is valid
        if (!validation.isValid) {
          console.log(
            `Row ${rowId} validation failed:`,
            validation.errors.join(", ")
          );
          // Update calculation result with validation error (using per-tab store)
          setTabRowResult(formulaId, rowId, {
            isValid: false,
            error: validation.errors.join(", "),
            result: undefined,
          });
          return;
        }

        // Reconstruct formula inputs for tracking
        const inputs = reconstructFormulaInputs(currentRowData, currentFormula);

        console.log("inputs", inputs, currentRowData);

        if (!dataSheetCalculator.preArgsCheck(currentFormula, inputs)) {
          return;
        }

        // Execute formula calculation with fresh data from GridStore
        // calculateRow now handles preArgsCheck internally
        const result = await dataSheetCalculator.calculateRow(
          currentFormula,
          inputs
        );

        // Update calculation result in SpreadsheetStore (per-tab: formulaId -> rowId -> result)
        // Note: Input data is in GridStore, Zustand store only stores calculation results
        setTabRowResult(formulaId, rowId, {
          isValid: true,
          result: result.result,
          executionTime: result.executionTime,
          error: result.error,
        });

        // Record calculation event for debugging
        dataSheetStateTracker.recordCalculation(currentFormula.id, {
          timestamp: calcStartTime,
          rowId,
          formulaId: currentFormula.id,
          inputs,
          success: result.success,
          result: result.result,
          executionTime: result.executionTime,
          error: result.error,
          trigger: "cell-update",
        });

        console.log(
          `✓ Calculated row ${rowId} (triggered by ${colId}):`,
          result
        );
      } catch (error) {
        console.error(`Error calculating row ${rowId}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Update calculation result with error
        setTabRowResult(formulaId, rowId, {
          isValid: false,
          error: errorMessage,
        });

        // Record failed calculation
        // Get row data from GridStore for tracking
        const gridStore = useSpreadsheetStore
          .getState()
          .getTabGridStore(formulaId);
        if (gridStore) {
          const rowData = gridStore.getRowData(rowId);
          const inputs = reconstructFormulaInputs(rowData, currentFormula);
          dataSheetStateTracker.recordCalculation(currentFormula.id, {
            timestamp: calcStartTime,
            rowId,
            formulaId: currentFormula.id,
            inputs,
            success: false,
            error: errorMessage,
            trigger: "cell-update",
          });
        }
      }
    },
    [currentFormula, formulaId, setTabRowResult]
  );

  return { handleCalculateRow };
};
