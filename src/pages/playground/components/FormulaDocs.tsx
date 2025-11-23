import { ScrollArea } from "@/components/ui/scroll-area";
import { useFormulaStore } from "@/store/formulaStore";
import { Markdown } from "@/components/common/Markdown";
import type { FormulaDefinition } from "@/types/formula";

interface FormulaDocsProps {
  formula?: FormulaDefinition;
}

export function FormulaDocs({ formula: propFormula }: FormulaDocsProps) {
  const { formulaDefinitions, selectedFormulaId } = useFormulaStore();

  // Use prop formula if provided, otherwise fall back to store selection
  const selectedFormula =
    propFormula || formulaDefinitions.find((f) => f.id === selectedFormulaId);

  if (!selectedFormula) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">
        Select a formula to view documentation
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full p-4 bg-gray-50">
      <div className="space-y-4">
        <div className="space-y-3 text-sm text-gray-700">
          {selectedFormula.formula && (
            <>
              <div className="font-medium text-gray-900 mb-1">Formula</div>
              <p className="leading-6 bg-amber-100 p-2 rounded-md font-bold font-mono">
                {selectedFormula.formula}
              </p>
            </>
          )}
          {selectedFormula.description && (
            <Markdown content={selectedFormula.description} />
          )}
          {selectedFormula.tags && selectedFormula.tags.length > 0 && (
            <div>
              <div className="font-medium text-gray-900 mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
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

        {/* <Card title="Inputs">
          <div className="space-y-2">
            {selectedFormula.inputs.length === 0 ? (
              <p className="text-sm text-gray-500">No inputs</p>
            ) : (
              selectedFormula.inputs.map((input) => (
                <div
                  key={input.key}
                  className="rounded-md border bg-white p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{input.key}</div>
                    <div className="text-xs text-gray-500">
                      {input.type}
                      {input.unit ? ` · ${input.unit}` : ""}
                    </div>
                  </div>
                  {input.description && (
                    <p className="mt-1 text-gray-700">{input.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Outputs">
          <div className="space-y-2">
            {selectedFormula.outputs.length === 0 ? (
              <p className="text-sm text-gray-500">No outputs</p>
            ) : (
              selectedFormula.outputs.map((output) => (
                <div
                  key={output.key}
                  className="rounded-md border bg-white p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">
                      {output.key}
                    </div>
                    <div className="text-xs text-gray-500">
                      {output.type}
                      {output.unit ? ` · ${output.unit}` : ""}
                    </div>
                  </div>
                  {output.description && (
                    <p className="mt-1 text-gray-700">{output.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card> */}
      </div>
    </ScrollArea>
  );
}
