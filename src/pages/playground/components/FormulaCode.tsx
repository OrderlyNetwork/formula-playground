import { useFormulaStore } from "../../../store/formulaStore";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import rust from "highlight.js/lib/languages/rust";
import "highlight.js/styles/github.css";
import { ScrollArea } from "@/components/ui/scroll-area";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("rust", rust);

export function FormulaCode() {
  const { formulaDefinitions, selectedFormulaId, activeEngine } =
    useFormulaStore();
  const selectedFormula = formulaDefinitions.find(
    (f) => f.id === selectedFormulaId
  );

  if (!selectedFormula) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">
        Select a formula to view implementation
      </div>
    );
  }

  const code = selectedFormula.sourceCode || selectedFormula.formulaText;
  const language = activeEngine === "rust" ? "rust" : "typescript";
  let highlighted = "";
  if (code) {
    try {
      highlighted = hljs.highlight(code, { language }).value;
    } catch {
      highlighted = hljs.escapeHTML
        ? hljs.escapeHTML(code)
        : code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
  }

  return (
    <ScrollArea className="h-full w-full bg-gray-50">
      {code ? (
        <pre className="mt-2 max-h-[60vh] overflow-auto text-xs p-3">
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      ) : (
        <p className="text-sm text-gray-500">No source code available.</p>
      )}
    </ScrollArea>
  );
}
