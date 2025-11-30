import React, { useMemo } from "react";
import { flattenFormulaInputs } from "@/utils/formulaTableUtils";
import { NoFormulaState } from "./components/EmptyState";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import SpreadsheetContainer from "@/pages/datasheet/components/spreadsheet/SpreadsheetContainer";
import { ColInfo } from "@/pages/datasheet/components/colInfo";

interface FormulaDataSheetProps {
  className?: string;
}

/**
 * FormulaDataSheet component for datasheet mode
 * Uses SpreadsheetContainer to display formula data in a spreadsheet
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

  if (!formula) {
    return <NoFormulaState className={className} />;
  }

  return (
    <div className="h-full flex flex-col relative bg-gray-100">
      <div className="flex-1 overflow-hidden">
        <SpreadsheetContainer
          key={formula.id}
          flattenedPaths={flattenedPaths}
        />
      </div>
      <div className="h-[28px] bg-gray-50 border-t border-gray-200">
        <ColInfo />
      </div>
    </div>
  );
};
