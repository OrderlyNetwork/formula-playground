import { Handle, Position } from "reactflow";
import { memo, useMemo } from "react";
import type { FormulaNodeData } from "@/types/formula";
import type { Node } from "reactflow";
import { cn } from "@/lib/utils";

import { useFormulaStore } from "@/store/formulaStore";
import { useGraphStore } from "@/store/graphStore";
import { Info } from "lucide-react";
import { useNodeDimensions } from "../hooks/useNodeDimensions";
import { TypeAwareInput } from "../components/TypeAwareInput";
import { getConnectionConfigFromFactorType } from "../utils/nodeTypes";

interface InputNodeProps {
  id: string;
  data: FormulaNodeData;
}

/**
 * InputNode - Custom React Flow node for primitive formula inputs (string, number, boolean)
 * Supports both manual input and receiving data from other nodes via connections
 *
 * Note: Array inputs are handled by ArrayNode, object inputs are handled by ObjectNode
 */
export const InputNode = memo(function InputNode({ id, data }: InputNodeProps) {
  const { updateInput, updateInputAt } = useFormulaStore();
  const { nodes: storeNodes, edges } = useGraphStore();

  // Measure node dimensions for dynamic layout
  const nodeRef = useNodeDimensions(id);

  // Check if this node has any incoming connections
  const incomingConnection = useMemo(() => {
    return edges.find((edge) => edge.target === id);
  }, [edges, id]);

  const hasIncomingConnection = Boolean(incomingConnection);

  // Get source node info for better feedback
  const sourceNodeId = incomingConnection?.source;
  const sourceNode = useMemo(() => {
    return sourceNodeId
      ? storeNodes.find((n: Node) => n.id === sourceNodeId)
      : null;
  }, [sourceNodeId, storeNodes]);

  // Get dynamic connection configuration based on factor type
  const connectionConfig = useMemo(() => {
    if (data.factorType) {
      return getConnectionConfigFromFactorType(data.factorType);
    }
    // Fallback to basic configuration based on inputType
    return {
      acceptedTypes: [data.inputType || "string"],
      maxConnections: 1,
    };
  }, [data.factorType, data.inputType]);

  // Unified value change handler
  const handleValueChange = (newValue: any) => {
    const fn = data.id.includes(".") ? updateInputAt : updateInput;
    fn(data.id, newValue);
  };

  // Prevent node dragging when interacting with input
  const handleInputMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  
  return (
    <div
      ref={nodeRef}
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm w-[220px] relative",
        "border-blue-400",
        data.isError && "border-red-500",
        hasIncomingConnection && "border-blue-600 border-dashed"
      )}
    >
      {/* Input Handle - allows receiving data from other nodes */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500"
        style={{ top: "50%", transform: "translateY(-50%)" }}
        title={
          hasIncomingConnection
            ? `Connected to ${sourceNode?.data?.label || sourceNode?.type}. Click to disconnect or connect another source (will replace current connection)`
            : `Accepts: ${connectionConfig.acceptedTypes.join(", ")}. Click to connect a data source.`
        }
      />

      <div className="flex flex-col gap-1 items-start">
        <div className="font-medium text-gray-900 flex items-center gap-1">
          <span>{data.label}</span>
          <Info size={14} />
        </div>
        <div className="mt-1 w-full">
          <TypeAwareInput
            value={data.value ?? ""}
            factorType={data.factorType || {
              baseType: data.inputType || "string",
              nullable: true,
            }}
            onChange={handleValueChange}
            disabled={hasIncomingConnection}
            label={data.label}
            className="px-2 select-text w-full nodrag"
            onMouseDown={handleInputMouseDown}
          />
        </div>
        {data.description && (
          <div className="text-xs text-gray-500 mt-1 text-left">
            {data.description}
          </div>
        )}
        {hasIncomingConnection && sourceNode && (
          <div className="text-xs text-blue-600 mt-1 italic flex flex-col gap-1">
            <span className="flex items-center gap-1">
              Connected to {sourceNode.data?.label || sourceNode.type}
            </span>
            <span className="text-blue-500 text-xs">
              New connections will replace this one
            </span>
          </div>
        )}
      </div>

      {/* Output Handle - allows connecting to other nodes */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500"
      />
    </div>
  );
});
