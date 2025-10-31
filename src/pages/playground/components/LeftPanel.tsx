import { useState } from "react";
import { Card } from "../../../components/common/Card";
import { Button } from "../../../components/common/Button";
import { useFormulaStore } from "../../../store/formulaStore";
import { formatTimestamp } from "../../../lib/utils";
import {
  Calculator,
  Database,
  History,
  FileDown,
  SquareFunction,
  Code2,
  Download,
  Globe,
  Radio,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SourceCodeDialog } from "./SourceCodeDialog";
import { apiDataSources, wsDataSources } from "../../../config/dataSources";

/**
 * Category types for the left panel navigation
 */
type CategoryType = "formulas" | "datasource" | "history";

/**
 * Category configuration with icons and labels
 */
const categories = [
  {
    id: "formulas" as CategoryType,
    label: "Formulas",
    icon: Calculator,
  },
  {
    id: "datasource" as CategoryType,
    label: "DataSource",
    icon: Database,
  },
  {
    id: "history" as CategoryType,
    label: "History",
    icon: History,
  },
];

export function LeftPanel() {
  const {
    formulaDefinitions,
    selectedFormulaId,
    selectFormula,
    runHistory,
    replayHistoryRecord,
    clearHistory,
  } = useFormulaStore();

  // State for active category
  const [activeCategory, setActiveCategory] =
    useState<CategoryType>("formulas");

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

  /**
   * Render content based on active category
   */
  const renderCategoryContent = () => {
    switch (activeCategory) {
      case "formulas":
        return (
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
        );

      case "datasource":
        return (
          <Card title="DataSource">
            <div className="space-y-3">
              {/* RESTful API Data Sources Section */}
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1.5 px-2.5 flex items-center gap-1.5">
                  <Globe size={14} strokeWidth={1.5} />
                  <span>RESTful API</span>
                </div>
                <div className="space-y-1">
                  {apiDataSources.map((source) => (
                    <div
                      key={source.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/reactflow",
                          JSON.stringify({
                            type: "api",
                            sourceId: source.id,
                            label: source.label,
                            description: source.description,
                            method: source.method,
                            url: source.url,
                          })
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-white border border-orange-200 hover:bg-orange-50 cursor-move transition-colors"
                    >
                      <Globe
                        size={16}
                        strokeWidth={1.5}
                        className="text-orange-600 mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {source.label}
                        </div>
                        <div className="text-[11px] text-gray-500 line-clamp-1">
                          {source.description}
                        </div>
                        <div className="text-[10px] font-mono text-orange-600 mt-0.5">
                          {source.method} {source.url}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WebSocket Data Sources Section */}
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1.5 px-2.5 flex items-center gap-1.5">
                  <Radio size={14} strokeWidth={1.5} />
                  <span>WebSocket</span>
                </div>
                <div className="space-y-1">
                  {wsDataSources.map((source) => (
                    <div
                      key={source.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/reactflow",
                          JSON.stringify({
                            type: "websocket",
                            sourceId: source.id,
                            label: source.label,
                            description: source.description,
                            url: source.url,
                            topic: source.topic,
                          })
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-white border border-teal-200 hover:bg-teal-50 cursor-move transition-colors"
                    >
                      <Radio
                        size={16}
                        strokeWidth={1.5}
                        className="text-teal-600 mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {source.label}
                        </div>
                        <div className="text-[11px] text-gray-500 line-clamp-1">
                          {source.description}
                        </div>
                        <div className="text-[10px] font-mono text-teal-600 mt-0.5 truncate">
                          {source.topic}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-gray-500 mt-2 px-2.5 pt-2 border-t border-gray-200">
                💡 Drag a data source to the canvas to create a node
              </div>
            </div>
          </Card>
        );

      case "history":
        return (
          <Card title="History">
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
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Source Code Dialog */}
      <SourceCodeDialog
        open={sourceCodeDialogOpen}
        onOpenChange={setSourceCodeDialogOpen}
      />

      {/* Two-column layout: Category icons on left, content on right */}
      <div className="flex h-full bg-white">
        {/* Left sidebar: Category icons */}
        <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;

            return (
              <TooltipProvider key={category.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveCategory(category.id)}
                      className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all ${
                        isActive
                          ? "bg-blue-100 text-blue-900"
                          : "bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                      aria-label={category.label}
                    >
                      <Icon size={24} strokeWidth={1.5} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{category.label}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Right content area */}
        <div className="flex-1 overflow-y-auto">{renderCategoryContent()}</div>
      </div>
    </>
  );
}
