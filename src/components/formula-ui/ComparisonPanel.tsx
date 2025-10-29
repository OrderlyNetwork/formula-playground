import type { FormulaExecutionResult } from "../../types/executor";
import { Card } from "../common/Card";
import { calculateErrors } from "../../lib/math";

interface ComparisonPanelProps {
  tsResult: FormulaExecutionResult | null;
  rustResult: FormulaExecutionResult | null;
}

export function ComparisonPanel({
  tsResult,
  rustResult,
}: ComparisonPanelProps) {
  if (!tsResult || !rustResult || !tsResult.outputs || !rustResult.outputs) {
    return (
      <Card title="Comparison">
        <p className="text-sm text-gray-500">
          Run both TS and Rust engines to compare results (Rust coming in Phase
          2).
        </p>
      </Card>
    );
  }

  const { absDiff, relDiff } = calculateErrors(
    tsResult.outputs,
    rustResult.outputs
  );

  return (
    <Card title="Comparison">
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Absolute Difference
          </h4>
          {Object.entries(absDiff).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between items-center text-sm"
            >
              <span className="text-gray-600">{key}:</span>
              <span
                className={
                  value > 1e-10
                    ? "text-orange-600 font-medium"
                    : "text-green-600"
                }
              >
                {value.toExponential(2)}
              </span>
            </div>
          ))}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Relative Difference (%)
          </h4>
          {Object.entries(relDiff).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between items-center text-sm"
            >
              <span className="text-gray-600">{key}:</span>
              <span
                className={
                  value > 0.01
                    ? "text-orange-600 font-medium"
                    : "text-green-600"
                }
              >
                {value.toFixed(6)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
