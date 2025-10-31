import { Card } from "../../../../components/common/Card";
import { Button } from "../../../../components/common/Button";
import { useFormulaStore } from "../../../../store/formulaStore";
import {
  Code2,
  Download,
  SquareFunction,
  FilePlus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SourceCodeDialog } from "../SourceCodeDialog";

interface FormulasPanelProps {
  sourceCodeDialogOpen: boolean;
  setSourceCodeDialogOpen: (open: boolean) => void;
}

export function FormulasPanel({
  sourceCodeDialogOpen,
  setSourceCodeDialogOpen,
}: FormulasPanelProps) {
  const { formulaDefinitions, selectedFormulaId, selectFormula } =
    useFormulaStore();

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
                  <FilePlus strokeWidth={1.5} size={18} />
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
            formulaDefinitions.map((formula) => {
              // Determine the creation type icon
              const CreationIcon =
                formula.creationType === "parsed"
                  ? Code2
                  : formula.creationType === "imported"
                  ? Download
                  : SquareFunction;

              const creationTooltip =
                formula.creationType === "parsed"
                  ? "开发者模式解析"
                  : formula.creationType === "imported"
                  ? "从GitHub导入"
                  : "内置公式";

              return (
                <button
                  key={formula.id}
                  onClick={() => selectFormula(formula.id)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors ${
                    selectedFormulaId === formula.id
                      ? "bg-blue-100 text-blue-900 "
                      : " hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`shrink-0 ${
                              formula.creationType === "parsed"
                                ? "text-purple-600"
                                : formula.creationType === "imported"
                                ? "text-blue-600"
                                : "text-gray-600"
                            }`}
                          >
                            <CreationIcon strokeWidth={1.5} size={16} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {creationTooltip}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="truncate">{formula.name}</div>
                  </div>

                  <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                    {formula.tags?.join(", ")}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* Source Code Dialog */}
      <SourceCodeDialog
        open={sourceCodeDialogOpen}
        onOpenChange={setSourceCodeDialogOpen}
      />
    </>
  );
}