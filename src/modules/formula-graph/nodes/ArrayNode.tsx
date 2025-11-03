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
}

/**
 * ArrayNode - Custom React Flow node for array-type formula inputs
 * Supports both manual editing via table UI and receiving data from multiple connected nodes
 */
export const ArrayNode = memo(function ArrayNode({ id, data }: ArrayNodeProps) {
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

  // Get current array value, ensuring it's always an array
  const arrayValue = useMemo(() => {
    const value = data.value;
    if (Array.isArray(value)) {
      return value;
    }
    // If value is not an array, return empty array or single-item array
    if (value !== undefined && value !== null) {
      return [value];
    }
    return [];
  }, [data.value]);

  // Determine if this is an object array based on factorType
  const isObjectArray = useMemo(() => {
    return data.factorType?.properties && data.factorType.properties.length > 0;
  }, [data.factorType]);

  const properties = data.factorType?.properties ?? [];
  const baseElementType =
    data.inputType || data.factorType?.baseType || `string`;

  /**
   * Handle adding a new element to the array
   */
  const handleAddElement = useCallback(() => {
    const currentArray = Array.isArray(data.value) ? [...data.value] : [];

    if (isObjectArray) {
      // Create a new object with default values from properties
      const newObj: Record<string, unknown> = {};
      properties.forEach((prop) => {
        newObj[prop.key] =
          prop.default ??
          (prop.type === "number" ? 0 : prop.type === "boolean" ? false : "");
      });
      currentArray.push(newObj);
    } else {
      // Add default value based on base type
      const defaultValue =
        baseElementType === "number"
          ? 0
          : baseElementType === "boolean"
          ? false
          : "";
      currentArray.push(defaultValue);
    }

    const fn = data.id.includes(".") ? updateInputAt : updateInput;
    fn(data.id, currentArray);
  }, [
    data.value,
    data.id,
    isObjectArray,
    properties,
    baseElementType,
    updateInput,
    updateInputAt,
  ]);

  /**
   * Handle removing an element from the array
   */
  const handleRemoveElement = useCallback(
    (index: number) => {
      const currentArray = Array.isArray(data.value) ? [...data.value] : [];
      currentArray.splice(index, 1);

      const fn = data.id.includes(".") ? updateInputAt : updateInput;
      fn(data.id, currentArray);
    },
    [data.value, data.id, updateInput, updateInputAt]
  );

  /**
   * Handle updating an element value (for primitive arrays)
   */
  const handleElementChange = useCallback(
    (index: number, newValue: string | number | boolean) => {
      const currentArray = Array.isArray(data.value) ? [...data.value] : [];
      currentArray[index] = newValue;

      const fn = data.id.includes(".") ? updateInputAt : updateInput;
      fn(data.id, currentArray);
    },
    [data.value, data.id, updateInput, updateInputAt]
  );

  /**
   * Handle updating a property of an object element (for object arrays)
   */
  const handleObjectPropertyChange = useCallback(
    (
      index: number,
      propertyKey: string,
      newValue: string | number | boolean
    ) => {
      const currentArray = Array.isArray(data.value) ? [...data.value] : [];
      if (!currentArray[index]) {
        currentArray[index] = {};
      }
      const obj = currentArray[index] as Record<string, unknown>;
      obj[propertyKey] = newValue;

      const fn = data.id.includes(".") ? updateInputAt : updateInput;
      if (data.id.includes(".")) {
        // Use nested path for object arrays
        fn(`${data.id}[${index}].${propertyKey}`, newValue);
      } else {
        // Update the entire array
        fn(data.id, currentArray);
      }
    },
    [data.value, data.id, updateInput, updateInputAt]
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
        hasIncomingConnections && "border-purple-600 border-dashed"
      )}
    >
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
        <div className="w-full mt-2 border rounded-md overflow-hidden">
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
                    <TableHead className="w-[60px] text-xs">Actions</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-xs">Value</TableHead>
                    <TableHead className="w-[60px] text-xs">Actions</TableHead>
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
                        const displayValue = propValue ?? prop.default ?? "";

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
                                      : 0
                                    : String(displayValue ?? "")
                                }
                                onChange={(e) => {
                                  const newValue =
                                    prop.type === "number"
                                      ? parseFloat(e.target.value) || 0
                                      : e.target.value;
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
                                : 0
                              : String(element ?? "")
                          }
                          onChange={(e) => {
                            const newValue =
                              baseElementType === "number"
                                ? parseFloat(e.target.value) || 0
                                : e.target.value;
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
