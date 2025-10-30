import { useCallback, useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import { useAppStore } from "../../../store/appStore";
import { useFormulaStore } from "../../../store/formulaStore";
import { Button } from "@/components/ui/button";

/**
 * Multiline TypeScript sample used purely as a visual placeholder when the
 * current editor value is empty. We DO NOT inject this into the model to
 * avoid treating it as real content; instead we render an overlay.
 */
const PLACEHOLDER_TS_SAMPLE = `/**
* @formulaId custom_formula
* @name 自定义公式
* @description 示例：输入与输出的说明
* @version 1.0.0
* @param {number} a - 第一个输入 @default 1 @unit unitA
* @param {number} b - 第二个输入 @default 2 @unit unitB
* @returns {number} 结果 @unit unitR
*/
export function add(a: number, b: number): number {
  return a + b;
}
`;

/**
 * CodeInput panel
 *
 * Full-height right-side editor for developer mode. Accepts TypeScript source
 * to parse and import formulas. Designed to live inside a resizable panel,
 * hence no absolute positioning; it stretches to fill available height.
 */
export function CodeInput() {
  const { codeInput, setCodeInput } = useAppStore();
  const { importFromCode } = useFormulaStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Ref to the container DOM element for Monaco and a ref to the editor instance.
   * We keep the editor uncontrolled internally and sync to Zustand on changes.
   */
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  /**
   * Parse user-provided TypeScript and import formulas into the domain store.
   * On success, clear input; otherwise surface the error.
   */
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    const res = await importFromCode(codeInput);
    if (!res.success) {
      setError(res.error);
    } else {
      setCodeInput("");
    }
    setSubmitting(false);
  }, [importFromCode, codeInput, setCodeInput]);

  /** Clear the editor content and any visible error. */
  const handleClear = useCallback(() => {
    setCodeInput("");
    setError(null);
  }, [setCodeInput]);

  /**
   * Initialize Monaco editor once when the container mounts. Dispose on unmount.
   */
  useEffect(() => {
    if (!editorContainerRef.current) return;

    // Initialize model with either existing input or empty string.
    // Placeholder is rendered as an overlay instead of actual content.
    const initialValue = codeInput && codeInput.length > 0 ? codeInput : "";

    // Create editor with TypeScript language and sensible defaults for coding
    editorRef.current = monaco.editor.create(editorContainerRef.current, {
      value: initialValue,
      language: "typescript",
      theme: "vs",
      automaticLayout: true,
      fontSize: 12,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      tabSize: 2,
    });

    // Propagate content changes back to the global store
    const model = editorRef.current.getModel();
    const disposable = model?.onDidChangeContent(() => {
      const next = editorRef.current?.getValue() ?? "";
      setCodeInput(next);
    });

    return () => {
      disposable?.dispose?.();
      editorRef.current?.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Keep Monaco content in sync when `codeInput` is updated elsewhere (e.g. 清空/导入成功).
   * Avoid infinite loops by only setting when values differ.
   */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const current = editor.getValue();
    if (current !== codeInput) {
      editor.setValue(codeInput ?? "");
    }
  }, [codeInput]);

  return (
    // Make the editor panel more compact while keeping readability
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-medium text-gray-800 text-sm">
          输入 TypeScript 公式代码
        </h3>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={submitting}
          >
            清空
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {/*
         * Monaco container: stretches to available height.
         * Placeholder is rendered as a non-interactive overlay when empty.
         */}
        <div className="relative w-full h-full min-h-[240px]">
          <div
            ref={editorContainerRef}
            className="w-full h-full min-h-[240px]"
          />
          {(!codeInput || codeInput.length === 0) && (
            <pre className="pointer-events-none text-xs absolute inset-0 left-12 text-gray-400 whitespace-pre-wrap p-2.5">
              {PLACEHOLDER_TS_SAMPLE}
            </pre>
          )}
        </div>

        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </div>
      <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-end gap-2">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "解析中..." : "解析并创建"}
        </Button>
      </div>
    </div>
  );
}
