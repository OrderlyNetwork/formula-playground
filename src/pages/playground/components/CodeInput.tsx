import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { EditorProps } from "@monaco-editor/react";
import { useDeveloperStore } from "@/store/developerStore";
import { Button } from "@/components/ui/button";

/**
 * Multiline TypeScript sample used as the default content when the
 * current editor value is empty. This provides users with a ready-to-use
 * example of how to structure formula code with proper JSDoc annotations.
 */
const PLACEHOLDER_TS_SAMPLE = `/**
* @formulaId custom_formula
* @name Custom Formula
* @description Example: input and output description
* @version 1.0.0
* @param {number} a - First input @default 1 @unit unitA
* @param {number} b - Second input @default 2 @unit unitB
* @returns {number} Result @unit unitR
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
    if (
      codeInput &&
      codeInput.length > 0 &&
      codeInput !== PLACEHOLDER_TS_SAMPLE
    ) {
      hasUserEditedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount to check initial state

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
    // Don't reset hasUserEditedRef - user has already edited, so no placeholder
  }, [clearCode]);

  /**
   * Handle editor content changes - update the global store
   * Mark that user has edited whenever they change the content
   */
  const handleChange = useCallback(
    (value: string | undefined) => {
      const newValue = value ?? "";
      setCodeInput(newValue);

      // Mark that user has edited if they changed the value
      // This includes editing the placeholder or any other content
      if (newValue !== PLACEHOLDER_TS_SAMPLE) {
        hasUserEditedRef.current = true;
      }
    },
    [setCodeInput]
  );

  /**
   * Get the current editor value.
   * Only show placeholder if:
   * 1. codeInput is empty (or only whitespace)
   * 2. User has never edited (hasUserEditedRef.current === false)
   */
  const editorValue =
    codeInput && codeInput.trim().length > 0
      ? codeInput
      : hasUserEditedRef.current
      ? ""
      : PLACEHOLDER_TS_SAMPLE;

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
    // Make the editor panel more compact while keeping readability
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-medium text-gray-800 text-sm">
          Enter TypeScript Formula Code
        </h3>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={submitting}
          >
            Clear
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {/*
         * Monaco container: stretches to available height.
         * Default sample code is loaded directly into the editor when empty.
         * Using @monaco-editor/react for automatic lifecycle management.
         */}
        <div className="relative w-full h-full min-h-[240px]">
          <Editor
            height="100%"
            language="typescript"
            value={editorValue}
            onChange={handleChange}
            options={editorOptions}
            loading={
              <div className="flex items-center justify-center h-full text-sm text-gray-500">
                Loading editor...
              </div>
            }
          />
        </div>

        {parseError && (
          <div className="mt-2 px-3 py-2 bg-red-50 border-l-4 border-red-400 text-xs text-red-700">
            {parseError}
          </div>
        )}
        {parseSuccess && (
          <div className="mt-2 px-3 py-2 bg-green-50 border-l-4 border-green-400 text-xs text-green-700 whitespace-pre-line">
            {parseSuccess}
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-end">
        <Button onClick={handleParseAndCreate} disabled={submitting}>
          {submitting ? "Parsing..." : "Parse"}
        </Button>
      </div>
    </div>
  );
}
