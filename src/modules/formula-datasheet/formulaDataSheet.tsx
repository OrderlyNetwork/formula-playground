import React, { useMemo, useState, useCallback } from "react";
import { flattenFormulaInputs } from "@/utils/formulaTableUtils";
import { NoFormulaState } from "./components/EmptyState";
import { useSpreadsheetStore } from "@/store/spreadsheetStore";
import SpreadsheetContainer from "@/pages/datasheet/components/spreadsheet/SpreadsheetContainer";
import { ColInfo } from "@/pages/datasheet/components/colInfo";
import { useSpreadsheetUrlSync, type DataConflictInfo } from "@/hooks/useSpreadsheetUrlSync";
import { DataConflictDialog, type ConflictResolution } from "@/components/DataConflictDialog";

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

  // Conflict resolution state
  const [conflictInfo, setConflictInfo] = useState<DataConflictInfo | null>(null);
  const [conflictResolver, setConflictResolver] = useState<((resolution: ConflictResolution) => void) | null>(null);

  // Handle data conflicts
  const handleConflict = useCallback((info: DataConflictInfo): Promise<"merge" | "replace-url" | "replace-db" | "cancel"> => {
    return new Promise((resolve) => {
      setConflictInfo(info);
      setConflictResolver(() => (resolution: ConflictResolution) => {
        setConflictInfo(null);
        setConflictResolver(null);
        resolve(resolution);
      });
    });
  }, []);

  // Sync spreadsheet data with URL parameters
  useSpreadsheetUrlSync(formula?.id || "", handleConflict);

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
    <>
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

      {/* Data conflict resolution dialog */}
      {conflictInfo && conflictResolver && (
        <DataConflictDialog
          open={true}
          onResolve={conflictResolver}
          urlDataCount={conflictInfo.urlDataCount}
          dbDataCount={conflictInfo.dbDataCount}
        />
      )}
    </>
  );
};
