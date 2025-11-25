import React, { useMemo } from "react";
import type { FormulaDefinition } from "@/types/formula";
import { flattenFormulaInputs } from "@/utils/formulaTableUtils";
import { NoFormulaState, NoRowsState } from "./components/EmptyState";
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
  // Memoize flattenedPaths based on formula ID to prevent unnecessary recalculation
  const flattenedPaths = useMemo(() => {
    if (!formula) return [];
    return flattenFormulaInputs(formula.inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula?.id]);

  // Custom hooks for managing different concerns
  const { getStableRowId } = useStableRowIds();

  const { rows, setRows, rowsRef } = useDataSheetRows({
    formula,
    getStableRowId,
  });

  useAutoCalculation({
    formula,
    rows,
    rowsRef,
    setRows,
  });

  useDataSheetMetrics({ formula, rows });

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
        {rowsBelongToCurrentFormula ? (
          <Spreadsheet rows={rows} flattenedPaths={flattenedPaths} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading...
          </div>
        )}
      </div>

      {/* Empty state */}
      {rowsBelongToCurrentFormula && rows.length === 0 && <NoRowsState />}
    </div>
  );
};
