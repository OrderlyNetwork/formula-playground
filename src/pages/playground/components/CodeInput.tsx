import { useCallback, useState } from "react";
import { useAppStore } from "../../../store/appStore";
import { useFormulaStore } from "../../../store/formulaStore";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-medium text-gray-800">输入 TypeScript 公式代码</h3>
        <div className="flex items-center gap-2">
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
        <textarea
          className="w-full h-full min-h-[240px] p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-none"
          placeholder={`/**
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
`}
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
        />

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </div>
      <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "解析中..." : "解析并创建"}
        </Button>
      </div>
    </div>
  );
}
