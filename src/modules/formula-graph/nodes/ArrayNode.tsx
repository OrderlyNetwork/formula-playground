import { Handle, Position } from "reactflow";
import { memo, useMemo, useCallback } from "react";
import type { FormulaNodeData } from "@/types/formula";
import type { Node } from "reactflow";
import { cn } from "@/lib/utils";
import { useGraphStore } from "@/store/graphStore";
import { Info, Plus, Trash2 } from "lucide-react";
import { useNodeDimensions } from "../hooks/useNodeDimensions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useInputUpdater } from "../hooks/useInputUpdater";
import {
  normalizeValueByFactorType,
  shouldFilterValue,
} from "../utils/valueNormalization";
import {
  getDefaultValueForFactorType,
  getDefaultValueForProperty,
} from "../utils/defaultValueGenerator";
import { ArrayCellInput } from "../components/ArrayCellInput";

interface ArrayNodeProps {
  id: string;
  data: FormulaNodeData;
  selected?: boolean;
}

/**
 * ArrayNode - Custom React Flow node for array-type formula inputs
 * Supports both manual editing via table UI and receiving data from multiple connected nodes
 */
export const ArrayNode = memo(function ArrayNode({
  id,
  data,
  selected,
}: ArrayNodeProps) {
  const { nodes: storeNodes, edges } = useGraphStore();
  // Use centralized input updater hook
  const updateInputFn = useInputUpdater(data.id);

  // Measure node dimensions for dynamic layout
  const nodeRef = useNodeDimensions(id);

  // Get all incoming connections (ArrayNode supports multiple connections)
  const incomingConnections = useMemo(() => {
    return edges.filter((edge) => edge.target === id);
  }, [edges, id]);

  const hasIncomingConnections = incomingConnections.length > 0;

  // Get source nodes info for display
  const sourceNodes = useMemo(() => {
    return incomingConnections
      .map((edge) => {
        const sourceNode = storeNodes.find((n: Node) => n.id === edge.source);
        return sourceNode ? { edge, sourceNode } : null;
      })
      .filter(
        (
          item
        ): item is {
          edge: (typeof incomingConnections)[0];
          sourceNode: Node;
        } => item !== null
      );
  }, [incomingConnections, storeNodes]);

  /**
   * Normalize array value according to factorType configuration
   * Filters out invalid items (empty strings, null values for non-nullable types)
   * and ensures proper type conversion using centralized normalization utilities
   */
  const normalizeArrayValue = useCallback(
    (value: unknown): unknown[] => {
      if (!Array.isArray(value)) {
        // For array types with factorType, be more strict about initialization
        if (data.factorType?.array === true) {
          return [];
        }
        // For legacy/untyped arrays, handle non-array values
        if (value !== undefined && value !== null && value !== "") {
          return [value];
        }
        return [];
      }

      // Filter and normalize array items based on factorType
      const normalized: unknown[] = [];
      const isObjectArray =
        data.factorType?.properties && data.factorType.properties.length > 0;
      const properties = data.factorType?.properties ?? [];

      // Use memoized baseElementType instead of recalculating
      const baseElementType =
        data.inputType || data.factorType?.baseType || "string";

      // Create a factorType for primitive arrays if needed
      const primitiveFactorType = data.factorType || {
        baseType: baseElementType as "number" | "string" | "boolean",
        nullable: false,
      };

      for (const item of value) {
        // Skip null values for non-nullable types
        if (item === null && !primitiveFactorType.nullable) {
          continue;
        }

        if (isObjectArray) {
          // For object arrays, validate and normalize each property
          if (
            typeof item !== "object" ||
            item === null ||
            Array.isArray(item)
          ) {
            // Skip invalid object items
            continue;
          }

          const normalizedObj: Record<string, unknown> = {};
          let hasValidProperties = false;

          for (const prop of properties) {
            const propValue = (item as Record<string, unknown>)[prop.key];

            // Use centralized normalization function
            const normalizedPropValue = normalizeValueByFactorType(
              propValue,
              prop.factorType
            );

            // Check if value should be filtered
            if (shouldFilterValue(normalizedPropValue, prop.factorType)) {
              continue;
            }

            normalizedObj[prop.key] = normalizedPropValue;
            if (normalizedPropValue !== null && normalizedPropValue !== "") {
              hasValidProperties = true;
            }
          }

          // Only add object if it has at least one valid property
          if (hasValidProperties || Object.keys(normalizedObj).length > 0) {
            normalized.push(normalizedObj);
          }
        } else {
          // For primitive arrays, normalize using centralized function
          const normalizedItem = normalizeValueByFactorType(
            item,
            primitiveFactorType
          );

          // Check if value should be filtered
          if (shouldFilterValue(normalizedItem, primitiveFactorType)) {
            continue;
          }

          normalized.push(normalizedItem);
        }
      }

      return normalized;
    },
    [data.factorType, data.inputType]
  );

  /**
   * Get array value for display purposes
   * Preserves all values including temporary ones (e.g., empty strings) during editing
   * Only ensures the value is an array, without filtering
   */
  const arrayValue = useMemo(() => {
    if (!Array.isArray(data.value)) {
      // For array types with factorType, be more strict about initialization
      if (data.factorType?.array === true) {
        return [];
      }
      // For legacy/untyped arrays, handle non-array values
      if (
        data.value !== undefined &&
        data.value !== null &&
        data.value !== ""
      ) {
        return [data.value];
      }
      return [];
    }
    // Return array as-is for display, filtering will happen only when needed (e.g., on blur or save)
    return data.value;
  }, [data.value, data.factorType]);

  // Determine if this is an object array based on factorType
  const isObjectArray = useMemo(() => {
    return data.factorType?.properties && data.factorType.properties.length > 0;
  }, [data.factorType]);

  // Memoize properties to prevent unnecessary re-renders
  const properties = useMemo(() => {
    return data.factorType?.properties ?? [];
  }, [data.factorType?.properties]);

  const baseElementType =
    data.inputType || data.factorType?.baseType || `string`;

  /**
   * Handle adding a new element to the array
   * Creates a new element with proper default values based on factorType
   * Uses centralized default value generation for consistency
   */
  const handleAddElement = useCallback(() => {
    const currentArray = Array.isArray(data.value) ? [...data.value] : [];

    if (isObjectArray) {
      // Create a new object with default values from properties using centralized function
      const newObj: Record<string, unknown> = {};
      properties.forEach((prop) => {
        newObj[prop.key] = getDefaultValueForProperty(prop);
      });
      currentArray.push(newObj);
    } else {
      // Add default value using centralized function
      const defaultValue = data.factorType
        ? getDefaultValueForFactorType(data.factorType)
        : baseElementType === "number"
        ? 0
        : baseElementType === "boolean"
        ? false
        : null;
      currentArray.push(defaultValue);
    }

    // Normalize the entire array before saving
    const normalizedArray = normalizeArrayValue(currentArray);
    updateInputFn(data.id, normalizedArray);
  }, [
    data.value,
    data.id,
    data.factorType,
    isObjectArray,
    properties,
    baseElementType,
    updateInputFn,
    normalizeArrayValue,
  ]);

  /**
   * Handle removing an element from the array
   * Normalizes the array after removal to ensure consistency
   */
  const handleRemoveElement = useCallback(
    (index: number) => {
      const currentArray = Array.isArray(data.value) ? [...data.value] : [];
      currentArray.splice(index, 1);

      // Normalize the array after removal
      const normalizedArray = normalizeArrayValue(currentArray);
      updateInputFn(data.id, normalizedArray);
    },
    [data.value, data.id, updateInputFn, normalizeArrayValue]
  );

  /**
   * Handle updating an element value (for primitive arrays)
   * Normalizes the value according to factorType before updating using centralized function
   * Note: Does not filter values during editing to allow temporary values (e.g., empty strings) to be displayed
   */
  const handleElementChange = useCallback(
    (index: number, newValue: unknown) => {
      const currentArray = Array.isArray(data.value) ? [...data.value] : [];

      // Ensure array has enough elements
      while (currentArray.length <= index) {
        currentArray.push(
          getDefaultValueForFactorType(
            data.factorType || {
              baseType: baseElementType as "number" | "string" | "boolean",
              nullable: false,
            }
          ) ??
            (baseElementType === "number"
              ? 0
              : baseElementType === "boolean"
              ? false
              : "")
        );
      }

      currentArray[index] = newValue;

      // Update directly without filtering to preserve user input during editing
      // Filtering will happen when the array is normalized for display
      updateInputFn(data.id, currentArray);
    },
    [data.value, data.id, data.factorType, baseElementType, updateInputFn]
  );

  /**
   * Handle updating a property of an object element (for object arrays)
   * Normalizes the property value according to its factorType before updating using centralized function
   * Note: Does not filter values during editing to allow temporary values (e.g., empty strings) to be displayed
   */
  const handleObjectPropertyChange = useCallback(
    (index: number, propertyKey: string, newValue: unknown) => {
      const currentArray = Array.isArray(data.value) ? [...data.value] : [];

      // Ensure array has enough elements
      while (currentArray.length <= index) {
        const newObj: Record<string, unknown> = {};
        properties.forEach((prop) => {
          newObj[prop.key] = getDefaultValueForProperty(prop);
        });
        currentArray.push(newObj);
      }

      if (!currentArray[index]) {
        currentArray[index] = {};
      }
      const obj = currentArray[index] as Record<string, unknown>;

      // Find the property definition to get its factorType
      const prop = properties.find((p) => p.key === propertyKey);
      if (prop) {
        // Use centralized normalization function to convert type, but don't filter yet
        const normalizedValue = normalizeValueByFactorType(
          newValue,
          prop.factorType
        );
        obj[propertyKey] = normalizedValue;
      } else {
        obj[propertyKey] = newValue;
      }

      // Update directly without filtering to preserve user input during editing
      // Filtering will happen when the array is normalized for display
      updateInputFn(data.id, currentArray);
    },
    [data.value, data.id, properties, updateInputFn]
  );

  /**
   * Prevent node dragging when interacting with input elements
   */
  const handleInputMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={nodeRef}
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[300px] max-w-[600px] relative",
        "border-purple-400",
        data.isError && "border-red-500",
        hasIncomingConnections && "border-purple-600 border-dashed",
        // Selected state: thicker border, stronger shadow, and subtle background highlight
        selected && "border-purple-600 shadow-lg ring-2 ring-purple-200"
      )}
    >
      {/* <NodeResizer
        minWidth={300}
        minHeight={60}
        isVisible={selected}
        // lineClassName="border-purple-600"
      /> */}
      {/* Input Handle - allows receiving data from multiple nodes */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500"
        style={{ top: "50%", transform: "translateY(-50%)" }}
        title="Connect multiple data sources (InputNode/ObjectNode/ArrayNode)"
      />

      <div className="flex flex-col gap-2 items-start">
        <div className="font-medium text-gray-900 flex items-center gap-1">
          <span>{data.label}</span>
          <Info size={14} />
        </div>

        {/* Display connection info if connected */}
        {hasIncomingConnections && sourceNodes.length > 0 && (
          <div className="text-xs text-purple-600 mt-1 italic flex flex-col gap-1 w-full">
            <span className="font-medium">
              Connected to {sourceNodes.length} source(s):
            </span>
            {sourceNodes.map(({ sourceNode }, idx) => (
              <span key={idx} className="text-purple-500 text-xs">
                • {sourceNode.data?.label || sourceNode.type}
              </span>
            ))}
          </div>
        )}

        {/* Table for array editing */}
        <div className="w-full mt-2">
          {/**
           * Allows horizontal scrolling when table content exceeds the node width,
           * ensuring all columns remain accessible without breaking layout constraints.
           */}
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {isObjectArray ? (
                    <>
                      {properties.map((prop) => (
                        <TableHead key={prop.key} className="text-xs">
                          {prop.key}
                        </TableHead>
                      ))}
                      <TableHead className="w-[60px] text-xs">
                        Actions
                      </TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-xs">Value</TableHead>
                      <TableHead className="w-[60px] text-xs">
                        Actions
                      </TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrayValue.map((element, index) => (
                  <TableRow key={index}>
                    {isObjectArray ? (
                      <>
                        {properties.map((prop) => {
                          const obj = element as Record<string, unknown>;
                          const propValue = obj[prop.key];
                          const displayValue =
                            propValue !== undefined
                              ? propValue
                              : prop.default ?? null;

                          return (
                            <TableCell key={prop.key} className="p-1">
                              <ArrayCellInput
                                value={displayValue}
                                factorType={prop.factorType}
                                onChange={(newValue) => {
                                  handleObjectPropertyChange(
                                    index,
                                    prop.key,
                                    newValue
                                  );
                                }}
                                disabled={hasIncomingConnections}
                                onMouseDown={handleInputMouseDown}
                              />
                            </TableCell>
                          );
                        })}
                      </>
                    ) : (
                      <TableCell className="p-1">
                        <ArrayCellInput
                          value={element}
                          factorType={
                            data.factorType || {
                              baseType: baseElementType as
                                | "number"
                                | "string"
                                | "boolean",
                              nullable: false,
                            }
                          }
                          onChange={(newValue) => {
                            handleElementChange(index, newValue);
                          }}
                          disabled={hasIncomingConnections}
                          onMouseDown={handleInputMouseDown}
                        />
                      </TableCell>
                    )}
                    <TableCell className="p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleRemoveElement(index)}
                        disabled={hasIncomingConnections}
                        title="Remove item"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {arrayValue.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isObjectArray ? properties.length + 1 : 2}
                      className="text-center text-xs text-gray-500 py-4"
                    >
                      No items. Click "Add Item" to add elements or connect
                      InputNode/ObjectNode/ArrayNode.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Add Item button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddElement}
          disabled={hasIncomingConnections}
          className="mt-1 h-7 text-xs"
        >
          <Plus size={12} className="mr-1" />
          Add Item
        </Button>

        {data.description && (
          <div className="text-xs text-gray-500 mt-1 text-left">
            {data.description}
          </div>
        )}
      </div>

      {/* Output Handle - allows connecting to other nodes */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
});
