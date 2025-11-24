import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dataSheetStateTracker } from "../services/dataSheetStateTracker";
import type { FormulaDefinition } from "@/types/formula";

interface DataSheetDebugPanelProps {
  formula?: FormulaDefinition;
  className?: string;
}

/**
 * Debug panel for DataSheet state tracking
 * Shows cell updates, calculations, and current row states
 */
export const DataSheetDebugPanel: React.FC<DataSheetDebugPanelProps> = ({
  formula,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh every 2 seconds when open
  useEffect(() => {
    if (!isOpen || !formula) return;

    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, formula]);

  if (!formula) return null;

  const stateTable = dataSheetStateTracker.getStateTable(formula.id);
  const debugInfo = dataSheetStateTracker.getDebugInfo(formula.id);

  return (
    <div className={className}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="mb-2"
      >
        {isOpen ? "Hide" : "Show"} Debug Panel
      </Button>

      {isOpen && (
        <Card className="p-4 space-y-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Debug Info: {formula.name}
            </h3>
            <Button
              onClick={() => setRefreshKey((prev) => prev + 1)}
              variant="ghost"
              size="sm"
            >
              Refresh
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Cell Updates:</strong> {debugInfo.updateCount}
            </div>
            <div>
              <strong>Calculations:</strong> {debugInfo.calculationCount}
            </div>
            <div>
              <strong>Rows with Results:</strong> {debugInfo.rowsWithResults}
            </div>
            <div>
              <strong>Rows without Results:</strong>{" "}
              {debugInfo.rowsWithoutResults}
            </div>
            <div>
              <strong>Pending Calculations:</strong>{" "}
              {debugInfo.pendingCalculations}
            </div>
            <div>
              <strong>Last Update:</strong>{" "}
              {debugInfo.lastUpdateTime
                ? new Date(debugInfo.lastUpdateTime).toLocaleTimeString()
                : "Never"}
            </div>
            <div>
              <strong>Last Calculation:</strong>{" "}
              {debugInfo.lastCalculationTime
                ? new Date(debugInfo.lastCalculationTime).toLocaleTimeString()
                : "Never"}
            </div>
          </div>

          {/* Recent Cell Updates */}
          <div>
            <h4 className="font-semibold mb-2">Recent Cell Updates (last 5)</h4>
            <div className="space-y-1 text-xs">
              {stateTable.cellUpdates
                .slice(-5)
                .reverse()
                .map((update, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded ${
                      update.isValid ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div>
                      <strong>{update.path}</strong>: {String(update.oldValue)}{" "}
                      → {String(update.newValue)}
                    </div>
                    <div className="text-gray-600">
                      {new Date(update.timestamp).toLocaleTimeString()} | Row:{" "}
                      {update.rowId} | Valid: {update.isValid ? "Yes" : "No"}
                    </div>
                    {update.validationErrors && (
                      <div className="text-red-600">
                        Errors: {update.validationErrors.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              {stateTable.cellUpdates.length === 0 && (
                <div className="text-gray-500">No cell updates recorded</div>
              )}
            </div>
          </div>

          {/* Recent Calculations */}
          <div>
            <h4 className="font-semibold mb-2">Recent Calculations (last 5)</h4>
            <div className="space-y-1 text-xs">
              {stateTable.calculations
                .slice(-5)
                .reverse()
                .map((calc, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded ${
                      calc.success ? "bg-blue-50" : "bg-red-50"
                    }`}
                  >
                    <div>
                      <strong>Row {calc.rowId}</strong> | Success:{" "}
                      {calc.success ? "Yes" : "No"}
                    </div>
                    {calc.result !== undefined && (
                      <div>Result: {String(calc.result)}</div>
                    )}
                    {calc.error && (
                      <div className="text-red-600">Error: {calc.error}</div>
                    )}
                    {calc.executionTime !== undefined && (
                      <div className="text-gray-600">
                        Time: {calc.executionTime.toFixed(2)}ms
                      </div>
                    )}
                    <div className="text-gray-600">
                      {new Date(calc.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              {stateTable.calculations.length === 0 && (
                <div className="text-gray-500">No calculations recorded</div>
              )}
            </div>
          </div>

          {/* Current Row States */}
          <div>
            <h4 className="font-semibold mb-2">Current Row States</h4>
            <div className="space-y-1 text-xs">
              {stateTable.currentRows.map((row) => (
                <div
                  key={row.id}
                  className={`p-2 rounded ${
                    row._isValid === false
                      ? "bg-red-50"
                      : row._result !== undefined
                      ? "bg-green-50"
                      : "bg-yellow-50"
                  }`}
                >
                  <div>
                    <strong>Row {row.id}</strong> | Valid:{" "}
                    {row._isValid ? "Yes" : "No"}
                  </div>
                  {row._result !== undefined && (
                    <div>Result: {String(row._result)}</div>
                  )}
                  {row._error && (
                    <div className="text-red-600">Error: {row._error}</div>
                  )}
                  {row._executionTime !== undefined && (
                    <div className="text-gray-600">
                      Execution Time: {row._executionTime.toFixed(2)}ms
                    </div>
                  )}
                </div>
              ))}
              {stateTable.currentRows.length === 0 && (
                <div className="text-gray-500">No rows</div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
