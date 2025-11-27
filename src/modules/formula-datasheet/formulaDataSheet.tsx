import React, { useMemo, useEffect, useRef } from "react";
import { flattenFormulaInputs } from "@/utils/formulaTableUtils";
import { NoFormulaState } from "./components/EmptyState";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import Spreadsheet from "@/pages/datasheet/components/spreadsheet/Spreadsheet";
import { usePreArgsCheckStore } from "@/store/preArgsCheckStore";

interface FormulaDataSheetProps {
  className?: string;
}

/**
 * FormulaDataSheet Component
 * Displays formula parameters in an editable table with automatic calculation
 *
 * Note: currentFormula is now managed by spreadsheetStore and should be set
 * by parent components via setCurrentFormula()
 *
 * Row structure is managed by GridStore in Spreadsheet component.
 * Calculation results are stored in SpreadsheetStore as a map {rowId: result}.
 */
export const FormulaDataSheet: React.FC<FormulaDataSheetProps> = ({
  className = "",
}) => {
  // Get formula from store (set by parent components)
  const formula = useSpreadsheetStore((state) => state.currentFormula);
  const clearTabResults = useSpreadsheetStore((state) => state.clearTabResults);
  const clearPreArgsCheckMessages = usePreArgsCheckStore(
    (state) => state.clearPreArgsCheckMessages
  );

  // Flatten formula inputs for column generation
  const flattenedPaths = useMemo(() => {
    if (!formula) return [];
    return flattenFormulaInputs(formula.inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula?.id]);

  // Track the previous formula ID to detect formula changes
  const previousFormulaIdRef = useRef<string | undefined>(undefined);

  // Clear calculation results when formula changes
  useEffect(() => {
    const formulaChanged = previousFormulaIdRef.current !== formula?.id;
    previousFormulaIdRef.current = formula?.id;

    if (formula && formulaChanged) {
      // Clear only this tab's calculation results and validation messages when formula changes
      clearTabResults(formula.id);
      clearPreArgsCheckMessages(formula.id);
      console.log(
        `🔄 Formula changed to ${formula.id}, cleared its calculation results and validation messages`
      );
    }
  }, [formula, clearTabResults, clearPreArgsCheckMessages]);

  if (!formula) {
    return <NoFormulaState className={className} />;
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden">
        {/* Key prop forces Spreadsheet to remount when formula changes,
            ensuring complete per-tab isolation */}
        <Spreadsheet key={formula.id} flattenedPaths={flattenedPaths} />
      </div>
    </div>
  );
};
