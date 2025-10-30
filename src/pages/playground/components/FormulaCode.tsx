import { useEffect, useMemo, useRef } from "react";
import { useFormulaStore } from "../../../store/formulaStore";
// import { ScrollArea } from "@/components/ui/scroll-area";
import * as monaco from "monaco-editor";

/**
 * Read-only code viewer for the selected formula using Monaco Editor.
 *
 * Why Monaco:
 * - Replaces hljs with an embeddable editor for consistent rendering and future extensibility
 * - Configured as read-only and auto-sized for this panel
 */
export function FormulaCode() {
  const { formulaDefinitions, selectedFormulaId, activeEngine } =
    useFormulaStore();

  const selectedFormula = useMemo(
    () => formulaDefinitions.find((f) => f.id === selectedFormulaId),
    [formulaDefinitions, selectedFormulaId]
  );

  const code =
    selectedFormula?.sourceCode || selectedFormula?.formulaText || "";

  // Monaco does not support Rust out-of-the-box; fallback to plaintext for Rust
  const monacoLanguage = activeEngine === "rust" ? "plaintext" : "typescript";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create editor only once for the container
    // Slightly smaller font size for a denser read-only viewer
    editorRef.current = monaco.editor.create(containerRef.current, {
      value: code,
      language: monacoLanguage,
      readOnly: true,
      automaticLayout: true,
      lineNumbers: "on",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      theme: "vs", // light theme to match existing UI
      fontSize: 11,
    });

    return () => {
      // Dispose editor on unmount to avoid leaks
      editorRef.current?.dispose();
      editorRef.current = null;
    };
    // We want to initialize once per mount; updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Update content when code changes
    if (editorRef.current && code !== editorRef.current.getValue()) {
      editorRef.current.setValue(code);
    }
  }, [code]);

  useEffect(() => {
    // Update model language when engine changes
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    monaco.editor.setModelLanguage(model, monacoLanguage);
  }, [monacoLanguage]);

  return (
    <div className="h-full w-full bg-gray-50">
      {!selectedFormula ? (
        <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
          Select a formula to view implementation
        </div>
      ) : code ? (
        <div className="mt-1.5 h-[60vh] w-full overflow-hidden bg-white">
          <div ref={containerRef} className="h-full w-full" />
        </div>
      ) : (
        <p className="text-xs text-gray-500">No source code available.</p>
      )}
    </div>
  );
}
