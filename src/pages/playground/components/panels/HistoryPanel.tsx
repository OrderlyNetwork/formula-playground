import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { useFormulaStore } from "@/store/formulaStore";
import { useDeveloperStore } from "@/store/developerStore";
import { useAppStore } from "@/store/appStore";
import { formatTimestamp } from "@/lib/utils";

export function HistoryPanel() {
  const { mode } = useAppStore();
  const normalModeData = useFormulaStore();
  const developerModeData = useDeveloperStore();

  // Use correct store based on mode
  const runHistory =
    mode === "developer"
      ? developerModeData.runHistory
      : normalModeData.runHistory;
  const replayHistoryRecord =
    mode === "developer"
      ? developerModeData.replayHistoryRecord
      : normalModeData.replayHistoryRecord;
  const clearHistory =
    mode === "developer"
      ? developerModeData.clearHistory
      : normalModeData.clearHistory;

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
}
