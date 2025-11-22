/**
 * Array Cell Input Component
 *
 * Centralizes the Input rendering logic for array cells,
 * eliminating duplication between object property inputs and primitive array inputs
 */

import { memo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FactorType } from "@/types/formula";

interface ArrayCellInputProps {
  /** Current value to display */
  value: unknown;
  /** FactorType definition for type conversion and validation */
  factorType: FactorType;
  /** Callback when value changes */
  onChange: (newValue: unknown) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Mouse down handler to prevent node dragging */
  onMouseDown?: (e: React.MouseEvent) => void;
}

/**
 * ArrayCellInput - Unified input component for array cells
 * Handles number, string, and boolean types with proper normalization
 */
export const ArrayCellInput = memo(function ArrayCellInput({
  value,
  factorType,
  onChange,
  disabled = false,
  onMouseDown,
}: ArrayCellInputProps) {
  const baseType = factorType.baseType;

  // Handle boolean type with Select component
  if (baseType === "boolean") {
    return (
      <Select
        value={String(Boolean(value))}
        onValueChange={(val) => {
          onChange(val === "true");
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  // Handle number and string types with Input component
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Preserve empty values to allow users to clear the input
    // Normalization/validation will happen at the array level when needed
    if (baseType === "number") {
      if (inputValue === "") {
        // Allow empty string to be passed up - user might want to clear this cell
        onChange("");
      } else {
        const parsedValue = parseFloat(inputValue);
        const newValue = isNaN(parsedValue) ? inputValue : parsedValue;
        onChange(newValue);
      }
    } else {
      // String input - preserve as-is, let parent handle filtering
      onChange(inputValue);
    }
  };

  // Format display value
  const getDisplayValue = (): string => {
    if (baseType === "number") {
      if (value === null || value === "") {
        return "";
      }
      if (typeof value === "number") {
        return String(value);
      }
      // Try to parse as number for display
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? "0" : String(parsed);
    }

    // String type
    return value === null ? "" : String(value ?? "");
  };

  return (
    <Input
      type={baseType === "number" ? "number" : "text"}
      value={getDisplayValue()}
      onChange={handleChange}
      onMouseDown={onMouseDown}
      className="h-7 px-2 text-xs nodrag select-text"
      disabled={disabled}
    />
  );
});




