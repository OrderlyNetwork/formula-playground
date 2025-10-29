import { Card } from "../../../components/common/Card";
import { Button } from "../../../components/common/Button";
import { useFormulaStore } from "../../../store/formulaStore";
import { formatTimestamp } from "../../../lib/utils";

export function LeftPanel() {
  const {
    formulaDefinitions,
    selectedFormulaId,
    selectFormula,
    runHistory,
    replayHistoryRecord,
    clearHistory,
  } = useFormulaStore();

  return (
    <div className=" bg-gray-50 overflow-y-auto">
      <div className="space-y-4">
        {/* Formula List */}
        <Card title="Formulas">
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
