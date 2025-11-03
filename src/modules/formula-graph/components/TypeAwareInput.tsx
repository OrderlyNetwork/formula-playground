import { memo } from "react";
import type { FactorType, FormulaScalar } from "@/types/formula";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateValueForFactorType, getInputDisplayType, getEnumOptions } from "../utils/nodeTypes";

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
 * TypeAwareInput - Input component for primitive types (string, number, boolean)
 * Arrays are handled by ArrayNode, objects are handled by ObjectNode
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

  const handleChange = (newValue: string) => {
    let parsedValue: FormulaScalar = newValue;

    // Parse based on base type
    switch (factorType.baseType) {
      case "number": {
        const parsed = parseFloat(newValue);
        parsedValue = isNaN(parsed) ? 0 : parsed;
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
      onChange(parsedValue);
    }
    // Could add error state display here if needed
  };

  const getDisplayValue = (): string => {
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
        value={getDisplayValue()}
        onValueChange={handleChange}
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

  // Handle primitive types with input
  return (
    <Input
      type={displayType}
      value={getDisplayValue()}
      onChange={(e) => handleChange(e.target.value)}
      disabled={disabled}
      className={className}
      placeholder={`Enter ${label || factorType.baseType}`}
      onMouseDown={onMouseDown}
    />
  );
});