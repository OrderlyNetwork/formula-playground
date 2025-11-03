import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useFormulaStore } from "@/store/formulaStore";
import {
  Code2,
  Download,
  SquareFunction,
  Settings2,
  Search,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { SourceCodeDialog } from "../SourceCodeDialog";

interface FormulasPanelProps {
  sourceCodeDialogOpen: boolean;
  setSourceCodeDialogOpen: (open: boolean) => void;
}

export function FormulasPanel({
  sourceCodeDialogOpen,
  setSourceCodeDialogOpen,
}: FormulasPanelProps) {
  const { formulaDefinitions, selectedFormulaId } = useFormulaStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Open source code dialog for managing GitHub imports and jsDelivr execution
   * GitHub source is for metadata and visualization only
   * Execution code should be configured separately via jsDelivr
   */
  const handleImport = () => {
    setSourceCodeDialogOpen(true);
  };

  /**
   * Filter formulas based on search query
   * Searches in formula name and tags
   */
  const filteredFormulas = useMemo(() => {
    if (!searchQuery.trim()) {
      return formulaDefinitions;
    }
    const query = searchQuery.toLowerCase().trim();
    return formulaDefinitions.filter((formula) => {
      const nameMatch = formula.name.toLowerCase().includes(query);
      const tagsMatch = formula.tags?.some((tag) =>
        tag.toLowerCase().includes(query)
      );
      return nameMatch || tagsMatch;
    });
  }, [formulaDefinitions, searchQuery]);

  return (
    <>
      <Card
        title="Formulas"
        className="flex flex-col h-full"
        headerRight={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="配置"
                  title="配置"
                  className="p-0 h-4 w-4"
                  onClick={handleImport}
                >
                  <Settings2 strokeWidth={1.5} size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>配置</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      >
        {/* Search box */}
        <div className="px-2.5 py-2 border-b border-gray-200 shrink-0">
          <div className="relative">
            <Search
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
              strokeWidth={1.5}
              size={14}
            />
            <Input
              type="text"
              placeholder="搜索公式..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>

        {/* Formula list with scrollable area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {formulaDefinitions.length === 0 ? (
            <p className="text-xs text-gray-500 px-2.5 py-4">
              No formulas loaded
            </p>
          ) : filteredFormulas.length === 0 ? (
            <p className="text-xs text-gray-500 px-2.5 py-4">
              未找到匹配的公式
            </p>
          ) : (
            filteredFormulas.map((formula) => {
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
                  onClick={() => navigate(`/formula/${formula.id}`)}
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

        {/* Fixed footer with statistics */}
        <div className="px-2.5 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 shrink-0">
          {searchQuery.trim() ? (
            <>
              显示 {filteredFormulas.length} / {formulaDefinitions.length}{" "}
              个公式
            </>
          ) : (
            <>共 {formulaDefinitions.length} 个公式</>
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
