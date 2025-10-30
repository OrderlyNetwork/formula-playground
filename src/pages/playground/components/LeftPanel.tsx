import { Card } from "../../../components/common/Card";
import { Button } from "../../../components/common/Button";
import { useFormulaStore } from "../../../store/formulaStore";
import { formatTimestamp } from "../../../lib/utils";
import { sourceLoaderService } from "../../../modules/source-loader";
import { db } from "../../../lib/dexie";
import { FileDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function LeftPanel() {
  const {
    formulaDefinitions,
    selectedFormulaId,
    selectFormula,
    runHistory,
    replayHistoryRecord,
    clearHistory,
  } = useFormulaStore();

  // Handle importing formulas from GitHub URLs, mirroring previous toolbar behavior
  const handleImport = async () => {
    const input = window.prompt(
      "请输入 GitHub 地址列表（每行一个，支持 raw/blob/tree 链接）"
    );
    if (!input) return;
    const urls = input
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length === 0) return;
    const res = await sourceLoaderService.importFromGitHub(urls);
    if (res.success) {
      const defs = await db.formulas.toArray();
      const { loadFormulas } = useFormulaStore.getState();
      await loadFormulas(defs);
      alert(`已导入公式 ${res.count} 个`);
    } else {
      alert(`导入失败: ${res.error}`);
    }
  };

  return (
    <div className=" bg-gray-50 overflow-y-auto">
      <div className="space-y-4">
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
                    <FileDown strokeWidth={1.5} size={22} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>从github导入</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        >
          <div>
            {formulaDefinitions.length === 0 ? (
              <p className="text-sm text-gray-500">No formulas loaded</p>
            ) : (
              formulaDefinitions.map((formula) => (
                <button
                  key={formula.id}
                  onClick={() => selectFormula(formula.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedFormulaId === formula.id
                      ? "bg-blue-100 text-blue-900 font-medium"
                      : "bg-white hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <div className="font-medium">{formula.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formula.tags?.join(", ")}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* History */}
        <Card title="History">
          <div className="space-y-2">
            {runHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No execution history</p>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <Button variant="ghost" size="sm" onClick={clearHistory}>
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {runHistory.slice(0, 20).map((record) => (
                    <button
                      key={record.id}
                      onClick={() => replayHistoryRecord(record.id)}
                      className="w-full text-left px-3 py-2 rounded-md text-sm bg-white hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-900">
                          {record.engine.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {record.durationMs.toFixed(2)}ms
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
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
  );
}
