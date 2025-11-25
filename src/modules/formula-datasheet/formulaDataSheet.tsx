/**
 * FormulaDataSheet Component
 * Main component for displaying and editing formula parameters in a table format
 *
 * This component has been refactored to be more maintainable:
 * - Custom hooks manage different concerns (rows, calculation, metrics)
 * - Table rendering is delegated to DataSheetTable component
 * - Main component acts as a coordinator
 */

import React, { useMemo } from "react";
import { useFormulaStore } from "@/store/formulaStore";
import type { FormulaDefinition, FormulaScalar } from "@/types/formula";
import { flattenFormulaInputs } from "@/utils/formulaTableUtils";
import { NoFormulaState, NoRowsState } from "./components/EmptyState";
import { DataSheetTable } from "./components/DataSheetTable";
import { useStableRowIds } from "./hooks/useStableRowIds";
import { useDataSheetRows } from "./hooks/useDataSheetRows";
import { useAutoCalculation } from "./hooks/useAutoCalculation";
import { useDataSheetMetrics } from "./hooks/useDataSheetMetrics";
import Spreadsheet from "@/pages/datasheet/components/spreadsheet/Spreadsheet";

interface FormulaDataSheetProps {
  formula?: FormulaDefinition;
  className?: string;
}

/**
 * FormulaDataSheet Component
 * Displays formula parameters in an editable table with automatic calculation
 */
export const FormulaDataSheet: React.FC<FormulaDataSheetProps> = ({
  formula,
  className = "",
}) => {
  const loading = useFormulaStore((state) => state.loading);

  // Memoize flattenedPaths based on formula ID to prevent unnecessary recalculation
  const flattenedPaths = useMemo(() => {
    if (!formula) return [];
    return flattenFormulaInputs(formula.inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula?.id]);

  // Custom hooks for managing different concerns
  const { getStableRowId } = useStableRowIds();

  const {
    rows,
    setRows,
    rowsRef,
    updateCell,
    updateRowData,
    deleteRow,
    duplicateRow,
    addNewRow,
  } = useDataSheetRows({ formula, getStableRowId });

  const { handleCellUpdate, executeAllRows } = useAutoCalculation({
    formula,
    rows,
    rowsRef,
    setRows,
  });

  useDataSheetMetrics({ formula, rows });

  // Combine updateCell with handleCellUpdate for auto-calculation
  const onCellUpdate = React.useCallback(
    (rowId: string, path: string, value: FormulaScalar) => {
      updateCell(rowId, path, value);
      handleCellUpdate(rowId, path, value);
    },
    [updateCell, handleCellUpdate]
  );

  // Render empty state if no formula selected
  if (!formula) {
    return <NoFormulaState className={className} />;
  }

  // Check if rows belong to current formula
  // This prevents showing stale data during formula switches
  const rowsBelongToCurrentFormula =
    rows.length === 0 || rows[0]?.id.includes(formula.id);

  return (
    <div className="h-full flex flex-col">
      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <Spreadsheet />
        {/* {rowsBelongToCurrentFormula ? (
          <DataSheetTable
            rows={rows}
            flattenedPaths={flattenedPaths}
            loading={loading}
            onCellUpdate={onCellUpdate}
            onUpdateRowData={updateRowData}
            onDeleteRow={deleteRow}
            onDuplicateRow={duplicateRow}
            onAddNewRow={addNewRow}
            onExecuteAllRows={executeAllRows}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading...
          </div>
        )} */}
      </div>

      {/* Empty state */}
      {rowsBelongToCurrentFormula && rows.length === 0 && <NoRowsState />}
    </div>
  );
};
