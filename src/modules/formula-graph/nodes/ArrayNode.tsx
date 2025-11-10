import { Handle, Position } from "reactflow";
import { memo, useMemo, useCallback } from "react";
import type { FormulaNodeData } from "@/types/formula";
import type { Node } from "reactflow";
import { cn } from "@/lib/utils";
import { useFormulaStore } from "@/store/formulaStore";
import { useGraphStore } from "@/store/graphStore";
import { Input } from "@/components/ui/input";
import { Info, Plus, Trash2 } from "lucide-react";
import { useNodeDimensions } from "../hooks/useNodeDimensions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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
  const { updateInput, updateInputAt } = useFormulaStore();
  const { nodes: storeNodes, edges } = useGraphStore();

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
   * and ensures proper type conversion
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
      const baseElementType =
        data.inputType || data.factorType?.baseType || "string";

      for (const item of value) {
        // Skip empty strings and null values for non-nullable types
        if (item === "" || (item === null && !data.factorType?.nullable)) {
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

            // Normalize property value based on its type
            let normalizedPropValue: unknown;
            if (propValue === undefined || propValue === null) {
              // Use default value or type-specific default
              if (prop.default !== undefined) {
                normalizedPropValue = prop.default;
              } else {
                switch (prop.factorType.baseType) {
                  case "number":
                    normalizedPropValue = prop.factorType.nullable ? null : 0;
                    break;
                  case "boolean":
                    normalizedPropValue = false;
                    break;
                  case "string":
                    normalizedPropValue = prop.factorType.nullable ? null : "";
                    break;
                  default:
                    normalizedPropValue = prop.factorType.nullable ? null : "";
                }
              }
            } else {
              // Convert to proper type
              switch (prop.factorType.baseType) {
                case "number":
                  if (typeof propValue === "string" && propValue === "") {
                    normalizedPropValue = prop.factorType.nullable ? null : 0;
                  } else {
                    const num = Number(propValue);
                    normalizedPropValue = isNaN(num)
                      ? prop.factorType.nullable
                        ? null
                        : 0
                      : num;
                  }
                  break;
                case "boolean":
                  normalizedPropValue = Boolean(propValue);
                  break;
                case "string":
                  normalizedPropValue = String(propValue);
                  break;
                default:
                  normalizedPropValue = propValue;
              }
            }

            // Skip if property is empty string and not nullable
            if (normalizedPropValue === "" && !prop.factorType.nullable) {
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
          // For primitive arrays, normalize based on baseElementType
          let normalizedItem: unknown;

          if (item === null && !data.factorType?.nullable) {
            continue;
          }

          switch (baseElementType) {
            case "number":
              if (typeof item === "string" && item === "") {
                normalizedItem = data.factorType?.nullable ? null : 0;
              } else {
                const num = Number(item);
                normalizedItem = isNaN(num)
                  ? data.factorType?.nullable
                    ? null
                    : 0
                  : num;
              }
              break;
            case "boolean":
              normalizedItem = Boolean(item);
              break;
            case "string":
              normalizedItem = String(item);
              break;
            default:
              normalizedItem = item;
          }

          // Skip empty strings for non-nullable types
          if (normalizedItem === "" && !data.factorType?.nullable) {
            continue;
          }

          normalized.push(normalizedItem);
        }
      }

      return normalized;
    },
    [data.factorType, data.inputType]
  );

  // Get current array value, ensuring it's always an array and normalized
  const arrayValue = useMemo(() => {
    return normalizeArrayValue(data.value);
  }, [data.value, normalizeArrayValue]);

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
   */
  const handleAddElement = useCallback(() => {
    const currentArray = Array.isArray(data.value) ? [...data.value] : [];

    if (isObjectArray) {
      // Create a new object with default values from properties based on factorType
      const newObj: Record<string, unknown> = {};
      properties.forEach((prop) => {
        // Use the property's factorType to determine the default value
        const propFactorType = prop.factorType;
        let defaultValue: unknown;

        if (prop.default !== undefined) {
          defaultValue = prop.default;
        } else {
          // Generate default value based on factorType.baseType
          switch (propFactorType.baseType) {
            case "number":
              defaultValue = propFactorType.constraints?.min ?? 0;
              break;
            case "boolean":
              defaultValue = false;
              break;
            case "string":
              defaultValue = propFactorType.nullable ? null : "";
              break;
            case "object":
              // For nested objects, create empty object with its properties
              if (
                propFactorType.properties &&
                propFactorType.properties.length > 0
              ) {
                const nestedObj: Record<string, unknown> = {};
                propFactorType.properties.forEach((nestedProp) => {
                  nestedObj[nestedProp.key] =
                    nestedProp.default ??
                    (nestedProp.type === "number"
                      ? nestedProp.factorType.constraints?.min ?? 0
                      : nestedProp.type === "boolean"
                      ? false
                      : nestedProp.factorType.nullable
                      ? null
                      : "");
                });
                defaultValue = nestedObj;
              } else {
                defaultValue = {};
              }
              break;
            default:
              defaultValue = null;
          }
        }

        newObj[prop.key] = defaultValue;
      });
      currentArray.push(newObj);
    } else {
      // Add default value based on factorType
      let defaultValue: unknown;

      if (data.factorType) {
        // Use the node's factorType to determine default value
        switch (baseElementType) {
          case "number":
            defaultValue = data.factorType.constraints?.min ?? 0;
            break;
          case "boolean":
            defaultValue = false;
            break;
          case "string":
            defaultValue = data.factorType.nullable ? null : "";
            break;
          case "object":
            // For array of objects, this shouldn't happen as it would be handled by isObjectArray
            defaultValue = {};
            break;
          default:
            defaultValue = null;
        }
      } else {
        // Fallback to basic type defaults
        defaultValue =
          baseElementType === "number"
            ? 0
            : baseElementType === "boolean"
            ? false
            : null;
      }

      currentArray.push(defaultValue);
    }

    // Normalize the entire array before saving
    const normalizedArray = normalizeArrayValue(currentArray);

    const fn = data.id.includes(".") ? updateInputAt : updateInput;
    fn(data.id, normalizedArray);
  }, [
    data.value,
    data.id,
    data.factorType,
    isObjectArray,
    properties,
    baseElementType,
    updateInput,
    updateInputAt,
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

      const fn = data.id.includes(".") ? updateInputAt : updateInput;
      fn(data.id, normalizedArray);
    },
    [data.value, data.id, updateInput, updateInputAt, normalizeArrayValue]
  );

  /**
   * Handle updating an element value (for primitive arrays)
   * Normalizes the value according to factorType before updating
   */
  const handleElementChange = useCallback(
    (index: number, newValue: string | number | boolean | null) => {
      const currentArray = Array.isArray(data.value) ? [...data.value] : [];

      // Normalize the new value based on baseElementType
      const baseElementType =
        data.inputType || data.factorType?.baseType || "string";
      let normalizedValue: unknown = newValue;

      switch (baseElementType) {
        case "number":
          if (typeof newValue === "string" && newValue === "") {
            normalizedValue = data.factorType?.nullable ? null : 0;
          } else {
            const num = Number(newValue);
            normalizedValue = isNaN(num)
              ? data.factorType?.nullable
                ? null
                : 0
              : num;
          }
          break;
        case "boolean":
          normalizedValue = Boolean(newValue);
          break;
        case "string":
          normalizedValue = String(newValue);
          break;
        default:
          normalizedValue = newValue;
      }

      currentArray[index] = normalizedValue;

      // Normalize the entire array before saving
      const normalizedArray = normalizeArrayValue(currentArray);

      const fn = data.id.includes(".") ? updateInputAt : updateInput;
      fn(data.id, normalizedArray);
    },
    [
      data.value,
      data.id,
      data.factorType,
      data.inputType,
      updateInput,
      updateInputAt,
      normalizeArrayValue,
    ]
  );

  /**
   * Handle updating a property of an object element (for object arrays)
   * Normalizes the property value according to its factorType before updating
   */
  const handleObjectPropertyChange = useCallback(
    (
      index: number,
      propertyKey: string,
      newValue: string | number | boolean | null
    ) => {
      const currentArray = Array.isArray(data.value) ? [...data.value] : [];
      if (!currentArray[index]) {
        currentArray[index] = {};
      }
      const obj = currentArray[index] as Record<string, unknown>;

      // Find the property definition to get its factorType
      const prop = properties.find((p) => p.key === propertyKey);
      if (prop) {
        // Normalize the value based on property's factorType
        let normalizedValue: unknown = newValue;

        switch (prop.factorType.baseType) {
          case "number":
            if (typeof newValue === "string" && newValue === "") {
              normalizedValue = prop.factorType.nullable ? null : 0;
            } else {
              const num = Number(newValue);
              normalizedValue = isNaN(num)
                ? prop.factorType.nullable
                  ? null
                  : 0
                : num;
            }
            break;
          case "boolean":
            normalizedValue = Boolean(newValue);
            break;
          case "string":
            normalizedValue = String(newValue);
            break;
          default:
            normalizedValue = newValue;
        }

        obj[propertyKey] = normalizedValue;
      } else {
        obj[propertyKey] = newValue;
      }

      // Normalize the entire array before saving
      const normalizedArray = normalizeArrayValue(currentArray);

      const fn = data.id.includes(".") ? updateInputAt : updateInput;
      // Always update the entire array to ensure re-rendering
      fn(data.id, normalizedArray);
    },
    [
      data.value,
      data.id,
      properties,
      updateInput,
      updateInputAt,
      normalizeArrayValue,
    ]
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
                              {prop.type === "boolean" ? (
                                <Select
                                  value={String(Boolean(displayValue))}
                                  onValueChange={(val) => {
                                    handleObjectPropertyChange(
                                      index,
                                      prop.key,
                                      val === "true"
                                    );
                                  }}
                                  disabled={hasIncomingConnections}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">true</SelectItem>
                                    <SelectItem value="false">false</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type={
                                    prop.type === "number" ? "number" : "text"
                                  }
                                  value={
                                    prop.type === "number"
                                      ? typeof displayValue === "number"
                                        ? displayValue
                                        : typeof displayValue === "string" &&
                                          displayValue !== ""
                                        ? parseFloat(displayValue) || 0
                                        : displayValue === "" ||
                                          displayValue === null
                                        ? ""
                                        : 0
                                      : displayValue === null
                                      ? ""
                                      : String(displayValue ?? "")
                                  }
                                  onChange={(e) => {
                                    let newValue;
                                    if (prop.type === "number") {
                                      const parsedValue = parseFloat(
                                        e.target.value
                                      );
                                      newValue =
                                        e.target.value === ""
                                          ? prop.factorType.nullable
                                            ? null
                                            : 0
                                          : isNaN(parsedValue)
                                          ? 0
                                          : parsedValue;
                                    } else {
                                      newValue =
                                        e.target.value === ""
                                          ? prop.factorType.nullable
                                            ? null
                                            : ""
                                          : e.target.value;
                                    }
                                    handleObjectPropertyChange(
                                      index,
                                      prop.key,
                                      newValue
                                    );
                                  }}
                                  onMouseDown={handleInputMouseDown}
                                  className="h-7 px-2 text-xs nodrag select-text"
                                  disabled={hasIncomingConnections}
                                />
                              )}
                            </TableCell>
                          );
                        })}
                      </>
                    ) : (
                      <TableCell className="p-1">
                        {baseElementType === "boolean" ? (
                          <Select
                            value={String(Boolean(element))}
                            onValueChange={(val) => {
                              handleElementChange(index, val === "true");
                            }}
                            disabled={hasIncomingConnections}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">true</SelectItem>
                              <SelectItem value="false">false</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={
                              baseElementType === "number" ? "number" : "text"
                            }
                            value={
                              baseElementType === "number"
                                ? typeof element === "number"
                                  ? element
                                  : element === "" || element === null
                                  ? ""
                                  : 0
                                : element === null
                                ? ""
                                : String(element ?? "")
                            }
                            onChange={(e) => {
                              let newValue;
                              if (baseElementType === "number") {
                                const parsedValue = parseFloat(e.target.value);
                                newValue =
                                  e.target.value === ""
                                    ? data.factorType?.nullable
                                      ? null
                                      : 0
                                    : isNaN(parsedValue)
                                    ? 0
                                    : parsedValue;
                              } else {
                                newValue =
                                  e.target.value === ""
                                    ? data.factorType?.nullable
                                      ? null
                                      : ""
                                    : e.target.value;
                              }
                              handleElementChange(index, newValue);
                            }}
                            onMouseDown={handleInputMouseDown}
                            className="h-7 px-2 text-xs nodrag select-text"
                            disabled={hasIncomingConnections}
                          />
                        )}
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
