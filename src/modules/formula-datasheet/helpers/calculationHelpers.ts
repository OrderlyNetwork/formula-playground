import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import type { TableRow } from "@/utils/formulaTableUtils";
import { dataSheetCalculator } from "../services/dataSheetCalculator";
import { dataSheetStateTracker } from "../services/dataSheetStateTracker";
import { reconstructFormulaInputs } from "@/utils/formulaTableUtils";

/**
 * Result of performing a row calculation
 */
export interface CalculationResult {
  success: boolean;
  result?: FormulaScalar;
  executionTime?: number;
  error?: string;
}

/**
 * Core calculation logic - handles both auto and manual triggers
 * This function encapsulates the common calculation flow including:
 * - Reconstructing inputs from row data
 * - Executing the formula calculation
 * - Recording calculation events in state tracker
 * - Error handling and logging
 *
 * @param rowId - The row identifier to calculate
 * @param rowData - Current row data (flattened format)
 * @param formula - Formula definition to execute
 * @param trigger - What triggered this calculation ('auto' | 'cell-update' | 'manual')
 * @returns Calculation result with success status, result value, execution time, and error (if any)
 */
export const performRowCalculation = async (
  rowId: string,
  rowData: Record<string, FormulaScalar>,
  formula: FormulaDefinition,
  trigger: "auto" | "cell-update" | "manual"
): Promise<CalculationResult> => {
  const calcStartTime = Date.now();
  const inputs = reconstructFormulaInputs(rowData, formula);

  try {
    const calcResult = await dataSheetCalculator.calculateRow(formula, inputs);

    // Record calculation event
    dataSheetStateTracker.recordCalculation(formula.id, {
      timestamp: calcStartTime,
      rowId,
      formulaId: formula.id,
      inputs,
      success: calcResult.success,
      result: calcResult.result,
      executionTime: calcResult.executionTime,
      error: calcResult.error,
      trigger,
    });

    return {
      success: calcResult.success,
      result: calcResult.result,
      executionTime: calcResult.executionTime,
      error: calcResult.error,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Calculation failed";

    // Record calculation error
    dataSheetStateTracker.recordCalculation(formula.id, {
      timestamp: calcStartTime,
      rowId,
      formulaId: formula.id,
      inputs,
      success: false,
      error: errorMessage,
      trigger,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Type for row update function
 */
export type RowUpdater = (updater: (rows: TableRow[]) => TableRow[]) => void;

/**
 * Updates a specific row with calculation results
 * This helper function provides a consistent way to update row state
 * with calculation results across different triggers
 *
 * @param setRows - React state setter function for rows
 * @param rowId - The row identifier to update
 * @param result - Calculation result to apply to the row
 */
export const updateRowWithResult = (
  setRows: RowUpdater,
  rowId: string,
  result: CalculationResult
): void => {
  setRows((currentRows) =>
    currentRows.map((r) => {
      if (r.id === rowId) {
        const updated = {
          ...r,
          _result: result.result,
          _executionTime: result.executionTime,
          _error: result.error,
        };
        return updated;
      }
      return r;
    })
  );
};

/**
 * Updates a specific row's data field
 * This is a utility function to safely update row data
 *
 * @param setRows - React state setter function for rows
 * @param rowId - The row identifier to update
 * @param updates - Partial updates to apply to the row
 */
export const updateRowData = (
  setRows: RowUpdater,
  rowId: string,
  updates: Partial<Omit<TableRow, "id">>
): void => {
  setRows((prevRows) =>
    prevRows.map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          ...updates,
        };
      }
      return row;
    })
  );
};
