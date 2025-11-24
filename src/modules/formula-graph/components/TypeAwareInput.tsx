import { memo, useRef, useState, useEffect } from "react";
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

  const handleBlur = () => {
    if (!inputRef.current) return;

    const newValue = inputRef.current.value;
    const parsedValue = parseAndValidate(newValue);

    if (parsedValue !== null) {
      onChange(parsedValue);
    }
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
    <input
      ref={inputRef}
      type="text"
      defaultValue={getDefaultValue()}
      onBlur={handleBlur}
      disabled={disabled}
      className={cn(className, "focus-visible:outline-none")}
      // placeholder={`Enter ${label || factorType.baseType}`}
      onMouseDown={onMouseDown}
    />
  );
});
