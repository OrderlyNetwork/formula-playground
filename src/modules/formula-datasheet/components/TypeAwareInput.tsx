import { memo, useRef, useState, useEffect, useCallback } from "react";
import type { FactorType, FormulaScalar } from "@/types/formula";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  validateValueForFactorType,
  getInputDisplayType,
  getEnumOptions,
} from "../utils/nodeTypes";
import { cn } from "@/lib/utils";
import {
  SlashCommandMenu,
  type SlashCommandItem,
  buildSlashCommandItems,
  filterSlashCommands,
} from "./SlashCommandMenu";

interface TypeAwareInputProps {
  value: FormulaScalar;
  factorType: FactorType;
  onChange: (value: FormulaScalar) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
}

/**
 * TypeAwareInput - Uncontrolled input component for primitive types (string, number, boolean)
 * Arrays are handled by ArrayNode, objects are handled by ObjectNode
 * Performance optimized: only triggers onChange on blur
 */
export const TypeAwareInput = memo(function TypeAwareInput({
  value,
  factorType,
  onChange,
  disabled = false,
  label,
  className,
  onMouseDown,
}: TypeAwareInputProps) {
  const displayType = getInputDisplayType(factorType);
  const enumOptions = getEnumOptions(factorType);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track select value internally for uncontrolled behavior
  const [selectValue, setSelectValue] = useState<string>(() => {
    if (factorType.baseType === "boolean") {
      return String(Boolean(value));
    }
    return String(value ?? "");
  });
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  // Slash command menu state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [slashSearchQuery, setSlashSearchQuery] = useState("");
  const slashStartPosRef = useRef<number>(-1);

  /**
   * Ensure selected index is within valid range when search query changes
   */
  useEffect(() => {
    if (showSlashMenu) {
      const allCommands = buildSlashCommandItems();
      const filteredCommands = filterSlashCommands(
        allCommands,
        slashSearchQuery
      );
      if (selectedCommandIndex >= filteredCommands.length) {
        setSelectedCommandIndex(Math.max(0, filteredCommands.length - 1));
      }
    }
  }, [slashSearchQuery, showSlashMenu, selectedCommandIndex]);

  // Update select value when external value changes
  useEffect(() => {
    if (displayType === "select") {
      const newValue =
        factorType.baseType === "boolean"
          ? String(Boolean(value))
          : String(value ?? "");
      setSelectValue(newValue);
    }
  }, [value, factorType.baseType, displayType]);

  const parseAndValidate = (newValue: string): FormulaScalar | null => {
    let parsedValue: FormulaScalar = newValue;

    // Parse based on base type
    switch (factorType.baseType) {
      case "number": {
        // Allow empty input for number fields
        if (newValue.trim() === "") {
          parsedValue = "";
        } else {
          const parsed = parseFloat(newValue);
          parsedValue = isNaN(parsed) ? 0 : parsed;
        }
        break;
      }
      case "boolean": {
        parsedValue = newValue === "true";
        break;
      }
      default:
        parsedValue = newValue;
    }

    // Validate the parsed value
    const validation = validateValueForFactorType(parsedValue, factorType);
    if (validation.isValid) {
      return parsedValue;
    }
    return null;
  };

  /**
   * Calculate menu position based on input element position
   */
  const calculateMenuPosition = useCallback(() => {
    if (!inputRef.current) return { top: 0, left: 0 };

    const rect = inputRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    };
  }, []);

  /**
   * Handle input change and detect slash command trigger
   */
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const inputValue = input.value;
    const cursorPos = input.selectionStart || 0;

    // Find the last `/` before cursor
    const lastSlashIndex = inputValue.lastIndexOf("/", cursorPos - 1);

    if (lastSlashIndex !== -1) {
      // Check if there's a space or newline between `/` and cursor
      const textAfterSlash = inputValue.substring(
        lastSlashIndex + 1,
        cursorPos
      );
      if (!textAfterSlash.includes(" ") && !textAfterSlash.includes("\n")) {
        // Show slash menu
        slashStartPosRef.current = lastSlashIndex;
        setSlashSearchQuery(textAfterSlash);
        setShowSlashMenu(true);
        setSelectedCommandIndex(0);
        setSlashMenuPosition(calculateMenuPosition());
        return;
      }
    }

    // Hide menu if no valid slash found
    if (showSlashMenu) {
      setShowSlashMenu(false);
      slashStartPosRef.current = -1;
    }
  };

  /**
   * Handle keyboard events for slash menu navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSlashMenu) {
      // If menu is not shown, check if user typed `/`
      if (e.key === "/" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Let the input event handle it
        return;
      }
      return;
    }

    // Handle menu navigation
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const allCommands = buildSlashCommandItems();
      const filteredCommands = filterSlashCommands(
        allCommands,
        slashSearchQuery
      );
      setSelectedCommandIndex((prev) =>
        Math.min(prev + 1, filteredCommands.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedCommandIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Select the currently selected command
      const allCommands = buildSlashCommandItems();
      const filteredCommands = filterSlashCommands(
        allCommands,
        slashSearchQuery
      );
      if (filteredCommands[selectedCommandIndex]) {
        handleCommandSelect(filteredCommands[selectedCommandIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSlashMenu(false);
      slashStartPosRef.current = -1;
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else if (e.key === "Backspace" && inputRef.current) {
      const cursorPos = inputRef.current.selectionStart || 0;
      if (cursorPos <= slashStartPosRef.current + 1) {
        // Backspace before or at slash position, close menu
        setShowSlashMenu(false);
        slashStartPosRef.current = -1;
      }
    }
  };

  /**
   * Handle command selection from slash menu
   */
  const handleCommandSelect = useCallback((command: SlashCommandItem) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const currentValue = input.value;
    const startPos = slashStartPosRef.current;

    if (startPos === -1) {
      setShowSlashMenu(false);
      return;
    }

    // Build the identifier: /api/{id} or /ws/{id}
    const identifier = `/${command.type}/${command.id}`;

    // Replace text from slash position to cursor position with identifier
    const cursorPos = input.selectionStart || currentValue.length;
    const beforeSlash = currentValue.substring(0, startPos);
    const afterCursor = currentValue.substring(cursorPos);

    const newValue = beforeSlash + identifier + afterCursor;
    input.value = newValue;

    // Set cursor position after inserted identifier
    const newCursorPos = startPos + identifier.length;
    input.setSelectionRange(newCursorPos, newCursorPos);

    // Close menu
    setShowSlashMenu(false);
    slashStartPosRef.current = -1;
    setSlashSearchQuery("");

    // Focus input
    input.focus();
  }, []);

  /**
   * Close slash menu on blur (with delay to allow menu clicks)
   */
  const handleBlur = () => {
    // Delay closing to allow menu interaction
    setTimeout(() => {
      if (showSlashMenu) {
        setShowSlashMenu(false);
        slashStartPosRef.current = -1;
      }

      // Handle normal blur logic
      if (!inputRef.current) return;

      const newValue = inputRef.current.value;
      const parsedValue = parseAndValidate(newValue);

      if (parsedValue !== null) {
        onChange(parsedValue);
      }
    }, 200);
  };

  const handleSelectChange = (newValue: string) => {
    setSelectValue(newValue);
  };

  const handleSelectOpenChange = (open: boolean) => {
    // When select closes, trigger onChange if value changed
    if (!open && isSelectOpen) {
      const parsedValue = parseAndValidate(selectValue);
      if (parsedValue !== null) {
        onChange(parsedValue);
      }
    }
    setIsSelectOpen(open);
  };

  const getDefaultValue = (): string => {
    if (factorType.baseType === "boolean") {
      return String(Boolean(value));
    }
    if (factorType.baseType === "number" && typeof value === "number") {
      return value.toString();
    }
    return String(value ?? "");
  };

  // Handle enum types with select
  if (displayType === "select") {
    return (
      <Select
        value={selectValue}
        onValueChange={handleSelectChange}
        onOpenChange={handleSelectOpenChange}
        disabled={disabled}
      >
        <SelectTrigger className={className} onMouseDown={onMouseDown}>
          <SelectValue placeholder={`Select ${label || "value"}`} />
        </SelectTrigger>
        <SelectContent>
          {enumOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        defaultValue={getDefaultValue()}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(className, "focus-visible:outline-none")}
        // placeholder={`Enter ${label || factorType.baseType}`}
        onMouseDown={onMouseDown}
      />
      {showSlashMenu && displayType === "text" && (
        <SlashCommandMenu
          position={slashMenuPosition}
          selectedIndex={selectedCommandIndex}
          searchQuery={slashSearchQuery}
          onSelect={handleCommandSelect}
          onClose={() => {
            setShowSlashMenu(false);
            slashStartPosRef.current = -1;
          }}
          onSelectionChange={setSelectedCommandIndex}
        />
      )}
    </>
  );
});