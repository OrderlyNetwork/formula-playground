import type { ColumnDef } from "@tanstack/react-table";
import type { FormulaDefinition, FormulaScalar, FactorType } from "@/types/formula";

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
}

/**
 * Table row data structure
 */
export interface TableRow {
  id: string; // Unique row identifier
  data: Record<string, FormulaScalar>; // Flattened data using dot-notation keys
  _result?: FormulaScalar; // Formula execution result for this row
  _executionTime?: number; // Execution time in milliseconds
  _error?: string; // Execution error message
  _isValid?: boolean; // Validation status
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
            input.factorType.properties.map(prop => ({
              ...prop,
              key: prop.key,
              type: prop.type,
              factorType: prop.factorType
            })),
            arrayItemPath,
            maxArrayItems
          );

          paths.push(...nestedPaths.map(path => ({
            ...path,
            path: path.path.replace(`${arrayItemPath}.`, `${inputPath}.${i}.`),
            header: path.header.replace(arrayItemPath, `${input.key} [${i}]`),
            isArray: true,
            arrayIndex: i
          })));
        }
      } else {
        // Handle single object
        const nestedPaths = flattenFormulaInputs(
          input.factorType.properties.map(prop => ({
            ...prop,
            key: prop.key,
            type: prop.type,
            factorType: prop.factorType
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
        isArray: false
      });
    }
  }

  return paths;
}

/**
 * Generate human-readable header from dot-notation path
 */
function generateHeaderFromPath(path: string): string {
  return path
    .split(/\.|\[|\]/)
    .filter(Boolean)
    .map((part, index, parts) => {
      if (/^\d+$/.test(part)) {
        // Array index - show with previous part
        const prevPart = parts[index - 1];
        return `${prevPart} [${part}]`;
      }
      // Convert camelCase to Title Case
      return part
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    })
    .filter((part, index, parts) => {
      // Filter out array index parts that were already handled
      return !/^\d+$/.test(part) && (index === 0 || !parts[index - 1]?.match(/^\d+$/));
    })
    .join(' - ');
}

/**
 * Generate TanStack table column definitions from flattened paths
 */
export function generateTableColumns(
  flattenedPaths: FlattenedPath[],
  onCellUpdate?: (rowId: string, path: string, value: FormulaScalar) => void
): ColumnDef<TableRow>[] {
  const columns: ColumnDef<TableRow>[] = [
    // Row actions column
    {
      id: "actions",
      header: "Actions",
      size: 100,
      cell: ({ row, table }) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              const meta = table.options.meta as any;
              meta?.deleteRow?.(row.id);
            }}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
          <button
            onClick={() => {
              const meta = table.options.meta as any;
              meta?.duplicateRow?.(row.id);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Duplicate
          </button>
        </div>
      ),
    },
    // Data columns
    ...flattenedPaths.map((path): ColumnDef<TableRow> => ({
      id: path.path,
      header: path.header,
      accessorKey: `data.${path.path}`,
      size: path.factorType.baseType === "number" ? 120 : 200,
      cell: ({ row, getValue, column, table }) => {
        const value = getValue() as FormulaScalar;
        const meta = table.options.meta as any;

        return meta?.renderCell?.({
          value,
          rowId: row.id,
          path: path.path,
          factorType: path.factorType,
          onUpdate: (newValue: FormulaScalar) => {
            // Update the data in the row
            const currentData = { ...row.original.data };
            setNestedValue(currentData, path.path, newValue);

            // Update table data
            meta?.updateRowData?.(row.id, currentData);

            // Call external update handler
            onCellUpdate?.(row.id, path.path, newValue);
          }
        }) || (
          <DefaultCellRenderer
            value={value}
            factorType={path.factorType}
            onUpdate={(newValue) => {
              const currentData = { ...row.original.data };
              setNestedValue(currentData, path.path, newValue);
              meta?.updateRowData?.(row.id, currentData);
              onCellUpdate?.(row.id, path.path, newValue);
            }}
          />
        );
      },
    })),
    // Result column
    {
      id: "result",
      header: "Result",
      size: 150,
      cell: ({ row }) => {
        const error = row.original._error;
        const result = row.original._result;
        const executionTime = row.original._executionTime;

        if (error) {
          return <div className="text-red-600 text-sm">Error: {error}</div>;
        }

        if (result !== undefined) {
          return (
            <div className="text-sm">
              <div className="font-mono">{String(result)}</div>
              {executionTime && (
                <div className="text-gray-500 text-xs">{executionTime}ms</div>
              )}
            </div>
          );
        }

        return <div className="text-gray-400 text-sm">-</div>;
      },
    },
  ];

  return columns;
}

/**
 * Default cell renderer using TypeAwareInput
 */
import React from "react";
import { TypeAwareInput } from "@/modules/formula-graph/components/TypeAwareInput";

interface DefaultCellRendererProps {
  value: FormulaScalar;
  factorType: FactorType;
  onUpdate: (value: FormulaScalar) => void;
}

const DefaultCellRenderer: React.FC<DefaultCellRendererProps> = ({
  value,
  factorType,
  onUpdate
}) => {
  return (
    <TypeAwareInput
      value={value}
      factorType={factorType}
      onChange={onUpdate}
      className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-blue-500"
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
  const keys = path.split('.');
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
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return '';
    }

    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      current = current[arrayKey]?.[parseInt(index)];
    } else {
      current = current[key];
    }
  }

  return current ?? '';
}

/**
 * Convert flattened data back to formula input format
 */
export function reconstructFormulaInputs(
  flattenedData: Record<string, FormulaScalar>
): Record<string, FormulaScalar> {
  const result: Record<string, FormulaScalar> = {};

  // Create a properly nested object from flattened paths
  for (const [path, value] of Object.entries(flattenedData)) {
    setNestedValue(result, path, value);
  }

  return result;
}

/**
 * Create initial table row data from formula defaults
 */
export function createInitialRow(
  formula: FormulaDefinition,
  rowIndex: number
): TableRow {
  const flattenedPaths = flattenFormulaInputs(formula.inputs);
  const data: Record<string, FormulaScalar> = {};

  // Initialize with default values
  for (const path of flattenedPaths) {
    const defaultValue = getDefaultValueForFactorType(path.factorType);
    data[path.path] = defaultValue;
  }

  return {
    id: `row-${Date.now()}-${rowIndex}`,
    data,
    _isValid: true
  };
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
  const inputs = reconstructFormulaInputs(row.data);

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
    errors
  };
}

/**
 * Import validation function from existing utils
 * This should be imported from the existing location
 */
export function validateValueForFactorType(value: FormulaScalar, factorType: FactorType): {
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

    if (factorType.constraints?.min !== undefined && numValue < factorType.constraints.min) {
      return { isValid: false, error: `Must be at least ${factorType.constraints.min}` };
    }

    if (factorType.constraints?.max !== undefined && numValue > factorType.constraints.max) {
      return { isValid: false, error: `Must be at most ${factorType.constraints.max}` };
    }
  }

  if (factorType.baseType === "boolean") {
    if (typeof value !== "boolean") {
      return { isValid: false, error: "Must be true or false" };
    }
  }

  if (factorType.baseType === "string") {
    if (factorType.constraints?.enum && !factorType.constraints.enum.includes(String(value))) {
      return { isValid: false, error: `Must be one of: ${factorType.constraints.enum.join(", ")}` };
    }

    if (factorType.constraints?.pattern && !new RegExp(factorType.constraints.pattern).test(String(value))) {
      return { isValid: false, error: "Format is invalid" };
    }
  }

  return { isValid: true };
}