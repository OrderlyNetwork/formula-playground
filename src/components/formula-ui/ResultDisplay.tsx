import type { FormulaExecutionResult } from "../../types/executor";
import { Card } from "../common/Card";

interface ResultDisplayProps {
  result: FormulaExecutionResult | null;
  title: string;
}

export function ResultDisplay({ result, title }: ResultDisplayProps) {
  if (!result) {
    return (
      <Card title={title}>
        <p className="text-sm text-gray-500">
          No result yet. Click Run to execute.
        </p>
      </Card>
    );
  }

  if (!result.success) {
    return (
      <Card title={title}>
        <div className="text-sm text-red-600">
          <p className="font-semibold">Error:</p>
          <p>{result.error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title={title}>
      <div className="space-y-2">
        {result.outputs &&
          Object.entries(result.outputs).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">{key}:</span>
              <span className="text-sm font-mono text-gray-900">
                {typeof value === "number" ? value.toFixed(8) : String(value)}
              </span>
            </div>
          ))}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Duration: {result.durationMs.toFixed(2)}ms
          </p>
        </div>
      </div>
    </Card>
  );
}
