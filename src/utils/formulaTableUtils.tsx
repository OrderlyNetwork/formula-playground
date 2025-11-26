import type { ColumnDef } from "@tanstack/react-table";
import type {
  FormulaDefinition,
  FormulaScalar,
  FactorType,
} from "@/types/formula";
import type { TableRow } from "@/modules/formula-datasheet/types";

/**
 * Flattened path information for table columns
 */
export interface FlattenedPath {
  path: string; // Dot-notation path, e.g., "inputs.nonUSDCHolding.0.holding"
  header: string; // Display header, e.g., "Non-USDC Holding [0] - Holding"
  factorType: FactorType; // Type information for this path
  depth: number; // Nesting depth for column grouping
  isArray: boolean; // Whether this path is part of an array
  arrayIndex?: number; // Array index if applicable
  description?: string; // Optional description from formula input definition
}

// Note: TableRow type is now imported from @/modules/formula-datasheet/types
// to avoid duplication and maintain single source of truth
// Re-export for backwards compatibility
export type { TableRow };

/**
 * Internal fields on TableRow that should not be treated as data
 */
const INTERNAL_ROW_FIELDS = new Set([
  "id",
  "_result",
  "_executionTime",
  "_error",
  "_isValid",
]);

/**
 * Extract data fields from a TableRow (exclude internal fields)
 */
export function extractRowData(row: TableRow): Record<string, FormulaScalar> {
  const data: Record<string, FormulaScalar> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!INTERNAL_ROW_FIELDS.has(key) && value !== undefined) {
      data[key] = value as FormulaScalar;
    }
  }
  return data;
}

/**
 * Test case data structure
 */
export interface TestCase {
  id: string;
  name: string;
  description?: string;
  inputs: Record<string, FormulaScalar>;
  outputs?: Record<string, FormulaScalar>;
  timestamp: number;
}

/**
 * Recursively flatten formula input structure into dot-notation paths
 */
export function flattenFormulaInputs(
  inputs: FormulaDefinition["inputs"],
  parentPath = "",
  maxArrayItems = 5 // Limit array items to prevent excessive columns
): FlattenedPath[] {
  const paths: FlattenedPath[] = [];

  for (const input of inputs) {
    const inputPath = parentPath ? `${parentPath}.${input.key}` : input.key;

    if (input.type === "object" && input.factorType.properties) {
      // Handle object type
      if (input.factorType.array) {
        // Handle array of objects
        for (let i = 0; i < Math.min(maxArrayItems, 3); i++) {
          // Generate a few default array items
          const arrayItemPath = `${inputPath}[${i}]`;
          const nestedPaths = flattenFormulaInputs(
            input.factorType.properties.map((prop) => ({
              ...prop,
              key: prop.key,
              type: prop.type,
              factorType: prop.factorType,
            })),
            arrayItemPath,
            maxArrayItems
          );

          paths.push(
            ...nestedPaths.map((path) => ({
              ...path,
              path: path.path.replace(
                `${arrayItemPath}.`,
                `${inputPath}.${i}.`
              ),
              header: path.header.replace(arrayItemPath, `${input.key} [${i}]`),
              isArray: true,
              arrayIndex: i,
            }))
          );
        }
      } else {
        // Handle single object
        const nestedPaths = flattenFormulaInputs(
          input.factorType.properties.map((prop) => ({
            ...prop,
            key: prop.key,
            type: prop.type,
            factorType: prop.factorType,
          })),
          inputPath,
          maxArrayItems
        );
        paths.push(...nestedPaths);
      }
    } else {
      // Handle primitive types
      paths.push({
        path: inputPath,
        header: generateHeaderFromPath(inputPath),
        factorType: input.factorType,
        depth: parentPath.split(".").length - 1,
        isArray: false,
        description: input.description,
      });
    }
  }

  return paths;
}

/**
 * Generate human-readable header from dot-notation path
 */
function generateHeaderFromPath(path: string): string {
  // Split path and get the last non-array part
  const parts = path.split(/\.|\[|\]/).filter(Boolean);

  // Find the last non-numeric part
  let lastPart = "";
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (!/^\d+$/.test(part)) {
      lastPart = part;
      break;
    }
  }

  if (!lastPart) return path;

  // Convert camelCase and snake_case to Title Case
  // Handle both camelCase (like "userName") and abbreviations (like "IMR_factor")
  return lastPart
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert space before capital letters that follow lowercase
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Insert space between abbreviation and following word (e.g., "IMRFactor" -> "IMR Factor")
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
}

/**
 * Generate TanStack table column definitions from flattened paths
 */
export function generateTableColumns(
  flattenedPaths: FlattenedPath[],
  onCellUpdate?: (rowId: string, path: string, value: FormulaScalar) => void
): ColumnDef<TableRow>[] {
  const columns: ColumnDef<TableRow>[] = [
    {
      id: "index",
      header: "#",
      size: 48,
      enablePinning: true,
      cell: ({ row }) => (
        <div className="text-xs text-gray-500 text-right pr-2 w-full">
          {row.index + 1}
        </div>
      ),
    },
    // Data columns
    ...flattenedPaths.map(
      (path): ColumnDef<TableRow> => ({
        id: path.path,
        header: () => {
          return (
            <div className="flex items-center gap-1">
              <span>{path.header}</span>
              {path.description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      <Info className="w-3 h-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs break-words">
                    {path.description}
                    <TooltipArrow />
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
        // Use accessorFn instead of accessorKey to safely access deeply nested values
        accessorFn: (row) => getNestedValue(extractRowData(row), path.path),
        size: path.factorType.baseType === "number" ? 120 : 200,
        cell: ({ row, getValue, table }) => {
          const value = getValue() as FormulaScalar;
          const meta = table.options.meta as any;
          // Use row.original.id for actual data ID, not row.id (table index)
          const actualRowId = row.original.id;

          return (
            meta?.renderCell?.({
              value,
              rowId: actualRowId,
              path: path.path,
              factorType: path.factorType,
              onUpdate: (newValue: FormulaScalar) => {
                // Update the data in the row (extract current data, modify, update)
                const currentData = { ...extractRowData(row.original) };

                setNestedValue(currentData, path.path, newValue);

                // Update table data
                meta?.updateRowData?.(actualRowId, currentData);

                // Call external update handler
                onCellUpdate?.(actualRowId, path.path, newValue);
              },
            }) || (
              <DefaultCellRenderer
                value={value}
                factorType={path.factorType}
                onUpdate={(newValue) => {
                  const currentData = { ...extractRowData(row.original) };
                  setNestedValue(currentData, path.path, newValue);
                  meta?.updateRowData?.(actualRowId, currentData);
                  onCellUpdate?.(actualRowId, path.path, newValue);
                }}
              />
            )
          );
        },
      })
    ),
    // Result column
    {
      id: "result",
      header: "Result",
      size: 150,
      enablePinning: true,
      cell: ({ row }) => {
        const error = row.original._error;
        const result = row.original._result;

        if (error) {
          return (
            <div
              className="text-red-600 text-sm whitespace-nowrap px-2 overflow-hidden overflow-ellipsis"
              style={{ textOverflow: "ellipsis" }}
            >
              Error: {error}
            </div>
          );
        }

        if (result !== undefined) {
          return <div className="text-sm px-2 font-mono">{String(result)}</div>;
        }

        return <div className="text-gray-400 text-sm px-2">-</div>;
      },
    },
  ];

  return columns;
}

/**
 * Default cell renderer using TypeAwareInput
 */
import React from "react";
import { TypeAwareInput } from "@/modules/formula-datasheet/components/TypeAwareInput";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface DefaultCellRendererProps {
  value: FormulaScalar;
  factorType: FactorType;
  onUpdate: (value: FormulaScalar) => void;
}

const DefaultCellRenderer: React.FC<DefaultCellRendererProps> = ({
  value,
  factorType,
  onUpdate,
}) => {
  return (
    <TypeAwareInput
      value={value}
      factorType={factorType}
      onChange={onUpdate}
      className="w-full px-2 py-1 text-sm border-0 rounded-none"
    />
  );
};

/**
 * Set nested value using dot-notation path
 */
export function setNestedValue(
  obj: Record<string, any>,
  path: string,
  value: FormulaScalar
): void {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // Handle array indices
    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      if (!current[arrayKey]) {
        current[arrayKey] = [];
      }
      if (!current[arrayKey][parseInt(index)]) {
        current[arrayKey][parseInt(index)] = {};
      }
      current = current[arrayKey][parseInt(index)];
    } else {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
  }

  const lastKey = keys[keys.length - 1];
  const arrayMatch = lastKey.match(/^(.+)\[(\d+)\]$/);

  if (arrayMatch) {
    const [, arrayKey, index] = arrayMatch;
    if (!current[arrayKey]) {
      current[arrayKey] = [];
    }
    current[arrayKey][parseInt(index)] = value;
  } else {
    current[lastKey] = value;
  }
}

/**
 * Get nested value using dot-notation path
 */
export function getNestedValue(
  obj: Record<string, any>,
  path: string
): FormulaScalar {
  const keys = path.split(".");
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return "";
    }

    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      current = current[arrayKey]?.[parseInt(index)];
    } else {
      current = current[key];
    }
  }

  return current ?? "";
}

/**
 * Convert flattened data back to formula input format
 * Uses formula definition to ensure correct structure and handle missing fields
 *
 * Strategy:
 * 1. First, use setNestedValue to build structure from flattened paths (handles arrays correctly)
 * 2. Then, if formula is provided, ensure all required fields from formula definition are present
 */
export function reconstructFormulaInputs(
  flattenedData: Record<string, FormulaScalar>,
  formula?: FormulaDefinition
): Record<string, FormulaScalar> {
  const result: Record<string, FormulaScalar> = {};

  // Create a map of path to expected type for proper type conversion
  const pathTypeMap = new Map<string, FactorType>();
  if (formula) {
    const flattenedPaths = flattenFormulaInputs(formula.inputs);
    flattenedPaths.forEach((fp) => {
      pathTypeMap.set(fp.path, fp.factorType);
    });
  }

  // Step 1: Build structure from flattened paths (handles arrays and nested objects)
  for (const [path, value] of Object.entries(flattenedData)) {
    // Skip undefined and null
    if (value === undefined || value === null) {
      continue;
    }

    // Convert value to the correct type if formula type info is available
    let convertedValue: FormulaScalar | undefined = value;
    const factorType = pathTypeMap.get(path);

    // Convert empty strings to undefined for string types
    if (factorType?.baseType === "string" && value === "") {
      convertedValue = undefined;
    }
    // Convert string numbers to actual numbers for number types
    else if (factorType?.baseType === "number" && typeof value === "string") {
      if (value === "") {
        convertedValue = undefined;
      } else {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          convertedValue = numValue;
        }
      }
    }
    // Convert string booleans to actual booleans for boolean types
    else if (factorType?.baseType === "boolean" && typeof value === "string") {
      if (value === "") {
        convertedValue = undefined;
      } else {
        convertedValue = value === "true" || value === "1";
      }
    }

    // Only set values that are not undefined
    if (convertedValue !== undefined) {
      setNestedValue(result, path, convertedValue);
    }
  }

  // Step 2: If formula is provided, ensure object/array structure exists (but don't set defaults)
  if (formula) {
    for (const input of formula.inputs) {
      // Only create empty object/array structures if they don't exist
      if (!(input.key in result)) {
        if (input.type === "object" && input.factorType.properties) {
          // For required object fields, always create empty object structure
          // For nullable object fields, only create if there are nested values
          const hasNestedValues = Object.keys(flattenedData).some((key) =>
            key.startsWith(`${input.key}.`)
          );
          if (!input.factorType.nullable || hasNestedValues) {
            result[input.key] = {};
          }
        } else if (input.factorType?.array) {
          // Only create empty array if there are array values in flattenedData
          const hasArrayValues = Object.keys(flattenedData).some((key) =>
            key.startsWith(`${input.key}.`)
          );
          if (hasArrayValues) {
            result[input.key] = [];
          }
        }
        // Don't set any default values for primitive types - leave as undefined
      }
    }
  }

  return result;
}

/**
 * Create initial table row data from formula defaults
 * Data fields are stored directly on the row object
 */
export function createInitialRow(
  formula: FormulaDefinition,
  rowIndex: number
): TableRow {
  const flattenedPaths = flattenFormulaInputs(formula.inputs);

  // Start with base row structure
  const row: TableRow = {
    id: `row-${Date.now()}-${rowIndex}`,
    _isValid: true,
  };

  // Add data fields directly to the row
  for (const path of flattenedPaths) {
    const defaultValue = getDefaultValueForFactorType(path.factorType);
    row[path.path] = defaultValue;
  }

  return row;
}

/**
 * Get default value for a FactorType
 */
function getDefaultValueForFactorType(factorType: FactorType): FormulaScalar {
  switch (factorType.baseType) {
    case "number":
      return factorType.constraints?.min && factorType.constraints.min > 0
        ? factorType.constraints.min
        : 0;
    case "boolean":
      return false;
    case "string":
      return "";
    case "object":
      if (factorType.array) {
        return [];
      }
      return {};
    default:
      return "";
  }
}

/**
 * Validate table row data
 */
export function validateRow(
  row: TableRow,
  formula: FormulaDefinition
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const inputs = reconstructFormulaInputs(extractRowData(row), formula);

  // Validate against formula input structure
  for (const input of formula.inputs) {
    const value = getNestedValue(inputs, input.key);
    const validation = validateValueForFactorType(value, input.factorType);

    if (!validation.isValid) {
      errors.push(`${input.key}: ${validation.error}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Import validation function from existing utils
 * This should be imported from the existing location
 */
export function validateValueForFactorType(
  value: FormulaScalar,
  factorType: FactorType
): {
  isValid: boolean;
  error?: string;
} {
  // Basic validation logic
  if (factorType.baseType === "number") {
    if (value === "") return { isValid: true }; // Allow empty strings for number inputs
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return { isValid: false, error: "Must be a valid number" };
    }

    if (
      factorType.constraints?.min !== undefined &&
      numValue < factorType.constraints.min
    ) {
      return {
        isValid: false,
        error: `Must be at least ${factorType.constraints.min}`,
      };
    }

    if (
      factorType.constraints?.max !== undefined &&
      numValue > factorType.constraints.max
    ) {
      return {
        isValid: false,
        error: `Must be at most ${factorType.constraints.max}`,
      };
    }
  }

  if (factorType.baseType === "boolean") {
    if (typeof value !== "boolean") {
      return { isValid: false, error: "Must be true or false" };
    }
  }

  if (factorType.baseType === "string") {
    if (
      factorType.constraints?.enum &&
      !factorType.constraints.enum.includes(String(value))
    ) {
      return {
        isValid: false,
        error: `Must be one of: ${factorType.constraints.enum.join(", ")}`,
      };
    }

    if (
      factorType.constraints?.pattern &&
      !new RegExp(factorType.constraints.pattern).test(String(value))
    ) {
      return { isValid: false, error: "Format is invalid" };
    }
  }

  return { isValid: true };
}
