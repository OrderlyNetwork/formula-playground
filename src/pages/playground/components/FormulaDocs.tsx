import { ScrollArea } from "@/components/ui/scroll-area";
import { useFormulaStore } from "@/store/formulaStore";
import ReactMarkdown from "react-markdown";

export function FormulaDocs() {
  const { formulaDefinitions, selectedFormulaId } = useFormulaStore();

  const selectedFormula = formulaDefinitions.find(
    (f) => f.id === selectedFormulaId
  );

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
            <div
              className={`leading-6
                [&_p]:mb-2 [&_p:last-child]:mb-0
                [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h1:first-child]:mt-0
                [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2:first-child]:mt-0
                [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2
                [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2
                [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2
                [&_li]:mb-1
                [&_code]:bg-gray-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0
                [&_strong]:font-semibold
                [&_em]:italic
                [&_a]:text-blue-600 [&_a]:underline
                [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2`}
            >
              <ReactMarkdown>{selectedFormula.description}</ReactMarkdown>
            </div>
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
