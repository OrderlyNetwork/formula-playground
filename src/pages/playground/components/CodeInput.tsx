import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { EditorProps } from "@monaco-editor/react";
import { useDeveloperStore } from "@/store/developerStore";
import { Button } from "@/components/ui/button";

/**
 * CodeInput panel
 *
 * Full-height right-side editor for developer mode. Accepts TypeScript source
 * to parse and import formulas. Designed to live inside a resizable panel,
 * hence no absolute positioning; it stretches to fill available height.
 */
export function CodeInput() {
  const {
    codeInput,
    setCodeInput,
    parseAndCreate,
    clearCode,
    parseError,
    parseSuccess,
  } = useDeveloperStore();
  const [submitting, setSubmitting] = useState(false);

  /**
   * Track whether the user has ever edited the code.
   * Placeholder is only shown when code is empty AND user has never edited.
   */
  const hasUserEditedRef = useRef(false);

  /**
   * Initialize: if codeInput already has content on mount, mark as edited
   * This handles cases where codeInput is restored from store or has initial value
   */
  useEffect(() => {
    if (codeInput && codeInput.length > 0) {
      hasUserEditedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Parse and create - parse the code and add formulas to the developer store
   */
  const handleParseAndCreate = useCallback(async () => {
    setSubmitting(true);
    await parseAndCreate();
    setSubmitting(false);
  }, [parseAndCreate]);

  /** Clear the editor content and any visible error. */
  const handleClear = useCallback(() => {
    clearCode();
  }, [clearCode]);

  /**
   * Handle editor content changes - update the global store
   */
  const handleChange = useCallback(
    (value: string | undefined) => {
      const newValue = value ?? "";
      setCodeInput(newValue);
    },
    [setCodeInput]
  );

  /**
   * Monaco editor options - optimized for code editing
   * Note: language is set as a prop on Editor, not in options
   */
  const editorOptions: EditorProps["options"] = {
    theme: "vs",
    automaticLayout: true,
    fontSize: 12,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: "on",
    tabSize: 2,
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-medium text-gray-800 text-sm">
          Enter TypeScript Formula Code
        </h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleClear}
            disabled={submitting}
            size={"sm"}
            variant={"ghost"}
          >
            Clear
          </Button>
          <Button
            onClick={handleParseAndCreate}
            disabled={submitting}
            size={"sm"}
            className="w-30"
          >
            {submitting ? "Parsing..." : "Parse"}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="relative w-full h-full min-h-[240px]">
          <Editor
            height="100%"
            language="typescript"
            value={codeInput}
            onChange={handleChange}
            options={editorOptions}
            loading={
              <div className="flex items-center justify-center h-full text-sm text-gray-500">
                Loading editor...
              </div>
            }
          />
        </div>
      </div>
      <div>
        {parseError && (
          <div className="mt-2 px-3 py-2 bg-red-50 text-xs text-red-700">
            {parseError}
          </div>
        )}
        {parseSuccess && (
          <div className="mt-2 px-3 py-2 bg-green-50  text-xs text-green-700 whitespace-pre-line">
            {parseSuccess}
          </div>
        )}
      </div>
    </div>
  );
}
