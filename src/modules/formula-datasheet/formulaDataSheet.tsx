import React, { useMemo } from "react";
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

  // Flatten formula inputs for column generation
  const flattenedPaths = useMemo(() => {
    if (!formula) return [];
    return flattenFormulaInputs(formula.inputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formula?.id]);

  // Note: Removed auto-clear logic on formula change
  // In multi-tab mode, switching between tabs should preserve each tab's data
  // Results are only cleared when:
  // 1. User explicitly clears them
  // 2. Tab is closed (handled by tab management)
  // 3. Formula definition itself changes (not implemented yet)

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
