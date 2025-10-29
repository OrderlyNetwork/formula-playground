import { Card } from "../../../components/common/Card";
import { ResultDisplay } from "../../../components/formula-ui/ResultDisplay";
import { ComparisonPanel } from "../../../components/formula-ui/ComparisonPanel";
import { useFormulaStore } from "../../../store/formulaStore";

export function RightPanel() {
  const { formulaDefinitions, selectedFormulaId, tsResult, rustResult } =
    useFormulaStore();

  const selectedFormula = formulaDefinitions.find(
    (f) => f.id === selectedFormulaId
  );

  if (!selectedFormula) {
    return (
      <div className="w-96 border-l border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500">Select a formula to configure</p>
      </div>
    );
  }

  return (
    <div className="w-96 border-l border-gray-200 bg-gray-50 overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* TS Result */}
        <ResultDisplay result={tsResult} title="TS Result" />

        {/* Rust Result (Phase 2) */}
        <ResultDisplay result={rustResult} title="Rust Result (Phase 2)" />

        {/* Comparison */}
        <ComparisonPanel tsResult={tsResult} rustResult={rustResult} />

        {/* Formula Details */}
        <Card title="Formula Details">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">ID:</span>
              <span className="ml-2 text-gray-600">{selectedFormula.id}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Version:</span>
              <span className="ml-2 text-gray-600">
                {selectedFormula.version}
              </span>
            </div>
            {selectedFormula.description && (
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="mt-1 text-gray-600">
                  {selectedFormula.description}
                </p>
              </div>
            )}
            {selectedFormula.tags && selectedFormula.tags.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Tags:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedFormula.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
