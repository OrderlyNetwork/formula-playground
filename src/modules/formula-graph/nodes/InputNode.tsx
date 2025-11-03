import { Handle, Position } from "reactflow";
import { memo, useMemo } from "react";
import type { FormulaNodeData } from "@/types/formula";
import type { Node } from "reactflow";
import { cn } from "@/lib/utils";
// import { Input } from "../../../components/common/Input";

import { useFormulaStore } from "@/store/formulaStore";
import { useGraphStore } from "@/store/graphStore";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { useNodeDimensions } from "../hooks/useNodeDimensions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InputNodeProps {
  id: string;
  data: FormulaNodeData;
}

/**
 * InputNode - Custom React Flow node for formula inputs
 * Supports both manual input and receiving data from other nodes via connections
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

  const handleTextOrNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue: string | number = e.target.value;
    if (data.inputType === "number") {
      const parsed = parseFloat(newValue);
      newValue = isNaN(parsed) ? 0 : parsed;
    }
    const fn = data.id.includes(".") ? updateInputAt : updateInput;
    fn(data.id, newValue);
  };

  const handleBooleanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value === "true";
    const fn = data.id.includes(".") ? updateInputAt : updateInput;
    fn(data.id, newValue);
  };

  /**
   * Prevent node dragging when interacting with input elements
   * This allows users to select text and interact with inputs without dragging the node
   */
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
            ? "Click to disconnect or connect another source (will replace current connection)"
            : "Connect a data source (API/WebSocket) - only one connection allowed"
        }
      />

      <div className="flex flex-col gap-1 items-start">
        <div className="font-medium text-gray-900 flex items-center gap-1">
          <span>{data.label}</span>
          <Info size={14} />
        </div>
        <div className="mt-1 w-full">
          {data.inputType === "boolean" ? (
            <Select
              aria-label={data.label}
              value={String(Boolean(data.value))}
              onValueChange={(val) => {
                handleBooleanChange({
                  target: { value: val },
                } as React.ChangeEvent<HTMLSelectElement>);
              }}
              disabled={hasIncomingConnection}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a boolean" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">true</SelectItem>
                <SelectItem value="false">false</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            (() => {
              const valueForInput: string | number =
                data.inputType === "number"
                  ? typeof data.value === "number"
                    ? data.value
                    : 0
                  : String(data.value ?? "");
              return (
                <Input
                  aria-label={data.label}
                  type={data.inputType === "number" ? "number" : "text"}
                  value={valueForInput}
                  onChange={handleTextOrNumberChange}
                  onMouseDown={handleInputMouseDown}
                  className="px-2 nodrag select-text"
                  disabled={hasIncomingConnection}
                />
              );
            })()
          )}
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
