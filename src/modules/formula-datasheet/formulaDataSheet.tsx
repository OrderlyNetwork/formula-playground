import React, { useMemo, useEffect, useRef } from "react";
import type { FormulaDefinition } from "@/types/formula";
import {
  flattenFormulaInputs,
  createInitialRow,
} from "@/utils/formulaTableUtils";
import { NoFormulaState, NoRowsState } from "./components/EmptyState";
import { useStableRowIds } from "./hooks/useStableRowIds";
import { useDataSheetMetrics } from "./hooks/useDataSheetMetrics";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import { dataSheetStateTracker } from "./services/dataSheetStateTracker";
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
  const flattenedPaths = useMemo(() => {
    if (!formula) return [];
    return flattenFormulaInputs(formula.inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula?.id]);

  const { getStableRowId } = useStableRowIds();

  const rows = useSpreadsheetStore((state) => state.rows);
  const setFormulaAndRows = useSpreadsheetStore(
    (state) => state.setFormulaAndRows
  );
  const reset = useSpreadsheetStore((state) => state.reset);

  // Track the previous formula ID to detect formula changes
  const previousFormulaIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const formulaChanged = previousFormulaIdRef.current !== formula?.id;
    previousFormulaIdRef.current = formula?.id;

    if (formula && formulaChanged) {
      const stableRowId = getStableRowId(formula.id, 0);

      // Always create a default empty row when formula changes
      const defaultRow = {
        ...createInitialRow(formula, 0),
        id: stableRowId,
      };

      // Set formula and rows together (store will automatically pad to min 50 rows)
      setFormulaAndRows(formula, [defaultRow]);

      // Record initial state (only the first meaningful row)
      dataSheetStateTracker.recordRowStates(formula.id, [defaultRow]);
    } else if (!formula) {
      reset();
    }
  }, [formula, getStableRowId, setFormulaAndRows, reset]);

  useDataSheetMetrics({ formula, rows });

  if (!formula) {
    return <NoFormulaState className={className} />;
  }

  // Check if rows belong to current formula
  // This prevents showing stale data during formula switches
  const rowsBelongToCurrentFormula =
    rows.length === 0 || rows[0]?.id.includes(formula.id);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        {rowsBelongToCurrentFormula ? (
          <Spreadsheet flattenedPaths={flattenedPaths} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading...
          </div>
        )}
      </div>

      {rowsBelongToCurrentFormula && rows.length === 0 && <NoRowsState />}
    </div>
  );
};
