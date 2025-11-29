import React from "react";
import {
  BetweenHorizontalStart,
  BetweenVerticalStart,
  Camera,
  ListX,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import type { FlattenedPath } from "@/utils/formulaTableUtils";
import { Button } from "@/components/ui/button";
import { useFormulaLogStore } from "@/store/formulaLogStore";

/**
 * Selection type used in the toolbar
 */
type Selection =
  | { type: "row"; id: string }
  | { type: "column"; id: string }
  | null;

/**
 * Props for SpreadsheetToolbar component
 */
interface SpreadsheetToolbarProps {
  selection: Selection;
  flattenedPaths?: FlattenedPath[];
  onAddRow: () => void;
  onAddColumn: () => void;
  onClearDataSheet: () => void;
}

/**
 * Toolbar component for spreadsheet with add row/column buttons
 */
const SpreadsheetToolbar: React.FC<SpreadsheetToolbarProps> = ({
  selection,
  flattenedPaths,
  onAddRow,
  onAddColumn,
  onClearDataSheet,
}) => {
  const togglePanel = useFormulaLogStore((state) => state.togglePanel);
  const isLogPanelOpen = useFormulaLogStore((state) => state.isOpen);

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50">
      <div className="flex flex-1">
        <Button
          onClick={onAddRow}
          variant="ghost"
          size="icon"
          className="p-1 w-7 h-7"
          title={
            selection?.type === "row"
              ? "Add Row After Selected"
              : "Add Row at Bottom"
          }
        >
          <BetweenHorizontalStart size={20} />
          {/* <ArrowDown size={14} className="text-blue-600" />
        <span>Add Row {selection?.type === "row" ? "(Insert)" : ""}</span> */}
        </Button>
        <Button
          onClick={onAddColumn}
          variant="ghost"
          size="icon"
          className="p-1 w-7 h-7"
          title={
            flattenedPaths && flattenedPaths.length > 0
              ? "Columns are defined by formula inputs"
              : selection?.type === "column"
              ? "Add Column After Selected"
              : "Add Column at End"
          }
        >
          <BetweenVerticalStart size={20} />
          {/* <ArrowRight size={14} className="text-green-600" />
        <span>Add Column {selection?.type === "column" ? "(Insert)" : ""}</span> */}
        </Button>
        <div className="h-6 w-px bg-gray-300 mx-2"></div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="p-1 w-7 h-7"
            onClick={onClearDataSheet}
            title="Clear all data in current spreadsheet"
          >
            <ListX size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="p-1 w-7 h-7"
            title="Take a screenshot of the current spreadsheet"
          >
            <Camera size={20} />
          </Button>
        </div>
      </div>
      <div>
        <Button
          variant={"ghost"}
          size="icon"
          className="w-7 h-7"
          onClick={togglePanel}
          title="Toggle Execution Logs"
        >
          {isLogPanelOpen ? (
            <PanelRightClose size={20} />
          ) : (
            <PanelRightOpen size={20} />
          )}

          {/* <Logs size={20} className={isLogPanelOpen ? "text-purple-600" : ""} /> */}
          {/* <BetweenVerticalStart size={20} className="rotate-90" /> */}
        </Button>
      </div>
    </div>
  );
};

export default SpreadsheetToolbar;
