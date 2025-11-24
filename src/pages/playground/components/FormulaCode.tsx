import { useMemo } from "react";
import Editor from "@monaco-editor/react";
import type { EditorProps } from "@monaco-editor/react";
import { useFormulaStore } from "../../../store/formulaStore";
import type { FormulaDefinition } from "@/types/formula";

interface FormulaCodeProps {
  formula?: FormulaDefinition;
}

/**
 * Read-only code viewer for the selected formula using Monaco Editor.
 *
 * Why Monaco:
 * - Replaces hljs with an embeddable editor for consistent rendering and future extensibility
 * - Configured as read-only and auto-sized for this panel
 * - Using @monaco-editor/react for automatic lifecycle management
 */
export function FormulaCode({ formula: propFormula }: FormulaCodeProps) {
  const { formulaDefinitions, selectedFormulaId, activeEngine } =
    useFormulaStore();

  const selectedFormula = useMemo(
    () =>
      propFormula || formulaDefinitions.find((f) => f.id === selectedFormulaId),
    [propFormula, formulaDefinitions, selectedFormulaId]
  );

  const code =
    selectedFormula?.sourceCode || selectedFormula?.formulaText || "";

  // Monaco does not support Rust out-of-the-box; fallback to plaintext for Rust
  const monacoLanguage = activeEngine === "rust" ? "plaintext" : "typescript";

  /**
   * Monaco editor options - optimized for read-only code viewing
   */
  const editorOptions: EditorProps["options"] = {
    readOnly: true,
    automaticLayout: true,
    lineNumbers: "on",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    theme: "vs", // light theme to match existing UI
    fontSize: 12,
  };

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col">
      {!selectedFormula ? (
        <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
          Select a formula to view implementation
        </div>
      ) : code ? (
        <div className="h-full w-full overflow-hidden bg-white pt-2">
          <Editor
            height="100%"
            value={code}
            language={monacoLanguage}
            options={editorOptions}
            loading={
              <div className="flex items-center justify-center h-full text-sm text-gray-500">
                加载代码...
              </div>
            }
          />
        </div>
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <p className="text-xs text-gray-500">No source code available.</p>
        </div>
      )}
    </div>
  );
}
