import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GridStore } from "@/store/spreadsheet";
import { useDataSourceStore } from "@/store/dataSourceStore";
import type { ColumnDef } from "@/types/spreadsheet";

interface InputCellProps {
  rowId: string;
  column: ColumnDef;
  store: GridStore;
  isSelected?: boolean;
  onCellClick?: (rowId: string, colId: string) => void;
}

// --- Helpers ---

/**
 * Traverses an object using a path array.
 * Returns the value at the path or undefined if path doesn't exist.
 */
const traverseObject = (data: unknown, path: string[]): unknown => {
  let current = data;
  for (const part of path) {
    if (
      current &&
      typeof current === "object" &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
};

/**
 * Extracts the variable context around the cursor position.
 * Returns the text between '{{' and cursor, and the index of '{{'.
 */
const getVariableContext = (text: string, cursorIndex: number) => {
  const textBeforeCursor = text.slice(0, cursorIndex);
  const lastOpenBrace = textBeforeCursor.lastIndexOf("{{");

  if (lastOpenBrace === -1) return null;

  const textBetween = textBeforeCursor.slice(lastOpenBrace + 2);
  // Ensure we are not inside a closed block (simple heuristic)
  if (textBetween.includes("}}")) return null;

  return { lastOpenBrace, textBetween };
};

const resolveValue = (
  value: string,
  dataSourceData: Record<string, unknown>
): string => {
  if (!value) return "";
  return value.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const path = key.trim().split(".");
    const result = traverseObject(dataSourceData, path);

    if (result === undefined) return match;
    if (typeof result === "object" && result !== null)
      return JSON.stringify(result);
    return String(result);
  });
};

const fuzzyMatch = (source: string, target: string): boolean => {
  const s = source.toLowerCase();
  const t = target.toLowerCase();
  let sourceIndex = 0;
  for (let i = 0; i < t.length && sourceIndex < s.length; i++) {
    if (t[i] === s[sourceIndex]) {
      sourceIndex++;
    }
  }
  return sourceIndex === s.length;
};

const getSuggestions = (
  query: string,
  dataSourceData: Record<string, unknown>
): string[] => {
  const endsWithDot = query.endsWith(".");
  const parts = query.split(".");

  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
    return Object.keys(dataSourceData);
  }

  let path: string[];
  let prefix = "";

  if (endsWithDot) {
    path = parts.filter((p) => p !== "");
    prefix = "";
  } else {
    path = parts.slice(0, -1);
    prefix = parts[parts.length - 1];
  }

  const context = traverseObject(dataSourceData, path);

  if (context && typeof context === "object" && context !== null) {
    return Object.keys(context as Record<string, unknown>).filter((key) =>
      fuzzyMatch(prefix, key)
    );
  }

  return [];
};

interface SuggestionsListProps {
  suggestions: string[];
  selectedIndex: number;
  onSelect: (suggestion: string) => void;
  position: { top: number; left: number };
  onClose: () => void;
}

const SuggestionsList: React.FC<SuggestionsListProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  position,
}) => {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (listRef.current && suggestions.length > 0) {
      const selectedElement = listRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
        });
      }
    }
  }, [selectedIndex, suggestions]);

  if (suggestions.length === 0) return null;

  return createPortal(
    <ul
      ref={listRef}
      className="fixed z-[9999] bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto rounded-md py-1 font-mono text-sm"
      style={{
        top: position.top,
        left: position.left,
        minWidth: "150px",
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent blur on input
    >
      {suggestions.map((suggestion, index) => (
        <li
          key={suggestion}
          className={`px-3 py-1 cursor-pointer flex items-center justify-between ${
            index === selectedIndex
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => onSelect(suggestion)}
        >
          <span>{suggestion}</span>
        </li>
      ))}
    </ul>,
    document.body
  );
};

const InputCell: React.FC<InputCellProps> = ({
  rowId,
  column,
  store,
  onCellClick,
}) => {
  const { dataSourceData } = useDataSourceStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [hasVariable, setHasVariable] = useState(false);

  // Update input position for dropdown
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  };

  // Sync with store updates
  useEffect(() => {
    const updateInput = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        const rawVal = store.getValue(rowId, column.id);
        const resolved = resolveValue(String(rawVal ?? ""), dataSourceData);
        inputRef.current.value = resolved;
        setHasVariable(resolved.includes("{{"));
      }
    };

    // 1. Initial set
    updateInput();

    // 2. Subscribe to changes
    const unsubscribe = store.subscribe(rowId, column.id, (newValue) => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        const resolved = resolveValue(String(newValue ?? ""), dataSourceData);
        inputRef.current.value = resolved;
        setHasVariable(resolved.includes("{{"));
      }
    });

    return () => unsubscribe();
  }, [rowId, column.id, store, dataSourceData]);

  const handleFocus = () => {
    if (onCellClick) {
      onCellClick(rowId, column.id);
    }
    // Switch to raw value on focus for editing
    if (inputRef.current) {
      const rawVal = store.getValue(rowId, column.id);
      const strVal = String(rawVal ?? "");
      inputRef.current.value = strVal;
      setHasVariable(strVal.includes("{{"));
    }
  };

  const handleBlur = () => {
    // Delay hiding to allow click to register
    // But since we use onMouseDown preventDefault on the list, we might not need this if logic is tight
    // Keeping it simple for now
    setShowSuggestions(false);

    if (inputRef.current && column.editable !== false) {
      const val = inputRef.current.value;
      store.setValue(rowId, column.id, val);
      // Switch to resolved value on blur
      const resolved = resolveValue(val, dataSourceData);
      inputRef.current.value = resolved;
      setHasVariable(resolved.includes("{{"));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHasVariable(val.includes("{{"));
    const cursor = e.target.selectionStart || 0;

    const context = getVariableContext(val, cursor);

    if (context) {
      const { textBetween } = context;
      const newSuggestions = getSuggestions(textBetween, dataSourceData);

      if (newSuggestions.length > 0) {
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
        setSelectedIndex(0);
        updateDropdownPosition();
        return;
      } else if (
        textBetween === "" &&
        Object.keys(dataSourceData).length === 0
      ) {
        setSuggestions(["No variables available"]);
        setShowSuggestions(true);
        setSelectedIndex(0);
        updateDropdownPosition();
        return;
      }
    }
    setShowSuggestions(false);
  };

  const insertSuggestion = (suggestion: string) => {
    if (!inputRef.current) return;
    if (suggestion === "No variables available") return;

    const val = inputRef.current.value;
    const cursor = inputRef.current.selectionStart || 0;

    const context = getVariableContext(val, cursor);
    if (!context) return;

    const { lastOpenBrace, textBetween } = context;

    // Check if we are replacing a partial part
    const parts = textBetween.split(".");
    let newTextBeforeCursor = "";
    let newPath = "";

    // If textBetween ends with '.', we are appending the suggestion
    if (textBetween.endsWith(".")) {
      newPath = textBetween + suggestion;
      newTextBeforeCursor = val.slice(0, lastOpenBrace + 2) + newPath;
    } else if (parts.length > 1) {
      // Replacing the last part
      const basePath = parts.slice(0, -1).join(".");
      newPath = basePath + "." + suggestion;
      newTextBeforeCursor = val.slice(0, lastOpenBrace + 2) + newPath;
    } else {
      // Replacing the root part
      newPath = suggestion;
      newTextBeforeCursor = val.slice(0, lastOpenBrace + 2) + newPath;
    }

    // Check if the new path points to an object (has children)
    const childSuggestions = getSuggestions(newPath + ".", dataSourceData);
    const hasChildren = childSuggestions.length > 0;

    let newValue = "";
    let newCursorPos = 0;

    if (hasChildren) {
      // If has children, append "." and keep showing suggestions
      newTextBeforeCursor += ".";
      newValue = newTextBeforeCursor + val.slice(cursor);
      newCursorPos = newTextBeforeCursor.length;

      inputRef.current.value = newValue;
      setHasVariable(newValue.includes("{{"));
      inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      inputRef.current.focus();

      setSuggestions(childSuggestions);
      setShowSuggestions(true);
      setSelectedIndex(0);
      updateDropdownPosition();
    } else {
      // If leaf, append "}}" and close suggestions
      const textAfterCursor = val.slice(cursor);
      const needsClosing = !textAfterCursor.trim().startsWith("}}");

      if (needsClosing) {
        newTextBeforeCursor += "}}";
      }

      newValue = newTextBeforeCursor + textAfterCursor;

      if (!needsClosing) {
        const closingIndex = textAfterCursor.indexOf("}}");
        newCursorPos = newTextBeforeCursor.length + closingIndex + 2;
      } else {
        newCursorPos = newTextBeforeCursor.length;
      }

      inputRef.current.value = newValue;
      setHasVariable(newValue.includes("{{"));
      inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      inputRef.current.focus();
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertSuggestion(suggestions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter") {
      inputRef.current?.blur();
    }
  };

  const isEditable = column.editable !== false;

  return (
    <div className="relative w-full h-full">
      <input
        ref={inputRef}
        type="text"
        className={`w-full h-full px-2 outline-none absolute inset-0 bg-transparent text-sm text-gray-700 ${
          !isEditable
            ? "cursor-not-allowed text-gray-500 font-mono text-right"
            : ""
        } ${
          showSuggestions || hasVariable
            ? "bg-green-100 text-green-700 font-mono"
            : ""
        }`}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onChange={handleInputChange}
        readOnly={!isEditable}
      />
      {showSuggestions && (
        <SuggestionsList
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={(s) => insertSuggestion(s)}
          position={dropdownPos}
          onClose={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
};

export default InputCell;
