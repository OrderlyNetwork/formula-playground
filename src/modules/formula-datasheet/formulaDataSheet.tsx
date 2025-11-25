import React, { useMemo, useEffect, useRef } from "react";
import { flattenFormulaInputs } from "@/utils/formulaTableUtils";
import { NoFormulaState } from "./components/EmptyState";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import Spreadsheet from "@/pages/datasheet/components/spreadsheet/Spreadsheet";

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
  const reset = useSpreadsheetStore((state) => state.reset);
  const clearAllResults = useSpreadsheetStore((state) => state.clearAllResults);

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
      // Clear previous calculation results when formula changes
      clearAllResults();
      console.log("🔄 Formula changed, cleared calculation results");
    } else if (!formula) {
      reset();
    }
  }, [formula, clearAllResults, reset]);

  if (!formula) {
    return <NoFormulaState className={className} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Spreadsheet flattenedPaths={flattenedPaths} />
      </div>
    </div>
  );
};
