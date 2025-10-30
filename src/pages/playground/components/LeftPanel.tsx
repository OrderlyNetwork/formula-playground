import { useState } from "react";
import { Card } from "../../../components/common/Card";
import { Button } from "../../../components/common/Button";
import { useFormulaStore } from "../../../store/formulaStore";
import { formatTimestamp } from "../../../lib/utils";
import { FileDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SourceCodeDialog } from "./SourceCodeDialog";

export function LeftPanel() {
  const {
    formulaDefinitions,
    selectedFormulaId,
    selectFormula,
    runHistory,
    replayHistoryRecord,
    clearHistory,
  } = useFormulaStore();

  // State for source code dialog
  const [sourceCodeDialogOpen, setSourceCodeDialogOpen] = useState(false);

  /**
   * Open source code dialog for managing GitHub imports and jsDelivr execution
   * GitHub source is for metadata and visualization only
   * Execution code should be configured separately via jsDelivr
   */
  const handleImport = () => {
    setSourceCodeDialogOpen(true);
  };

  return (
    <>
      {/* Source Code Dialog */}
      <SourceCodeDialog
        open={sourceCodeDialogOpen}
        onOpenChange={setSourceCodeDialogOpen}
      />

      <div className=" bg-gray-50 overflow-y-auto">
        {/* Reduce vertical spacing between cards for a denser left rail */}
        <div className="space-y-3">
          {/* Formula List */}
          <Card
            title="Formulas"
            headerRight={
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="从github导入"
                      title="从github导入"
                      className="h-8 w-8 p-0"
                      onClick={handleImport}
                    >
                      <FileDown strokeWidth={1.5} size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>从github导入</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            }
          >
            <div>
              {formulaDefinitions.length === 0 ? (
                <p className="text-xs text-gray-500">No formulas loaded</p>
              ) : (
                formulaDefinitions.map((formula) => (
                  <button
                    key={formula.id}
                    onClick={() => selectFormula(formula.id)}
                    // Shrink list item paddings and font sizes to fit more formulas
                    className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors ${
                      selectedFormulaId === formula.id
                        ? "bg-blue-100 text-blue-900 "
                        : "bg-white hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <div className=" truncate">{formula.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {formula.tags?.join(", ")}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* History */}
          <Card title="History">
            {/* History list tightened spacing and font sizes */}
            <div className="space-y-1.5">
              {runHistory.length === 0 ? (
                <p className="text-xs text-gray-500">No execution history</p>
              ) : (
                <>
                  <div className="flex justify-end mb-1.5">
                    <Button variant="ghost" size="sm" onClick={clearHistory}>
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {runHistory.slice(0, 20).map((record) => (
                      <button
                        key={record.id}
                        onClick={() => replayHistoryRecord(record.id)}
                        className="w-full text-left px-2.5 py-1.5 rounded-md text-xs bg-white hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <span className=" text-gray-900">
                            {record.engine.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {record.durationMs.toFixed(2)}ms
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 mt-1">
                          {formatTimestamp(record.timestamp)}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
