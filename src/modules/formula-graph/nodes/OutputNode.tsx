import { Handle, Position } from "reactflow";
import { memo, useEffect, useMemo } from "react";
import type { FormulaNodeData } from "@/types/formula";
import { cn } from "@/lib/utils";
import { useGraphStore } from "@/store/graphStore";
import { SaveToDataSourceForm } from "./SaveToDataSourceForm";

interface OutputNodeProps {
  id: string;
  data: FormulaNodeData;
  selected?: boolean;
}

/**
 * Check if a value is a Decimal instance and convert it to a number
 * Uses duck typing to detect Decimal instances by checking for toNumber method
 * @param value - The value to check and potentially convert
 * @returns The converted number if it's a Decimal instance, otherwise the original value
 */
function convertDecimalToNumber(value: unknown): unknown {
  // Check if value is an object and has a toNumber method (duck typing for Decimal)
  if (
    value !== null &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    try {
      return (value as { toNumber: () => number }).toNumber();
    } catch (error) {
      // If toNumber fails, return original value
      console.warn("Failed to convert Decimal to number:", error);
      return value;
    }
  }
  return value;
}

/**
 * OutputNode - Custom React Flow node for formula outputs
 * Reactively listens to upstream node data changes and automatically updates
 */
export const OutputNode = memo(function OutputNode({
  id,
  data,
  selected,
}: OutputNodeProps) {
  const { edges, nodes, updateNodeData } = useGraphStore();

  // Find the upstream node connected to this OutputNode (via edge)
  const incomingEdge = useMemo(() => {
    if (!edges || !Array.isArray(edges)) return undefined;
    return edges.find((edge) => edge.target === id);
  }, [edges, id]);

  const sourceNode = useMemo(() => {
    if (!incomingEdge || !nodes || !Array.isArray(nodes)) return null;
    return nodes.find((n) => n.id === incomingEdge.source);
  }, [nodes, incomingEdge]);

  // Convert Decimal instances in data.value to numbers automatically
  useEffect(() => {
    if (data.value !== undefined) {
      const convertedValue = convertDecimalToNumber(data.value);
      // Only update if conversion actually changed the value (Decimal -> number)
      if (convertedValue !== data.value) {
        updateNodeData(id, { value: convertedValue });
      }
    }
  }, [data.value, id, updateNodeData]);

  // Reactively listen to upstream node value changes
  useEffect(() => {
    if (!sourceNode || !incomingEdge) return;

    // If the upstream node is a FormulaNode, its value changes are automatically updated via notifyUpstreamNodeChange
    // This is mainly for handling other types of upstream nodes (if any in the future)
    if (sourceNode.type === "formula") {
      // FormulaNode value changes are already handled by runnerService, no additional processing needed here
      return;
    }

    // For other types of source nodes, get the value directly from their data.value
    const sourceValue = sourceNode.data?.value;
    if (sourceValue !== undefined && data.value !== sourceValue) {
      // If there's a sourceHandle, may need to extract a specific field from the object
      let valueToUse: unknown = sourceValue;
      if (
        incomingEdge.sourceHandle &&
        typeof sourceValue === "object" &&
        sourceValue !== null
      ) {
        const key = incomingEdge.sourceHandle;
        valueToUse = (sourceValue as Record<string, unknown>)[key];
      }

      // Convert Decimal instances to numbers
      valueToUse = convertDecimalToNumber(valueToUse);

      if (data.value !== valueToUse) {
        updateNodeData(id, { value: valueToUse });
      }
    }
  }, [sourceNode, incomingEdge, data.value, id, updateNodeData]);

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm w-[220px]",
        "border-green-400",
        data.isError && "border-red-500",
        data.diff !== undefined &&
          data.diff > 1e-10 &&
          "border-orange-500 shadow-lg",
        // Selected state: thicker border, stronger shadow, and subtle background highlight
        selected && "border-green-600 shadow-lg ring-2 ring-green-200"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500"
      />
      <div className="flex flex-col gap-1">
        <div className="font-medium text-gray-900">{data.label}</div>
        {data.value !== undefined &&
          (() => {
            // Convert Decimal instances to numbers for display
            const displayValue = convertDecimalToNumber(data.value);
            return (
              <div className="text-sm text-gray-700 font-mono">
                {typeof displayValue === "number"
                  ? displayValue.toFixed(8)
                  : String(displayValue)}
                {data.unit && (
                  <span className="ml-1 text-xs text-gray-500">
                    {data.unit}
                  </span>
                )}
              </div>
            );
          })()}
        {data.diff !== undefined && data.diff > 0 && (
          <div className="text-xs text-orange-600 font-medium mt-1">
            Diff: {data.diff.toExponential(2)}
          </div>
        )}
        {data.description && (
          <div className="text-xs text-gray-500 mt-1 text-left">
            {data.description}
          </div>
        )}

        {/* Save to DataSource section */}
        {data.value !== undefined &&
          (() => {
            // Convert Decimal instances to numbers before saving
            const valueToSave = convertDecimalToNumber(data.value);
            return (
              <SaveToDataSourceForm
                value={valueToSave}
                unit={data.unit}
                description={data.description}
                nodeId={id}
              />
            );
          })()}
      </div>
    </div>
  );
});
